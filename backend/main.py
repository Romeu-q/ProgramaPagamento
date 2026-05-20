import os
import random
import smtplib
import uuid
from email.mime.text import MIMEText

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

import database
import models
import schemas

# Cria tabelas base
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Minimercado Autonomo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEST_STOCK_ITEMS = [
    {"name": "Agua Mineral 500ml", "ean": "7891000100101", "selling_price": 3.5, "cost_price": 1.8, "quantity": 30, "min_stock": 5, "is_age_restricted": False},
    {"name": "Refrigerante Lata 350ml", "ean": "7891000100200", "selling_price": 6.0, "cost_price": 3.1, "quantity": 25, "min_stock": 5, "is_age_restricted": False},
    {"name": "Salgadinho 90g", "ean": "7891000100309", "selling_price": 7.5, "cost_price": 4.0, "quantity": 20, "min_stock": 4, "is_age_restricted": False},
    {"name": "Chocolate Barra 90g", "ean": "7891000100408", "selling_price": 5.5, "cost_price": 2.9, "quantity": 15, "min_stock": 3, "is_age_restricted": False},
    {"name": "Cerveja Lata 350ml", "ean": "7891000100507", "selling_price": 8.0, "cost_price": 4.2, "quantity": 18, "min_stock": 5, "is_age_restricted": True},
]


def ensure_user_columns():
    # migração simples para SQLite local sem Alembic
    with database.engine.connect() as conn:
        table_info = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        cols = {row[1] for row in table_info}
        if "email" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN email TEXT"))
        if "is_email_verified" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0"))
        if "email_verification_code" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_code TEXT"))
        if "marketing_opt_in" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN marketing_opt_in BOOLEAN DEFAULT 0"))
        conn.commit()


def generate_verification_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_email(to_email: str, subject: str, body: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "no-reply@mercadosmart.local")

    if not smtp_host:
        # fallback local para não travar fluxo em dev
        print(f"[EMAIL-MOCK] To: {to_email} | Subject: {subject} | Body: {body}")
        return

    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = to_email

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.starttls()
        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, [to_email], message.as_string())


ensure_user_columns()


def seed_test_stock(db: Session):
    created = 0
    for item in TEST_STOCK_ITEMS:
        existing = db.query(models.Product).filter(models.Product.ean == item["ean"]).first()
        if existing:
            continue
        db.add(models.Product(**item))
        created += 1
    db.commit()
    return created


@app.get("/products/ean/{ean}", response_model=schemas.Product)
def get_product_by_ean(ean: str, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.ean == ean).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return product


@app.post("/dev/seed-test-stock")
def seed_test_stock_endpoint(db: Session = Depends(database.get_db)):
    created = seed_test_stock(db)
    return {"status": "ok", "created": created, "total_catalog": len(TEST_STOCK_ITEMS), "message": "Estoque de teste aplicado sem duplicar produtos existentes."}


