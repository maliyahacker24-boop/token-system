create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    token_number integer not null,
    items jsonb not null,
    total_price numeric not null,
    "businessId" text,
    "businessName" text,
    "serviceType" text,
    "paymentMethod" text,
    "orderSource" text,
    status text not null check (status in ('received', 'preparing', 'ready', 'waste')),
    created_at timestamptz not null default now()
);

create index if not exists orders_token_number_idx on public.orders (token_number);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'businessid'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN businessid TO "businessId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'businessname'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN businessname TO "businessName";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'servicetype'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN servicetype TO "serviceType";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'paymentmethod'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN paymentmethod TO "paymentMethod";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'ordersource'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN ordersource TO "orderSource";
  END IF;
END$$;

alter table if exists public.orders
  add column if not exists "businessId" text,
  add column if not exists "businessName" text,
  add column if not exists "serviceType" text,
  add column if not exists "paymentMethod" text,
  add column if not exists "orderSource" text;

create table if not exists public.business_configs (
    id text primary key,
    business_type text not null,
    business_name text not null,
    items jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

create index if not exists business_configs_business_name_idx on public.business_configs (business_name);

alter table if exists public.orders replica identity full;
alter table if exists public.business_configs replica identity full;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.business_configs;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END$$;

alter table public.orders disable row level security;
alter table public.business_configs disable row level security;
