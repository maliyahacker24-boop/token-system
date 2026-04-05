# Chaap Wala Software Overview

Chaap Wala is a multi-screen food ordering and token management system that connects the stall counter, kitchen, display screen, and waiter workflow through one shared order stream.

The system has three main parts:

- `frontend/`: React web app for customers, kiosk ordering, dashboard, kitchen, display, waiter web, admin, and analytics
- `backend/`: Railway-ready Express service that validates admin login
- `waiter-app/`: Expo-based Android app that adds extra items to existing dine-in orders

## Main Use Cases

1. A customer places an order by scanning a QR code or using the touch kiosk.
2. The order is saved in the Supabase `orders` table.
3. The dashboard and kitchen screen move order status through `received`, `preparing`, `ready`, and `waste`.
4. The outside display shows only active tokens in an LED-style layout.
5. The waiter web page and Android waiter app can add extra items to an existing dine-in token.
6. The admin panel manages business menus and configuration.

## High-Level Architecture

```text
Customer / Kiosk / Waiter App / Waiter Web
                |
                v
        Supabase Database
      - public.orders
      - public.business_configs
                |
                +--> Dashboard
                +--> Kitchen
                +--> Display
                +--> Analytics
                +--> Waiter tools

Admin Login ---> Railway Backend ---> password validation
Frontend ------> Vercel
Backend -------> Railway
Data ----------> Supabase
Mobile APK ----> Expo / EAS
```

## Frontend Routes

Web routes are defined in [frontend/src/App.jsx](frontend/src/App.jsx).

- `/`: launcher / home page
- `/menu`: customer ordering page
- `/kiosk`: touch-order page for counter or walk-in users
- `/dashboard`: owner/operator order board
- `/display`: public token display screen
- `/kitchen`: kitchen workflow screen
- `/waiter`: waiter web screen for dine-in add-ons
- `/admin/login`: admin login page
- `/admin`: protected menu/business configuration page
- `/analytics`: protected analytics screen

## Core Data Model

### `public.orders`

Shared live order table used by all operational screens.

Important fields:

- `token_number`
- `items` as JSON
- `total_price`
- `businessId`
- `businessName`
- `serviceType`
- `paymentMethod`
- `orderSource`
- `status`
- `created_at`

Status flow:

- `received`
- `preparing`
- `ready`
- `waste`

### `public.business_configs`

Stores menu and business setup used by menu, kiosk, waiter, and admin flows.

Important fields:

- `id`
- `business_type`
- `business_name`
- `items`
- `updated_at`

Schema and realtime setup SQL lives in [frontend/supabase-orders-schema.sql](frontend/supabase-orders-schema.sql).

## How Each Module Works

### Frontend

The web app is the main operating surface.

- Customer and kiosk ordering use the same menu flow with different entry points.
- Dashboard is used to monitor and control token lifecycle.
- Kitchen is focused on preparation flow.
- Display shows simplified token visibility for customers.
- Waiter page updates dine-in orders by appending items to an existing order.
- Admin stores menu/business configuration in Supabase.
- Analytics reads order trends for reporting.

Live sync depends on the Supabase-backed order store and realtime publication on the `orders` table.

### Backend

The backend is intentionally small.

- `GET /health` returns service health.
- `POST /api/admin/login` validates the admin password from environment variables.
- CORS is controlled with `FRONTEND_ORIGIN`.

Implementation is in [backend/server.js](backend/server.js).

### Waiter Android App

The Android app is separated from the web frontend and is intended for staff use.

- Waiter logs in with a simple shared password.
- App opens in a startup-safe login mode.
- Live order loading is triggered manually after login.
- Dine-in order list is loaded from Supabase.
- Waiter can quick-add or manually add items to an existing token.
- Updated items and recalculated total are written back to the same `orders` record.

The current mobile implementation uses a separate screen module and polling-based sync instead of loading live data during cold app start.

## Deployment Layout

### Vercel

- Hosts the React frontend
- Uses [vercel.json](vercel.json) for SPA routing and monorepo root deployment

### Railway

- Hosts the Express backend
- Uses [backend/server.js](backend/server.js)
- Root workspace helpers like [package.json](package.json) and [nixpacks.toml](nixpacks.toml) support monorepo deployment

### Supabase

- Stores orders and business configuration
- Realtime must be enabled for `public.orders` and `public.business_configs`

### Expo / EAS

- Builds the Android waiter APK
- Project config lives in [waiter-app/app.json](waiter-app/app.json) and [waiter-app/eas.json](waiter-app/eas.json)

## Environment Variables

### Frontend

Defined in `frontend/.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

### Backend

Defined in `backend/.env`:

- `PORT`
- `ADMIN_PASSWORD`
- `FRONTEND_ORIGIN`

### Waiter App

Defined in `waiter-app/.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WAITER_PASSWORD`

## Local Development

### Web frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Android waiter app

```bash
cd waiter-app
npm install
npm run start
```

## Recommended Reading

- [frontend/README.md](frontend/README.md)
- [backend/README.md](backend/README.md)
- [waiter-app/README.md](waiter-app/README.md)
- [frontend/supabase-orders-schema.sql](frontend/supabase-orders-schema.sql)

## Operational Notes

- Multi-device sync works only when Supabase realtime publication and table replication are configured correctly.
- The waiter add-on flow updates `items` and `total_price` in the same order record.
- Admin authentication is no longer a frontend-only password check; it goes through the backend API.
- The mobile app is intentionally startup-safe to reduce cold-start crash risk.