@app.post("/auth/register")
def register(request: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing_cpf = db.query(models.User).filter(models.User.cpf == request.cpf).first()
    if existing_cpf:
        raise HTTPException(status_code=400, detail="CPF ja cadastrado.")
    existing_email = db.query(models.User).filter(models.User.email == request.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email ja cadastrado.")

    is_adult = not request.cpf.startswith("000")
    verification_code = generate_verification_code()
    new_user = models.User(
        cpf=request.cpf,
        email=request.email,
        password=request.password,
        is_adult=is_adult,
        is_email_verified=False,
        email_verification_code=verification_code,
        marketing_opt_in=request.marketing_opt_in,
    )
    db.add(new_user)
    db.commit()

    send_email(
        to_email=request.email,
        subject="Confirme seu cadastro no MercadoSmart",
        body=f"Seu codigo de verificacao: {verification_code}",
    )
    return {"status": "pending_verification", "message": "Cadastro criado. Verifique seu email para ativar a conta."}


@app.post("/auth/verify-email")
def verify_email(request: schemas.EmailVerificationRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.cpf == request.cpf).first()
    if not user:
        raise HTTPException(status_code=404, detail="CPF nao encontrado.")
    if user.is_email_verified:
        return {"status": "ok", "message": "Email ja confirmado."}
    if user.email_verification_code != request.verification_code:
        raise HTTPException(status_code=400, detail="Codigo de verificacao invalido.")

    user.is_email_verified = True
    user.email_verification_code = None
    db.commit()
    return {"status": "ok", "message": "Email confirmado com sucesso."}


@app.post("/auth/resend-verification")
def resend_verification(cpf: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.cpf == cpf).first()
    if not user:
        raise HTTPException(status_code=404, detail="CPF nao encontrado.")
    code = generate_verification_code()
    user.email_verification_code = code
    db.commit()
    send_email(user.email, "Novo codigo de verificacao MercadoSmart", f"Seu novo codigo: {code}")
    return {"status": "ok", "message": "Codigo reenviado para o email cadastrado."}


@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(request: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.cpf == request.cpf, models.User.password == request.password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais invalidas.")
    if not user.is_email_verified:
        raise HTTPException(status_code=403, detail="Confirme seu email antes de entrar.")
    return {"access_token": f"TOKEN_BLE_{user.cpf}", "is_adult": user.is_adult}


@app.post("/auth/reset-password")
def reset_password(request: schemas.PasswordResetRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.cpf == request.cpf).first()
    if not user:
        raise HTTPException(status_code=404, detail="CPF nao encontrado.")
    if not request.new_password or len(request.new_password) < 4:
        raise HTTPException(status_code=400, detail="Nova senha invalida.")
    user.password = request.new_password
    db.commit()
    return {"status": "ok", "message": "Senha atualizada com sucesso."}


@app.post("/marketing/send")
def send_marketing_email(
    request: schemas.MarketingMessageRequest,
    db: Session = Depends(database.get_db),
    x_admin_key: str | None = Header(default=None),
):
    expected_key = os.getenv("ADMIN_MARKETING_KEY", "dev-admin-key")
    if x_admin_key != expected_key:
        raise HTTPException(status_code=401, detail="Chave administrativa invalida.")

    users = db.query(models.User).filter(models.User.marketing_opt_in == True, models.User.is_email_verified == True).all()
    sent = 0
    for user in users:
        if user.email:
            send_email(user.email, request.subject, request.body)
            sent += 1
    return {"status": "ok", "sent": sent}


@app.post("/unlock-fridge")
def unlock_fridge():
    payload_to_esp32 = {"command": "UNLOCK", "device_id": "fridge_01", "duration_seconds": 10}
    return {"status": "success", "message": "Sinal de destravamento enviado", "payload": payload_to_esp32}


@app.post("/payment/pix/generate", response_model=schemas.PaymentProcessResponse)
def generate_pix_qr(request: schemas.PixPaymentRequest, db: Session = Depends(database.get_db)):
    if not request.items:
        raise HTTPException(status_code=400, detail="Carrinho vazio.")

    deducted_items = []
    for item in request.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantidade invalida no carrinho.")
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item.product_id} nao encontrado.")
        if product.quantity < item.quantity:
            raise HTTPException(status_code=409, detail=f"Estoque insuficiente para {product.name}. Disponivel: {product.quantity}")

        product.quantity -= item.quantity
        deducted_items.append({"product_id": product.id, "ean": product.ean, "quantity": item.quantity, "remaining_quantity": product.quantity})

    db.commit()
    payment_id = str(uuid.uuid4())
    mock_payload = f"00020101021226...MOCK_PAYLOAD...{request.total_amount}"
    return {
        "payment_id": payment_id,
        "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "pix_copia_e_cola": mock_payload,
        "amount": request.total_amount,
        "deducted_items": deducted_items,
    }
