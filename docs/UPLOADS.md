# Uploads folder

Course hero images, `.pptx` decks, PDFs, and videos are stored on the **API server**, not in the frontend `dist` folder.

## Where files live

| Environment | Physical path | URL in browser |
|-------------|---------------|----------------|
| VPS (PM2) | `/opt/abc-safety-solutions/backend/uploads/` | `https://YOUR_DOMAIN/uploads/<uuid>.pptx` |
| Docker API | Volume inside container at `UPLOAD_DIR` (default `./uploads`) | Same `/uploads/...` via nginx proxy |
| Local dev | `backend/uploads/` | `http://localhost:3000/uploads/...` or Vite proxy `/uploads/` |

Set in `.env` (project root):

```env
UPLOAD_DIR=./uploads
PUBLIC_BASE_URL=http://2.24.110.154
FRONTEND_URL=http://2.24.110.154
```

New uploads are stored in the DB as full URLs, e.g. `http://2.24.110.154/uploads/<uuid>.pptx`.

Paths are relative to the **backend** working directory (`/opt/abc-safety-solutions/backend` on PM2).

## How uploads work

1. Admin uploads in **Courses** → files go to `POST /api/admin/upload/file` or `/image`.
2. API saves `backend/uploads/<random-uuid>.<ext>` and returns `/uploads/<filename>`.
3. That path is stored in MySQL (`courses.slides` JSON and `courses.imageUrl`).
4. Host Nginx must proxy `/uploads/` → API on port 3000 (see `deploy/nginx-pm2.conf` for PM2).

### Install Nginx `/uploads/` on VPS (PM2)

```bash
sudo cp /opt/abc-safety-solutions/deploy/nginx-pm2.conf /etc/nginx/sites-available/abc-safety
sudo ln -sf /etc/nginx/sites-available/abc-safety /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
curl -I http://2.24.110.154/uploads/   # 404 is OK if no file; must not be SPA HTML
```

## Size limits

The API does not enforce per-type file size caps on multipart uploads. Limit uploads only at the reverse proxy or disk if needed:

```nginx
client_max_body_size 1g;   # in deploy/nginx-pm2.conf (server + location /api/)
```

After changing nginx on the VPS:

```bash
sudo cp /opt/abc-safety-solutions/deploy/nginx-pm2.conf /etc/nginx/sites-available/abc-safety
sudo nginx -t && sudo systemctl reload nginx
```

## Backup

Include the uploads directory in backups:

```bash
tar -czf uploads-backup-$(date +%F).tar.gz -C /opt/abc-safety-solutions/backend uploads
```

Replacing a `.pptx` in Admin does **not** delete the old file on disk (orphans are harmless). You can prune old files manually if needed.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Upload fails / 413 | Copy `deploy/nginx-pm2.conf`, set `client_max_body_size 1g`, `nginx -t`, reload nginx; disable `sites-enabled/default` if it still listens on port 80 |
| Preview 404 | Confirm `pm2 restart abc-api` and file exists under `backend/uploads/` |
| Wrong image URL | Use `/uploads/...` paths; avoid hard-coding `PUBLIC_BASE_URL` to another host |
