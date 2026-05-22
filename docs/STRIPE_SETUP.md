# Stripe setup (course purchases)

## 1. Stripe Dashboard

1. Create or open your account at [https://dashboard.stripe.com](https://dashboard.stripe.com).
2. **Developers → API keys** — copy:
   - **Publishable key** (`pk_test_…` or `pk_live_…`)
   - **Secret key** (`sk_test_…` or `sk_live_…`)
3. **Developers → Webhooks → Add endpoint**
   - URL: `http://2.24.110.154/api/stripe/webhook`
   - Events: `checkout.session.completed`
   - Copy the **Signing secret** (`whsec_…`)

## 2. Server `.env` (`backend/.env` on VPS — PM2 runs from `backend/`)

```env
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
FRONTEND_URL=http://2.24.110.154
```

Check API sees Stripe:

```bash
curl -s http://2.24.110.154/api/stripe/config
# {"enabled":true}
```

Run DB migration after pull (or rely on API auto-fix on restart — see `SchemaMigrationsService`):

```bash
bash scripts/run-db-migrations.sh
# manual fix if needed:
# mysql ... -e "ALTER TABLE enrollments MODIFY COLUMN orderId VARCHAR(255) NOT NULL;"
cd backend && npm run build
pm2 restart abc-api
```

If you saw `ER_DATA_TOO_LONG` for `orderId`, the column was still `VARCHAR(64)`. After restart/migration, open your Stripe success URL again (`/checkout/success?session_id=cs_…`) while signed in to create the enrollment.

## 3. Frontend build `.env` (or CI)

```env
VITE_STRIPE_ENABLED=true
```

Rebuild and deploy the frontend static files after changing this.

`VITE_STRIPE_PUBLISHABLE_KEY` is optional today (Checkout redirects to Stripe Hosted Checkout).

## 4. Flow

1. Learner signs in → course → **Purchase** (Stripe Checkout).
2. API creates or reuses a **Stripe Customer** (`users.stripeCustomerId`).
3. Stripe Checkout opens with the course **price from the database** (`priceCents`).
4. On payment, **webhook** enrolls the user (`orderId` = `cs_…` session id). **Continue to course** only appears after that.
5. Free enroll (`POST /enrollments/enroll`) is allowed only when `priceCents` is 0.

## 5. Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed `whsec_…` as `STRIPE_WEBHOOK_SECRET` in `.env`.
