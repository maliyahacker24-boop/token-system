# QR Food Stall Ordering MVP

React + Vite + Tailwind frontend for a QR-based food stall ordering flow with Supabase realtime data, Railway admin-auth backend, and Vercel deployment.

## Pages

- `/menu`: customer menu and cart
- `/dashboard`: owner order management
- `/display`: token display screen
- `/`: QR launcher page (shows QR that points to `/menu`)

## 1. Environment Setup

Copy `.env.example` into `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-railway-backend.up.railway.app
```

## 2. Supabase SQL

Important: copy and run only the SQL code block below in Supabase SQL Editor. Do not paste the markdown headings or other README text.

If you still see errors, open `supabase-orders-schema.sql` and copy only the SQL from that file.

Run only the SQL from `supabase-orders-schema.sql` in Supabase SQL Editor:

```sql
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

-- If you already created this table with unquoted camelCase names, Postgres may have stored them in lowercase.
-- Rename those lowercase columns to the quoted camelCase versions below if needed.
alter table public.orders
  rename column if exists businessid to "businessId",
  rename column if exists businessname to "businessName",
  rename column if exists servicetype to "serviceType",
  rename column if exists paymentmethod to "paymentMethod",
  rename column if exists ordersource to "orderSource";

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

alter table if exists public.business_configs replica identity full;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_publication
		WHERE pubname = 'supabase_realtime'
	) THEN
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
```

## 3. Enable Realtime

In Supabase dashboard:

1. Open `Database` -> `Replication`.
2. Enable realtime for both `public.orders` and `public.business_configs` tables.

## 4. Railway Backend

Create a Railway project from the `backend` folder and add these env vars:

```env
ADMIN_PASSWORD=your-strong-admin-password
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
PORT=8080
```

Backend gives:

- `GET /health`
- `POST /api/admin/login`

## 5. Install and Run Locally

```bash
npm install
npm run dev
```

For backend:

```bash
cd ../backend
npm install
npm run dev
```

Open these three routes in separate tabs on the same laptop:

- Customer: `http://localhost:5173/menu`
- Owner: `http://localhost:5173/dashboard`
- Display: `http://localhost:5173/display`

## 6. Deploy on Vercel

1. Import `frontend` folder as a Vercel project.
2. Add environment variables:
	 - `VITE_SUPABASE_URL`
	 - `VITE_SUPABASE_ANON_KEY`
	 - `VITE_API_BASE_URL`
3. Deploy.

The included `vercel.json` rewrites all routes to `index.html` so SPA routes like `/menu`, `/dashboard`, and `/display` work directly.
