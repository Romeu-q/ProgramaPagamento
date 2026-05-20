from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    ean: str
    selling_price: float
    cost_price: float
    quantity: int
    min_stock: int
    expiration_date: Optional[date] = None
    is_age_restricted: bool = False


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True


class AgeValidationRequest(BaseModel):
    cpf: str


class CartItemRequest(BaseModel):
    product_id: int
    quantity: int = 1


class PixPaymentRequest(BaseModel):
    total_amount: float
    items: List[CartItemRequest]


class StockDeductionItem(BaseModel):
    product_id: int
    ean: str
    quantity: int
    remaining_quantity: int


class PaymentProcessResponse(BaseModel):
    payment_id: str
    qr_code_base64: str
    pix_copia_e_cola: str
    amount: float
    deducted_items: List[StockDeductionItem]


class UserCreate(BaseModel):
    cpf: str
    email: str
    password: str
    marketing_opt_in: bool = False


class UserLogin(BaseModel):
    cpf: str
    password: str


class PasswordResetRequest(BaseModel):
    cpf: str
    new_password: str


class EmailVerificationRequest(BaseModel):
    cpf: str
    verification_code: str


class MarketingMessageRequest(BaseModel):
    subject: str
    body: str


class TokenResponse(BaseModel):
    access_token: str
    is_adult: bool
