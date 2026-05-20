# Migração total para Vercel + Supabase

## 1) Supabase

1. Crie um projeto no Supabase.
2. Abra `SQL Editor` e rode `supabase/schema.sql`.
3. Em `Project Settings > API`, copie:
   - `Project URL` (SUPABASE_URL)
   - `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

## 2) SMTP (envio de e-mail)

No provedor SMTP (Gmail/Brevo), tenha:
- SMTP_HOST
- SMTP_PORT (geralmente 587)
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM

## 3) Deploy no Vercel

1. Importe o repositório no Vercel.
2. Configure:
   - Root Directory: `.` (raiz)
   - O arquivo `vercel.json` já configura build do `frontend`.
3. Em `Settings > Environment Variables`, adicione:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `SMTP_FROM`
4. Faça deploy.

## 4) Validar API

- `https://SEU_DOMINIO_VERCEL/health`
- `POST https://SEU_DOMINIO_VERCEL/dev/seed-test-stock`

## 5) Apontar apps para Vercel

### Mobile (Expo/EAS)

Defina no EAS:
- `EXPO_PUBLIC_API_URL=https://SEU_DOMINIO_VERCEL`

Depois publique OTA:
- `npx eas update --branch production --environment production --message "migracao vercel supabase"`

### Frontend (totem)

Defina no Vercel:
- `VITE_API_URL=https://SEU_DOMINIO_VERCEL`

Se o frontend estiver no mesmo domínio da API, pode deixar vazio.

## Endpoints mantidos (compatibilidade)

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify-email`
- `POST /auth/resend-verification?cpf=...`
- `POST /auth/reset-password`
- `GET /products/ean/:ean`
- `POST /payment/pix/generate`
- `POST /unlock-fridge`
- `POST /dev/seed-test-stock`
