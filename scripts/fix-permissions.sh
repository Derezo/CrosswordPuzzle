#!/bin/bash

# Fix Permissions Script
# This script fixes common permission issues that prevent builds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "$1"
}

log "${BLUE}🔧 Fixing file permissions...${NC}"

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "frontend" ]] || [[ ! -d "backend" ]]; then
    log "${RED}❌ Error: Must be run from project root directory${NC}"
    exit 1
fi

log "${YELLOW}🧹 Cleaning up problematic directories...${NC}"

# Remove directories that often have permission issues
sudo rm -rf frontend/.next 2>/dev/null || true
sudo rm -rf frontend/node_modules 2>/dev/null || true
sudo rm -rf backend/node_modules 2>/dev/null || true
sudo rm -rf backend/dist 2>/dev/null || true

log "${YELLOW}🔄 Clearing npm cache...${NC}"
npm cache clean --force

log "${YELLOW}📦 Reinstalling backend dependencies...${NC}"
cd backend
npm install
npm run build

log "${YELLOW}📦 Reinstalling frontend dependencies...${NC}"
cd ../frontend
npm install

log "${YELLOW}🔒 Setting proper permissions...${NC}"
sudo chown -R $USER:$USER ../backend/node_modules ../frontend/node_modules 2>/dev/null || true
chmod -R 755 ../backend/node_modules ../frontend/node_modules 2>/dev/null || true

cd ..

log "${GREEN}✅ Permissions fixed! Ready for deployment.${NC}"
log "${BLUE}Now run: sudo ./deploy/deploy.sh${NC}"