from sqlalchemy import Column, Integer, String, Float, Boolean, Date
from database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    ean = Column(String, unique=True, index=True) # Código de Barras
    selling_price = Column(Float)
    cost_price = Column(Float)
    quantity = Column(Integer, default=0)
    min_stock = Column(Integer, default=5)
    expiration_date = Column(Date, nullable=True)
    is_age_restricted = Column(Boolean, default=False) # Para bebidas alcoólicas

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    cpf = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password = Column(String) # Senha (hash)
    is_adult = Column(Boolean, default=False)
    is_email_verified = Column(Boolean, default=False)
    email_verification_code = Column(String, nullable=True)
    marketing_opt_in = Column(Boolean, default=False)
