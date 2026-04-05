# Chaap Wala Backend

Simple Railway-ready backend for admin login.

## Env vars

```env
PORT=8080
ADMIN_PASSWORD=change-this-password
FRONTEND_ORIGIN=http://localhost:5173,https://your-vercel-app.vercel.app
```

## Run locally

```bash
npm install
npm run dev
```

## Routes

- `GET /health`
- `POST /api/admin/login`

`FRONTEND_ORIGIN` can contain comma-separated origins.

Example:

`http://localhost:5173,https://your-vercel-app.vercel.app`