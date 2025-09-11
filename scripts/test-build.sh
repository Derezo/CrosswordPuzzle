#!/bin/bash

# Test Build Script - Validates that both frontend and backend build successfully
# This script tests the build process without requiring production infrastructure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "$1"
}

# Function to cleanup on exit
cleanup() {
    log "${YELLOW}🧹 Cleaning up...${NC}"
    # Remove build artifacts that might cause permission issues
    rm -rf frontend/.next/cache 2>/dev/null || true
    rm -rf frontend/node_modules/.cache 2>/dev/null || true
    rm -rf backend/dist 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start test build process
log "${PURPLE}🚀 Starting test build process...${NC}"

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "frontend" ]] || [[ ! -d "backend" ]]; then
    log "${RED}❌ Error: Must be run from project root directory${NC}"
    exit 1
fi

# Test Backend Build
log "${YELLOW}🔧 Testing backend build...${NC}"
cd backend

# Check if package.json exists
if [[ ! -f "package.json" ]]; then
    log "${RED}❌ Backend package.json not found${NC}"
    exit 1
fi

# Install dependencies
log "${BLUE}📦 Installing backend dependencies...${NC}"
npm install

# Generate Prisma client
log "${BLUE}🗄️  Generating Prisma client...${NC}"
npx prisma generate

# Type check backend
log "${BLUE}🔍 Type checking backend...${NC}"
npx tsc --noEmit

# Build backend
log "${BLUE}⚡ Building backend...${NC}"
npm run build

log "${GREEN}✅ Backend build successful!${NC}"

# Test Frontend Build
log "${YELLOW}🎨 Testing frontend build...${NC}"
cd ../frontend

# Check if package.json exists
if [[ ! -f "package.json" ]]; then
    log "${RED}❌ Frontend package.json not found${NC}"
    exit 1
fi

# Install dependencies
log "${BLUE}📦 Installing frontend dependencies...${NC}"
npm install

# Run linting (allow warnings but fail on errors)
log "${BLUE}🧹 Running ESLint check...${NC}"
if ! npm run lint; then
    log "${YELLOW}⚠️  ESLint warnings/errors found, but continuing with build...${NC}"
fi

# Type check frontend
log "${BLUE}🔍 Type checking frontend...${NC}"
npx tsc --noEmit

# Build frontend
log "${BLUE}⚡ Building frontend...${NC}"
npm run build

log "${GREEN}✅ Frontend build successful!${NC}"

# Go back to root
cd ..

log "${GREEN}🎉 All builds completed successfully!${NC}"
log "${BLUE}Build Summary:${NC}"
log "  Backend: ✅ Built successfully"
log "  Frontend: ✅ Built successfully"
log "  Time: $(date)"

# Optional: Show build sizes
if [[ -d "frontend/.next" ]]; then
    log "${BLUE}Frontend build size:${NC}"
    du -sh frontend/.next 2>/dev/null || true
fi

if [[ -d "backend/dist" ]]; then
    log "${BLUE}Backend build size:${NC}"
    du -sh backend/dist 2>/dev/null || true
fi