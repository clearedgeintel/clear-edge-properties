# Deploying to Railway

This app is a single Node service (Express API + pre-built React client served as
static files). Railway builds it from the `Dockerfile`.

## 1. Push to GitHub

Railway's standard flow deploys from a GitHub repo:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

(Or skip GitHub and deploy the Dockerfile directly with the CLI: `npm i -g @railway/cli`, `railway login`, `railway up`.)

## 2. Create the service

- New Project → Deploy from GitHub repo → pick this repo.
- Railway auto-detects the `Dockerfile`. No build/start command overrides needed
  (the image runs `node dist/index.js`).
- Railway injects `PORT` at runtime; the server already binds `0.0.0.0:$PORT`.

## 3. Environment variables

Set these in the service's **Variables** tab. The `VITE_*` ones are **build-time**
— they're baked into the client bundle, and the `Dockerfile` declares matching
`ARG`s so Railway forwards them into the build. The rest are runtime.

| Variable | Scope | Notes |
|---|---|---|
| `DATABASE_URL` | runtime | Supabase Postgres connection string (use the **pooler** host, `sslmode=require`). |
| `SUPABASE_URL` | runtime | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | Server-side Supabase key. Keep secret. |
| `OPENAI_API_KEY` | runtime | AI commentary / underwriting. |
| `RAPIDAPI_KEY` | runtime | Zillow/LoopNet/Redfin/Crexi + agent lookup. |
| `STRIPE_SECRET_KEY` | runtime | Billing. |
| `STRIPE_PRICE_ID` | runtime | Subscription price. |
| `STRIPE_WEBHOOK_SECRET` | runtime | Webhook signature verification. |
| `SESSION_SECRET` | runtime | Session signing. |
| `NODE_ENV` | runtime | `production`. |
| `VITE_SUPABASE_URL` | **build** | Public Supabase URL for the client. |
| `VITE_SUPABASE_ANON_KEY` | **build** | Public Supabase anon key. |
| `VITE_STRIPE_PUBLIC_KEY` | **build** | Stripe publishable key. |

> Without the `VITE_*` build vars, the production client ships with empty
> Supabase/Stripe config and login/checkout silently break. Set them before the
> first build.

## 4. Database schema

The app uses Drizzle. Apply the schema to the target database once (and after
schema changes). Run locally against the prod `DATABASE_URL`:

```bash
DATABASE_URL="<prod url>" npm run db:push
```

There is no automatic migration step in the deploy.

## 5. Stripe webhook

Point a Stripe webhook at `https://<your-app>.up.railway.app/webhook/stripe` and
put its signing secret in `STRIPE_WEBHOOK_SECRET`.

> Known issue: the webhook raw-body signature path needs a fix before billing
> events apply correctly (tracked in `CLEAREDGE_ROADMAP.md`, Phase 0). Deploy is
> fine; billing won't be reliable until that's done.

## Verify after deploy

- App loads and you can sign in (confirms `VITE_*` baked correctly).
- A property search returns results (confirms `RAPIDAPI_KEY`).
- Logs show `serving on port <PORT>` with no `Cannot find module 'vite'`.
