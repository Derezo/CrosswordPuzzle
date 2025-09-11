#!/bin/bash

# Environment Setup Script for Galactic Crossword
# Run this as the deploy user to configure production environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}⚙️ Setting up Environment Variables for Galactic Crossword${NC}"

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

# Function to generate random secret
generate_secret() {
    openssl rand -hex 32
}

print_status "Generating secure environment variables..."

# Generate secrets
JWT_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)
PUZZLE_SECRET=$(generate_secret)

print_success "Secrets generated"

# Get user input for OAuth (optional)
read -p "Enter Google Client ID (or press Enter to skip): " GOOGLE_CLIENT_ID
read -p "Enter Google Client Secret (or press Enter to skip): " GOOGLE_CLIENT_SECRET

# Get email for notifications (optional)
read -p "Enter admin email for notifications (optional): " ADMIN_EMAIL

print_status "Creating backend environment file..."

# Create backend .env file
cat > backend/.env << EOF
# Production Environment Configuration
NODE_ENV=production
BUILD_TARGET=production

# Server Configuration
PORT=5001
BACKEND_PORT=5001
FRONTEND_PORT=3001

# API Configuration
NEXT_PUBLIC_API_URL=https://crossword.mittonvillage.com/api

# Database Configuration
DATABASE_URL="file:./prisma/production.db"

# Security Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=7d
SESSION_SECRET=${SESSION_SECRET}
PUZZLE_SECRET=${PUZZLE_SECRET}

# CORS Configuration
CORS_ORIGIN=https://crossword.mittonvillage.com

# OAuth Configuration
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# Application Configuration
AUTO_SOLVE_COOLDOWN_HOURS=12

# Logging Configuration
LOG_LEVEL=info

# Production Flags
ENABLE_SWAGGER=false
ENABLE_CORS_ALL=false

# Admin Configuration
ADMIN_EMAIL=${ADMIN_EMAIL}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

print_success "Backend environment file created"

print_status "Creating frontend environment file..."

# Create frontend .env.local file
cat > frontend/.env.local << EOF
# Frontend Production Environment
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://crossword.mittonvillage.com/api
PORT=3001
EOF

print_success "Frontend environment file created"

# Set secure permissions
chmod 600 backend/.env
chmod 600 frontend/.env.local

print_status "Setting secure file permissions..."
print_success "File permissions set"

echo -e "${YELLOW}🔐 Environment Variables Summary:${NC}"
echo -e "   JWT Secret: ${JWT_SECRET:0:8}... (32 chars)"
echo -e "   Session Secret: ${SESSION_SECRET:0:8}... (32 chars)"
echo -e "   Puzzle Secret: ${PUZZLE_SECRET:0:8}... (32 chars)"
echo -e "   Google OAuth: ${GOOGLE_CLIENT_ID:+Configured}"
echo -e "   Admin Email: ${ADMIN_EMAIL:-Not set}"

echo -e "${YELLOW}⚠️ Important Security Notes:${NC}"
echo -e "   1. Environment files are set to 600 permissions (owner read/write only)"
echo -e "   2. Never commit these files to version control"
echo -e "   3. Back up your secrets securely"
echo -e "   4. Consider using a password manager for OAuth credentials"

# Create backup of secrets
BACKUP_FILE="/home/deploy/crossword-secrets-backup-$(date +%Y%m%d-%H%M%S).txt"
cat > "$BACKUP_FILE" << EOF
# Galactic Crossword Production Secrets Backup
# Generated: $(date)
# 
# KEEP THIS FILE SECURE AND NEVER SHARE IT
#
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
PUZZLE_SECRET=${PUZZLE_SECRET}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
EOF

chmod 600 "$BACKUP_FILE"

echo -e "${YELLOW}💾 Secrets backed up to: ${BACKUP_FILE}${NC}"
echo -e "${YELLOW}   Please store this backup securely and delete it from the server after backing up elsewhere${NC}"

print_success "Environment setup complete!"

echo -e "${YELLOW}🔄 Next steps:${NC}"
echo -e "   1. Review the generated environment files"
echo -e "   2. Update OAuth credentials if needed"
echo -e "   3. Restart the applications: pm2 restart all"
echo -e "   4. Test the application functionality"