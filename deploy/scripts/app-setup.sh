#!/bin/bash

# Application Setup Script for Galactic Crossword
# Run this as the deploy user after copying the deployment package

set -e

# Configuration
APP_NAME="crossword-puzzle"
DOMAIN="${DEPLOY_DOMAIN:-crossword.mittonvillage.com}"
DEPLOY_PATH="/var/www/crossword"
BACKEND_PORT="5001"
FRONTEND_PORT="3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Setting up Galactic Crossword Application${NC}"

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

# Check if we're in the deployment directory
if [ ! -f "ecosystem.config.js" ]; then
    print_error "Please run this script from the deployment package directory"
fi

# Check if running as deploy user
if [ "$USER" != "deploy" ]; then
    print_error "Please run this script as the deploy user"
fi

print_status "Installing frontend dependencies..."
cd frontend
npm ci --production
print_success "Frontend dependencies installed"

print_status "Installing backend dependencies..."
cd ../backend
npm ci --production
print_success "Backend dependencies installed"

cd ..

print_status "Setting up database..."
cd backend
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Create initial data (if seed script exists)
if [ -f "package.json" ] && grep -q "prisma.*seed" package.json; then
    print_status "Seeding database..."
    npx prisma db seed
fi

# Generate initial puzzle
print_status "Generating initial puzzle..."
node dist/scripts/generate-puzzle.js || echo "Puzzle generation script not found, skipping..."

cd ..

print_status "Setting up PM2 log directory..."
sudo mkdir -p /var/log/pm2
sudo chown -R deploy:deploy /var/log/pm2

print_status "Configuring PM2..."
# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start applications with ecosystem config
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy

print_success "PM2 configured and applications started"

print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/crossword-puzzle > /dev/null << EOF
/var/log/pm2/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 deploy deploy
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

print_success "Log rotation configured"

print_status "Application setup completed!"
echo -e "${YELLOW}🔧 Application Status:${NC}"
pm2 status

echo -e "${YELLOW}📊 Next steps:${NC}"
echo -e "   1. Configure nginx (copy nginx config and enable site)"
echo -e "   2. Set up SSL certificate with certbot"
echo -e "   3. Configure environment variables"
echo -e "   4. Test the application"

print_success "Application setup complete!"