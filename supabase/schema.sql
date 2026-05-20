create table if not exists public.products (
  id bigserial primary key,
  name text not null,
  ean text unique not null,
  selling_price numeric not null,
  cost_price numeric not null default 0,
  quantity integer not null default 0,
  min_stock integer not null default 5,
  expiration_date date null,
  is_age_restricted boolean not null default false
);

create table if not exists public.users (
  id bigserial primary key,
  cpf text unique not null,
  email text unique not null,
  password text not null,
  is_adult boolean not null default false,
  is_email_verified boolean not null default false,
  email_verification_code text null,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products disable row level security;
alter table public.users disable row level security;
