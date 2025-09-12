#!/bin/bash

# Server Setup Script for Galactic Crossword
# Run this on your production server

set -e

# Configuration
APP_NAME="crossword-puzzle"
DOMAIN="${DEPLOY_DOMAIN:-crossword.mittonvillage.com}"
DEPLOY_USER="deploy"
DEPLOY_PATH="/var/www/crossword"
BACKEND_PORT="5001"
FRONTEND_PORT="3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Setting up Galactic Crossword on Production Server${NC}"

# Function to print status
print_status() {
    echo -e "${YELLOW}⭐ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
fi

print_status "Installing system dependencies..."
apt update
apt install -y nginx certbot python3-certbot-nginx nodejs npm sqlite3 ufw

# Install PM2 globally
npm install -g pm2

print_success "System dependencies installed"

print_status "Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash $DEPLOY_USER
    usermod -aG www-data $DEPLOY_USER
    print_success "Deploy user created"
else
    print_success "Deploy user already exists"
fi

print_status "Setting up application directory..."
mkdir -p $DEPLOY_PATH
chown -R $DEPLOY_USER:www-data $DEPLOY_PATH
chmod -R 755 $DEPLOY_PATH

print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow $BACKEND_PORT
ufw allow $FRONTEND_PORT

print_success "Server setup completed"

echo -e "${YELLOW}🔧 Next steps:${NC}"
echo -e "   1. Copy your deployment package to $DEPLOY_PATH"
echo -e "   2. Run the application setup script as the deploy user"
echo -e "   3. Configure SSL certificate"
echo -e "   4. Start the application"

print_success "Server setup complete!"