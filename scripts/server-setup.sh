#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  server-setup.sh
#  One-time setup for a fresh Ubuntu 22.04 / 24.04 Digital Ocean droplet.
#  Run as root: bash scripts/server-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "==> Updating packages..."
apt-get update -y && apt-get upgrade -y

echo "==> Installing Docker..."
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
  docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "==> Installing Git..."
apt-get install -y git

echo "==> Configuring UFW firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "✓ Server setup complete."
echo "  Docker:  $(docker --version)"
echo "  Compose: $(docker compose version)"
echo ""
echo "Next steps:"
echo "  1. git clone <your-repo> /opt/abc-safety-solutions"
echo "  2. cd /opt/abc-safety-solutions"
echo "  3. cp .env.example .env && nano .env   # fill in real values"
echo "  4. bash scripts/deploy.sh"
