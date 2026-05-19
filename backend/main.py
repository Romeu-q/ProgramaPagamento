import uuid

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import database
import models
import schemas

# Cria as tabelas no banco de dados (SQLite)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Minimercado Autonomo API")

# Configuracao de CORS para permitir requisicoes do frontend/mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajustar em producao
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEST_STOCK_ITEMS = [
    {
        "name": "Agua Mineral 500ml",
        "ean": "7891000100101",
        "selling_price": 3.5,
        "cost_price": 1.8,
        "quantity": 30,
        "min_stock": 5,
        "is_age_restricted": False,
    },
    {
        "name": "Refrigerante Lata 350ml",
        "ean": "7891000100200",
        "selling_price": 6.0,
        "cost_price": 3.1,
        "quantity": 25,
        "min_stock": 5,
        "is_age_restricted": False,
    },
    {
        "name": "Salgadinho 90g",
        "ean": "7891000100309",
        "selling_price": 7.5,
        "cost_price": 4.0,
        "quantity": 20,
        "min_stock": 4,
        "is_age_restricted": False,
    },
    {
        "name": "Chocolate Barra 90g",
        "ean": "7891000100408",
        "selling_price": 5.5,
        "cost_price": 2.9,
        "quantity": 15,
        "min_stock": 3,
        "is_age_restricted": False,
    },
    {
        "name": "Cerveja Lata 350ml",
        "ean": "7891000100507",
        "selling_price": 8.0,
        "cost_price": 4.2,
        "quantity": 18,
        "min_stock": 5,
        "is_age_restricted": True,
    },
]


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


# --- Endpoints de Produtos (Estoque) ---
@app.get("/products/ean/{ean}", response_model=schemas.Product)
def get_product_by_ean(ean: str, db: Session = Depends(database.get_db)):
    """Busca um produto pelo codigo de barras (EAN)."""
    product = db.query(models.Product).filter(models.Product.ean == ean).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return product


@app.post("/dev/seed-test-stock")
def seed_test_stock_endpoint(db: Session = Depends(database.get_db)):
    created = seed_test_stock(db)
    return {
        "status": "ok",
        "created": created,
        "total_catalog": len(TEST_STOCK_ITEMS),
        "message": "Estoque de teste aplicado sem duplicar produtos existentes.",
    }


# --- Endpoints de Autenticacao (App Mobile) ---
@app.post("/auth/register", response_model=schemas.TokenResponse)
def register(request: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing = db.query(models.User).filter(models.User.cpf == request.cpf).first()
    if existing:
        raise HTTPException(status_code=400, detail="CPF ja cadastrado.")

    # Mock de maioridade para MVP
    is_adult = not request.cpf.startswith("000")
    new_user = models.User(cpf=request.cpf, password=request.password, is_adult=is_adult)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"access_token": f"TOKEN_BLE_{new_user.cpf}", "is_adult": is_adult}


@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(request: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.cpf == request.cpf, models.User.password == request.password)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais invalidas.")

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


# --- Endpoints de IoT e Controle de Acesso ---
@app.post("/unlock-fridge")
def unlock_fridge():
    payload_to_esp32 = {"command": "UNLOCK", "device_id": "fridge_01", "duration_seconds": 10}
    return {"status": "success", "message": "Sinal de destravamento enviado", "payload": payload_to_esp32}


# --- Endpoints de Pagamento ---
@app.post("/payment/pix/generate", response_model=schemas.PaymentProcessResponse)
def generate_pix_qr(request: schemas.PixPaymentRequest, db: Session = Depends(database.get_db)):
    """Gera PIX e baixa o estoque no ato da criacao do pagamento (MVP)."""
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
            raise HTTPException(
                status_code=409,
                detail=f"Estoque insuficiente para {product.name}. Disponivel: {product.quantity}",
            )

        product.quantity -= item.quantity
        deducted_items.append(
            {
                "product_id": product.id,
                "ean": product.ean,
                "quantity": item.quantity,
                "remaining_quantity": product.quantity,
            }
        )

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
