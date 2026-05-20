# Ubuntu VPS setup — ABC Safety Solutions

Complete guide to deploy this project on an **Ubuntu 22.04 / 24.04** VPS from scratch, including **Docker Compose**, **host Nginx**, and **HTTPS (Let's Encrypt)**.

---

## Architecture

```text
Browser (HTTPS)
    ↓
Host Nginx :443 / :80  (SSL, Let's Encrypt)
    ↓ proxy_pass
Docker `web` (Nginx) :8080 on localhost only
    ├── /          → React SPA (static)
    ├── /api/      → NestJS `api` :3000
    └── /uploads/  → NestJS static uploads

Docker `mysql` — internal only (no public port)
Docker `api`   — internal only
```

| Layer | Technology |
|-------|------------|
| Database | **MySQL 8.4** (TypeORM) |
| API | **NestJS** + JWT + bcrypt |
| Frontend | **React / Vite** (static build) |
| App proxy | **Nginx** inside `web` container |
| Edge proxy | **Nginx** on the VPS host (SSL) |
| Payments | **Stripe** (optional, off by default) |

**Not used:** Firebase, PostgreSQL, or third-party BaaS.

---

## 1. VPS requirements

| Item | Recommendation |
|------|----------------|
| OS | Ubuntu 22.04 or 24.04 LTS |
| RAM | 2 GB minimum (4 GB better) |
| Disk | 20 GB+ |
| Ports | 22 (SSH), 80, 443 |
| Domain | Optional for HTTP-only; **required for HTTPS** (e.g. `training.yourdomain.com`) |

---

## 2. Initial server setup (root)

SSH into the VPS, then install Docker, Git, and configure the firewall.

### Option A — use the project script

```bash
# As root
git clone https://github.com/WaseemMirzaa/abc-safety-solutions.git /opt/abc-safety-solutions
cd /opt/abc-safety-solutions
bash scripts/server-setup.sh
```

### Option B — manual (equivalent)

```bash
apt-get update -y && apt-get upgrade -y

# Docker (official)
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin git

systemctl enable docker && systemctl start docker

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Verify:

```bash
docker --version
docker compose version
```

---

## 3. Clone the project

Use a dedicated deploy user (recommended):

```bash
adduser deploy
usermod -aG docker deploy
su - deploy

sudo mkdir -p /opt/abc-safety-solutions
sudo chown deploy:deploy /opt/abc-safety-solutions
cd /opt/abc-safety-solutions

git clone https://github.com/WaseemMirzaa/abc-safety-solutions.git .
```

---

## 4. Production environment (`.env`)

```bash
cp .env.example .env
nano .env
```

### Generate secrets

```bash
# JWT secret (48+ bytes hex)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Strong passwords
openssl rand -base64 32
```

### Example `.env`

Replace every `CHANGE_THIS` / placeholder value.

```env
# ---- MySQL -------------------------------------------------------
MYSQL_ROOT_PASSWORD=CHANGE_THIS_STRONG_ROOT_PASSWORD

DB_HOST=mysql
DB_PORT=3306
DB_USER=abc
DB_PASSWORD=CHANGE_THIS_STRONG_APP_PASSWORD
DB_NAME=abc_portal

# ---- Application -------------------------------------------------
NODE_ENV=production
PORT=3000

JWT_SECRET=CHANGE_THIS_LONG_RANDOM_SECRET_AT_LEAST_48_CHARS
JWT_EXPIRES_IN=7d

UPLOAD_DIR=./uploads

# Public URL (no trailing slash) — used for /uploads/* links
PUBLIC_BASE_URL=https://training.yourdomain.com

# CORS — same origin when Nginx serves UI + API on one domain
FRONTEND_URL=https://training.yourdomain.com

# ---- Stripe (optional) ------------------------------------------
STRIPE_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ---- Admin user (create-admin-user script) -----------------------
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_NAME=Admin
ADMIN_PASSWORD=ChangeThisStrongPassword123!
```

**Rules:**

- `DB_PASSWORD` must match the password MySQL creates for user `abc`.
- `PUBLIC_BASE_URL` and `FRONTEND_URL` must be your real site URL (use `https://` in production).
- **Never commit** `.env` to git.

---

## 5. Bind Docker `web` to localhost (for host Nginx)

By default, `docker-compose.yml` maps `80:80` on the host. For **host Nginx + SSL**, bind the app only on localhost so ports 80/443 are free for Certbot.

Edit `docker-compose.yml`:

```yaml
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "127.0.0.1:8080:80"   # change from "80:80"
```

---

## 6. First deploy (Docker)

```bash
cd /opt/abc-safety-solutions

docker compose build
docker compose up -d
```

Or use the deploy script (after `.env` exists):

```bash
bash scripts/deploy.sh --create-admin
```

(`deploy.sh` runs `git pull`, rebuilds `api` and `web`, starts containers, and optionally creates the admin user.)

### 6.1 Create database tables (first time only)

In **production**, TypeORM `synchronize` is **disabled** (`NODE_ENV=production`), so tables are **not** created automatically. Bootstrap the schema once:

**Option A — one-off container with development sync**

```bash
docker compose run --rm \
  -e NODE_ENV=development \
  -e DB_HOST=mysql \
  --no-deps api node dist/main.js
```

Wait until logs show the API listening, then press `Ctrl+C`. Tables are created in MySQL.

**Option B — temporary compose override**

1. Set `NODE_ENV=development` under the `api` service in `docker-compose.yml`.
2. `docker compose up -d api` and wait ~30 seconds.
3. Set `NODE_ENV=production` again.
4. `docker compose up -d api`.

### 6.2 Create admin user

```bash
docker compose exec api node dist/scripts/create-admin-user.js
```

Uses `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` from `.env`.  
Creates a new admin or upgrades an existing email to admin with the new password.

First deploy with script:

```bash
bash scripts/deploy.sh --create-admin
```

### 6.3 Seed catalog content

There is **no automatic database seed** for courses or categories. After admin login:

- Use **Admin → Courses** and **Admin → Categories** to add content, or
- Import via admin APIs later.

`frontend/src/data/catalog.ts` is reference data only until you add courses in the admin UI.

### 6.4 Verify containers

```bash
docker compose ps

curl -s http://127.0.0.1:8080/api/health
# Expected: {"status":"ok","service":"abc-portal-api","time":"..."}
```

Open in browser (after Nginx is configured): `https://training.yourdomain.com`

---

## 7. Host Nginx (HTTP → HTTPS + reverse proxy)

Install Nginx and Certbot:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### Site configuration

```bash
sudo nano /etc/nginx/sites-available/abc-safety
```

Paste (replace `training.yourdomain.com`):

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name training.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS — proxy to Docker web (inner Nginx proxies /api and /uploads)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name training.yourdomain.com;

    # Certbot fills these after issuance:
    ssl_certificate     /etc/letsencrypt/live/training.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/training.yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 20M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Enable and test:

```bash
sudo mkdir -p /var/www/certbot
sudo ln -sf /etc/nginx/sites-available/abc-safety /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### TLS certificate

DNS **A record** must point to the VPS IP before running Certbot.

```bash
sudo certbot --nginx -d training.yourdomain.com
```

Certbot updates SSL paths and installs auto-renewal. Test renewal:

```bash
sudo certbot renew --dry-run
```

---

## 8. Inner Nginx (Docker `web` container)

Configured in `frontend/nginx.conf` (copied into the image at build time):

| Path | Target |
|------|--------|
| `/api/` | `http://api:3000/api/` |
| `/uploads/` | `http://api:3000/uploads/` |
| `*.js`, `*.css`, images, fonts | Long cache (1 year, hashed Vite assets) |
| `/` | SPA fallback → `index.html` |

The React app uses **same-origin** API calls (`VITE_API_URL` defaults to empty), so no extra frontend build variables are required when UI and API share one domain.

---

## 9. Updates (redeploy)

```bash
cd /opt/abc-safety-solutions
git pull origin main
bash scripts/run-db-migrations.sh
bash scripts/deploy.sh
```

### PM2 deployments (API without Docker)

If the API runs under PM2 and you see `Unknown column 'CourseEntity.slides'`:

```bash
cd /opt/abc-safety-solutions
git pull origin main
bash scripts/run-db-migrations.sh
cd backend && npm run build
pm2 restart abc-api
```

Or run SQL directly:

```bash
mysql -h127.0.0.1 -u abc -p abc_portal -e "ALTER TABLE courses ADD COLUMN slides JSON NULL;"
pm2 restart abc-api
```

Reset or create admin later:

```bash
docker compose exec api node dist/scripts/create-admin-user.js
```

---

## 10. DNS

| Type | Name | Value |
|------|------|--------|
| A | `training` (or `@`) | VPS public IPv4 |

Wait for DNS propagation before `certbot`.

---

## 11. Operations cheat sheet

```bash
# Container status
docker compose ps

# Logs
docker compose logs -f api
docker compose logs -f web
docker compose logs -f mysql

# Restart services
docker compose restart api web

# MySQL CLI
docker compose exec mysql mysql -u abc -p abc_portal

# Uploads volume (persists across redeploys)
docker volume inspect abc-safety-solutions_uploads

# Host Nginx
sudo nginx -t && sudo systemctl reload nginx

# TLS renewal test
sudo certbot renew --dry-run
```

### Health check

```bash
curl -s https://training.yourdomain.com/api/health
```

---

## 12. Optional: Stripe

1. Set in `.env`:
   - `STRIPE_ENABLED=true`
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
2. Rebuild and restart API:
   ```bash
   docker compose build api && docker compose up -d api
   ```
3. Configure Stripe webhooks when the webhook endpoint is implemented.
4. For browser checkout, rebuild the frontend with `VITE_STRIPE_ENABLED=true` (requires adding a build `ARG` to `frontend/Dockerfile` if not already present).

---

## 13. Simpler alternative (HTTP only, no host Nginx)

For quick testing on a VPS IP **without SSL**:

1. Keep `ports: "80:80"` on `web` in `docker-compose.yml`.
2. Skip section 7.
3. Set `PUBLIC_BASE_URL` and `FRONTEND_URL` to `http://YOUR_VPS_IP`.
4. Open `http://YOUR_VPS_IP`.

**Not recommended for production** (credentials sent in cleartext).

---

## 14. Local development (not VPS)

MySQL in Docker; API and frontend run on the host with hot reload.

```bash
# From project root
docker compose -f docker-compose.dev.yml up -d

cp backend/.env.example backend/.env
# Set DB_HOST=127.0.0.1, DB_PASSWORD=abc_secret (matches dev compose)

cd backend && npm install && npm run start:dev
# API: http://localhost:3000/api

cd frontend && npm install && npm run dev
# UI: http://localhost:5173 (Vite proxies /api and /uploads to :3000)
```

Create local admin:

```bash
cd backend && npm run admin:create
```

---

## 15. API surface (reference)

Base path: `/api` (global prefix in NestJS).

| Area | Examples |
|------|----------|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `login`, `forgot-password`; `GET /api/auth/me`; `PATCH /api/me` |
| Catalog | `GET /api/courses`, `GET /api/categories` |
| Learner | `GET /api/enrollments/me`, `GET /api/me/orders`, progress, certificates |
| Public | `GET /api/certificates/verify/:id` |
| Admin | `GET /api/admin/courses`, media, tests, orders, directory, … |
| Uploads | `POST /api/admin/upload/image`; files served at `/uploads/` |
| Stripe | `POST /api/stripe/checkout` (when enabled) |

---

## 16. Deployment checklist

- [ ] Ubuntu updated; Docker + Compose installed
- [ ] UFW: 22, 80, 443 allowed
- [ ] Repo cloned to `/opt/abc-safety-solutions`
- [ ] `.env` created from `.env.example` with strong secrets
- [ ] `docker-compose.yml`: `web` bound to `127.0.0.1:8080:80` (if using host Nginx)
- [ ] `docker compose up -d` (or `bash scripts/deploy.sh`)
- [ ] Database schema bootstrapped once (`NODE_ENV=development`)
- [ ] Admin user created (`create-admin-user.js`)
- [ ] Host Nginx site enabled + `nginx -t`
- [ ] Certbot certificate issued
- [ ] DNS A record → VPS
- [ ] `curl` health check OK
- [ ] Admin login; courses/categories added in admin UI

---

## Related files in this repo

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production: MySQL + API + web |
| `docker-compose.dev.yml` | Dev: MySQL only |
| `.env.example` | Production env template (project root) |
| `backend/.env.example` | Local backend dev template |
| `scripts/server-setup.sh` | One-time VPS package install |
| `scripts/deploy.sh` | Pull, build, up, optional admin |
| `frontend/nginx.conf` | In-container Nginx for SPA + API proxy |

For product scope and feature list, see `docs/ABC_SAFETY_SOLUTIONS_WEB_APP_SPEC.md` and `frontend/README.md`.
