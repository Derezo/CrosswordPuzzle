#!/bin/bash

# Galactic Crossword Production Deployment Script
# Deploy to crossword.mittonvillage.com

set -e

# Configuration
APP_NAME="crossword-puzzle"
DOMAIN="crossword.mittonvillage.com"
DEPLOY_USER="deploy"
DEPLOY_PATH="/var/www/crossword"
BACKEND_PORT="5001"
FRONTEND_PORT="3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Galactic Crossword Deployment${NC}"

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
fi

print_status "Building frontend..."
cd frontend
npm ci --production=false
npm run build
print_success "Frontend build completed"

print_status "Building backend..."
cd ../backend
npm ci --production
npm run build
print_success "Backend build completed"

cd ..

print_status "Creating deployment package..."
# Create deployment directory structure
mkdir -p deploy/package
mkdir -p deploy/package/frontend
mkdir -p deploy/package/backend
mkdir -p deploy/package/scripts

# Copy built frontend
cp -r frontend/.next deploy/package/frontend/
cp -r frontend/public deploy/package/frontend/
cp frontend/package.json deploy/package/frontend/
cp frontend/package-lock.json deploy/package/frontend/

# Copy built backend
cp -r backend/dist deploy/package/backend/
cp -r backend/prisma deploy/package/backend/
cp backend/package.json deploy/package/backend/
cp backend/package-lock.json deploy/package/backend/

# Copy scripts and configs
cp deploy/scripts/* deploy/package/scripts/ 2>/dev/null || true
cp deploy/configs/* deploy/package/ 2>/dev/null || true

# Create production environment files
cat > deploy/package/.env.production << EOF
# Production Environment Configuration
NODE_ENV=production
BUILD_TARGET=production

# Ports
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}

# API Configuration
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api

# Database (SQLite for production)
DATABASE_URL="file:./prisma/production.db"

# Security (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=\${JWT_SECRET}
JWT_EXPIRE=7d
SESSION_SECRET=\${SESSION_SECRET}
PUZZLE_SECRET=\${PUZZLE_SECRET}

# OAuth (Configure in production)
GOOGLE_CLIENT_ID=\${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=\${GOOGLE_CLIENT_SECRET}

# Auto-solve Configuration
AUTO_SOLVE_COOLDOWN_HOURS=12

# Logging
LOG_LEVEL=info

# Production flags
ENABLE_SWAGGER=false
ENABLE_CORS_ALL=false
CORS_ORIGIN=https://${DOMAIN}
EOF

print_success "Deployment package created"

print_status "Package ready for deployment to ${DOMAIN}"
echo -e "${YELLOW}📦 Deployment package created in: deploy/package${NC}"
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo -e "   1. Upload the package to your server"
echo -e "   2. Run the server setup script"
echo -e "   3. Configure nginx and SSL"
echo -e "   4. Start the application services"

print_success "Deployment preparation complete!"