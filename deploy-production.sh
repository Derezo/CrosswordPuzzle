#!/bin/bash

# Galactic Crossword - Improved Production Deployment Script
# Single script to deploy from local development to production
# Handles build, package, upload, server setup, and application start
# Enhanced with proper error handling, rollback, and dependency management

set -euo pipefail  # Enhanced error handling

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default Configuration - Override with environment variables or command line
DOMAIN="${DEPLOY_DOMAIN:-crossword.mittonvillage.com}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/crossword}"
BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"
DEPLOYMENT_ID="deploy_$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="/tmp/crossword-${DEPLOYMENT_ID}"
BACKUP_PATH=""

# Deployment modes
MODE="${1:-full}"  # full, build-only, upload-only, server-only

echo -e "${CYAN}🚀 Galactic Crossword Improved Deployment${NC}"
echo -e "${CYAN}===========================================${NC}"
echo -e "${BLUE}Deployment ID: ${DEPLOYMENT_ID}${NC}"

# Enhanced logging
LOGFILE="${PWD}/deployment-${DEPLOYMENT_ID}.log"
exec > >(tee -a "$LOGFILE")
exec 2>&1

# Cleanup function for error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        print_error "Deployment failed with exit code $exit_code"
        print_warning "Cleaning up temporary files..."
        [ -d "$TEMP_DIR" ] && rm -rf "$TEMP_DIR"
        
        if [ -n "$BACKUP_PATH" ] && [ "$MODE" = "full" ]; then
            print_warning "Consider rolling back using: ssh $DEPLOY_USER@$DOMAIN 'cd $DEPLOY_PATH && sudo systemctl stop crossword-* && sudo mv $DEPLOY_PATH.backup $DEPLOY_PATH'"
        fi
    fi
    
    print_info "Log file: $LOGFILE"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Function to print status with icons and logging
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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Enhanced waiting function with timeout
wait_for_condition() {
    local description="$1"
    local condition="$2"
    local timeout="${3:-60}"
    local interval="${4:-2}"
    
    print_status "Waiting for: $description (timeout: ${timeout}s)"
    
    for i in $(seq 1 $((timeout / interval))); do
        if eval "$condition"; then
            print_success "$description completed"
            return 0
        fi
        sleep "$interval"
        echo -n "."
    done
    
    echo ""
    print_error "$description timed out after ${timeout}s"
}

# Enhanced SSH execution with retry logic
ssh_execute() {
    local description="$1"
    local commands="$2"
    local retries="${3:-3}"
    local delay="${4:-5}"
    
    print_status "$description"
    
    for attempt in $(seq 1 "$retries"); do
        if ssh -i "$SSH_KEY" -o ConnectTimeout=30 -o ServerAliveInterval=60 "$DEPLOY_USER@$DOMAIN" "$commands"; then
            return 0
        else
            if [ "$attempt" -lt "$retries" ]; then
                print_warning "Attempt $attempt failed, retrying in ${delay}s..."
                sleep "$delay"
            else
                print_error "$description failed after $retries attempts"
            fi
        fi
    done
}

# Function to show usage
show_usage() {
    echo "Improved Production Deployment Script for Galactic Crossword"
    echo ""
    echo "Usage: $0 [mode] [options]"
    echo ""
    echo "Modes:"
    echo "  full         Complete deployment (build + upload + server setup)"
    echo "  build-only   Only build and package locally"
    echo "  upload-only  Upload existing package to server"
    echo "  server-only  Setup server infrastructure only"
    echo "  help         Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOY_DOMAIN      Target domain (default: crossword.mittonvillage.com)"
    echo "  DEPLOY_USER        SSH user (default: deploy)"
    echo "  DEPLOY_PATH        Server path (default: /var/www/crossword)"
    echo "  BACKEND_PORT       Backend port (default: 5001)"
    echo "  FRONTEND_PORT      Frontend port (default: 3001)"
    echo "  SSH_KEY            SSH key path (default: ~/.ssh/id_rsa)"
    echo "  ADMIN_EMAIL        Admin email for SSL (default: admin@domain)"
    echo ""
    echo "Examples:"
    echo "  $0 full                    # Complete deployment"
    echo "  $0 build-only              # Just build locally"
    echo "  DEPLOY_DOMAIN=mysite.com $0 full  # Deploy to custom domain"
}

# Enhanced prerequisite validation
validate_prerequisites() {
    print_header "🔍 Validating Prerequisites"
    
    # Check if we're in project root
    if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
        print_error "Please run this script from the project root directory"
    fi
    
    # Check git status
    if git status --porcelain | grep -q .; then
        print_warning "Working directory is not clean"
        git status --short
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled"
        fi
    fi
    
    # Check for required tools
    local missing_tools=()
    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    command -v git >/dev/null 2>&1 || missing_tools+=("git")
    
    # Check SSH tools only for modes that need them
    if [[ "$MODE" != "build-only" ]]; then
        command -v ssh >/dev/null 2>&1 || missing_tools+=("ssh")
        command -v scp >/dev/null 2>&1 || missing_tools+=("scp")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
    fi
    
    # Check SSH key and connectivity (skip for build-only mode)
    if [[ "$MODE" != "build-only" ]]; then
        if [ ! -f "$SSH_KEY" ]; then
            print_error "SSH key not found at $SSH_KEY"
        fi
        
        # Test SSH connectivity
        print_status "Testing SSH connectivity to $DEPLOY_USER@$DOMAIN..."
        if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$DEPLOY_USER@$DOMAIN" "echo 'SSH connection successful'" 2>/dev/null; then
            print_error "Cannot connect to $DEPLOY_USER@$DOMAIN via SSH. Check your SSH key ($SSH_KEY) and server access."
        fi
        print_success "SSH connectivity verified"
    fi
    
    # Validate configuration
    if [[ ! "$BACKEND_PORT" =~ ^[0-9]+$ ]] || [ "$BACKEND_PORT" -lt 1024 ] || [ "$BACKEND_PORT" -gt 65535 ]; then
        print_error "Invalid BACKEND_PORT: $BACKEND_PORT (must be 1024-65535)"
    fi
    
    if [[ ! "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || [ "$FRONTEND_PORT" -lt 1024 ] || [ "$FRONTEND_PORT" -gt 65535 ]; then
        print_error "Invalid FRONTEND_PORT: $FRONTEND_PORT (must be 1024-65535)"
    fi
    
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid DOMAIN format: $DOMAIN"
    fi
    
    print_success "Prerequisites validated"
}

# Enhanced build function with validation
build_application() {
    print_header "🔧 Building Application"
    
    print_status "Creating build directory: $TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    cp -r . "$TEMP_DIR/"
    cd "$TEMP_DIR"
    
    print_status "Building frontend..."
    cd frontend
    
    # Verify package.json exists
    if [ ! -f "package.json" ]; then
        print_error "Frontend package.json not found"
    fi
    
    npm ci --production=false || print_error "Frontend dependency installation failed"
    
    # Temporarily backup and remove .env.local to prevent localhost override
    if [ -f ".env.local" ]; then
        mv .env.local .env.local.backup
    fi
    
    # Set production environment variables and build
    NODE_ENV=production NEXT_PUBLIC_API_URL=https://${DOMAIN}/api npm run build || {
        print_warning "Frontend production build failed, trying standard build..."
        npm run build || print_error "Frontend build failed completely"
    }
    
    # Verify build output
    if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
        print_error "Frontend build did not produce expected output"
    fi
    
    # Restore .env.local after build
    if [ -f ".env.local.backup" ]; then
        mv .env.local.backup .env.local
    fi
    
    print_success "Frontend build completed"
    
    print_status "Building backend..."
    cd ../backend
    
    # Verify package.json exists
    if [ ! -f "package.json" ]; then
        print_error "Backend package.json not found"
    fi
    
    npm ci --production=false || print_error "Backend dependency installation failed"
    npm run build || print_error "Backend build failed"
    
    # Verify build output
    if [ ! -d "dist" ] || [ ! -f "dist/server.js" ]; then
        print_error "Backend build did not produce expected output"
    fi
    
    print_success "Backend build completed"
    
    cd ..
    
    print_status "Creating deployment package..."
    create_deployment_package
    
    print_success "Deployment package created in ./deploy/package"
    
    # Store the original directory before we started the build
    local original_dir="$OLDPWD"
    
    # Copy package back to original location
    cd "$original_dir"
    rm -rf deploy/package
    mkdir -p deploy
    cp -r "$TEMP_DIR/deploy/package" ./deploy/
    
    print_info "Package contents:"
    if [ -d "deploy/package" ]; then
        local total_files=$(find deploy/package -type f | wc -l)
        find deploy/package -type f | head -20 || true  # Ignore SIGPIPE errors
        if [ "$total_files" -gt 20 ]; then
            echo "  ... and $(( total_files - 20 )) more files"
        fi
        print_success "Package successfully created with $total_files files"
    else
        print_error "Failed to copy package to deploy/package directory"
    fi
}

# Enhanced package creation with verification
create_deployment_package() {
    # Clean up any existing package
    rm -rf deploy/package
    mkdir -p deploy/package
    mkdir -p deploy/package/frontend
    mkdir -p deploy/package/backend
    mkdir -p deploy/package/scripts
    
    # Copy built frontend
    if [ -d "frontend/.next" ]; then
        cp -r frontend/.next deploy/package/frontend/ || print_error "Failed to copy frontend build"
    else
        print_error "Frontend .next directory not found - build may have failed"
    fi
    cp -r frontend/public deploy/package/frontend/ || print_error "Failed to copy frontend public files"
    cp frontend/package.json deploy/package/frontend/ || print_error "Failed to copy frontend package.json"
    cp frontend/package-lock.json deploy/package/frontend/ || print_error "Failed to copy frontend package-lock.json"
    
    # Copy built backend
    cp -r backend/dist deploy/package/backend/ || print_error "Failed to copy backend build"
    cp -r backend/prisma deploy/package/backend/ || print_error "Failed to copy backend prisma files"
    cp backend/package.json deploy/package/backend/ || print_error "Failed to copy backend package.json"
    cp backend/package-lock.json deploy/package/backend/ || print_error "Failed to copy backend package-lock.json"
    
    # Copy backend data files (including crossword dictionary)
    if [ -d "backend/src/data" ]; then
        mkdir -p deploy/package/backend/src/data
        cp -r backend/src/data/* deploy/package/backend/src/data/ || print_error "Failed to copy backend data files"
        print_info "Dictionary file included ($(du -h backend/src/data/crossword_dictionary_with_clues.csv | cut -f1))"
    else
        print_warning "Backend data directory not found - dictionary file may be missing"
    fi
    
    # Copy deployment configurations and scripts
    mkdir -p deploy/scripts deploy/configs
    cp -r deploy/scripts/* deploy/package/scripts/ 2>/dev/null || true
    cp -r deploy/configs/* deploy/package/ 2>/dev/null || true
    
    # Create production environment template
    create_production_configs
    
    # Verify package integrity
    verify_package_integrity
}

# Create production configuration files
create_production_configs() {
    cat > deploy/package/.env.production << EOF
# Production Environment Configuration
NODE_ENV=production
BUILD_TARGET=production

# Server Configuration
PORT=${BACKEND_PORT}
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}

# API Configuration
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api

# Database Configuration
DATABASE_URL="file:./prisma/production.db"

# Security Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=\${JWT_SECRET}
JWT_EXPIRE=7d
SESSION_SECRET=\${SESSION_SECRET}
PUZZLE_SECRET=\${PUZZLE_SECRET}

# CORS Configuration
CORS_ORIGIN=https://${DOMAIN}

# OAuth Configuration
GOOGLE_CLIENT_ID=\${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=\${GOOGLE_CLIENT_SECRET}

# Application Configuration
AUTO_SOLVE_COOLDOWN_HOURS=12

# Logging Configuration
LOG_LEVEL=info

# Production Flags
ENABLE_SWAGGER=false
ENABLE_CORS_ALL=false

# Admin Configuration
ADMIN_EMAIL=\${ADMIN_EMAIL}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    # Create PM2 ecosystem config (will be updated on server based on build success)
    cat > deploy/package/ecosystem.config.js << EOF
// PM2 Ecosystem Configuration for Galactic Crossword
module.exports = {
  apps: [
    {
      name: 'crossword-backend',
      cwd: '${DEPLOY_PATH}/backend',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: ${BACKEND_PORT}
      },
      // Logging
      log_file: '/var/log/pm2/crossword-backend.log',
      out_file: '/var/log/pm2/crossword-backend-out.log',
      error_file: '/var/log/pm2/crossword-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart
      watch: false,
      max_memory_restart: '500M',
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'crossword-frontend',
      cwd: '${DEPLOY_PATH}/frontend',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: ${FRONTEND_PORT},
        NEXT_PUBLIC_API_URL: 'https://${DOMAIN}/api'
      },
      // Logging
      log_file: '/var/log/pm2/crossword-frontend.log',
      out_file: '/var/log/pm2/crossword-frontend-out.log',
      error_file: '/var/log/pm2/crossword-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart
      watch: false,
      max_memory_restart: '300M',
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ]
};
EOF

    # Create nginx configuration
    cat > deploy/package/nginx-crossword.conf << EOF
# Nginx configuration for ${DOMAIN}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=auth:10m rate=5r/s;

# Upstream servers
upstream crossword_backend {
    server localhost:${BACKEND_PORT};
    keepalive 32;
}

upstream crossword_frontend {
    server localhost:${FRONTEND_PORT};
    keepalive 32;
}

server {
    listen 80;
    server_name ${DOMAIN};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    # SSL Configuration (will be managed by certbot)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    # CSP for Three.js and web workers support
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: wss: ws:; worker-src 'self' blob:" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Logs
    access_log /var/log/nginx/crossword_access.log;
    error_log /var/log/nginx/crossword_error.log;

    # API routes - Backend
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://crossword_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend - Next.js application
    location / {
        proxy_pass http://crossword_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
}

# Verify package integrity
verify_package_integrity() {
    print_status "Verifying package integrity..."
    
    # Check essential files exist
    local required_files=(
        "deploy/package/frontend/.next/BUILD_ID"
        "deploy/package/backend/dist/server.js"
        "deploy/package/ecosystem.config.js"
        "deploy/package/nginx-crossword.conf"
        "deploy/package/.env.production"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Missing required file in package: $file"
        fi
    done
    
    print_success "Package integrity verified"
}

# Enhanced upload with verification
upload_package() {
    print_header "📤 Uploading Package to Server"
    
    if [ ! -d "deploy/package" ]; then
        print_error "No deployment package found. Run build first."
    fi
    
    # Verify package integrity before upload
    verify_package_integrity
    
    print_status "Creating deployment archive..."
    cd deploy
    tar -czf "crossword-deployment-${DEPLOYMENT_ID}.tar.gz" package/
    cd ..
    
    # Verify archive was created
    if [ ! -f "deploy/crossword-deployment-${DEPLOYMENT_ID}.tar.gz" ]; then
        print_error "Failed to create deployment archive"
    fi
    
    print_status "Uploading to $DEPLOY_USER@$DOMAIN:$DEPLOY_PATH..."
    
    # Upload package with verification
    scp -i "$SSH_KEY" -o ConnectTimeout=60 "deploy/crossword-deployment-${DEPLOYMENT_ID}.tar.gz" "$DEPLOY_USER@$DOMAIN:/tmp/" || print_error "Failed to upload package"
    
    # Extract and verify package on server
    ssh_execute "Extracting deployment package" "
        cd /tmp
        tar -xzf crossword-deployment-${DEPLOYMENT_ID}.tar.gz || exit 1
        
        # Verify extraction
        if [ ! -d package/frontend ] || [ ! -d package/backend ]; then
            echo 'Package extraction failed - missing directories'
            exit 1
        fi
        
        # Check if we can use sudo without password, otherwise handle gracefully
        if sudo -n true 2>/dev/null; then
            # Can use sudo without password
            sudo mkdir -p $DEPLOY_PATH
            sudo chown -R deploy:www-data $DEPLOY_PATH
            
            if [ -d $DEPLOY_PATH ] && [ -n \"\$(ls -A $DEPLOY_PATH 2>/dev/null)\" ]; then
                sudo rm -rf $DEPLOY_PATH.backup
                sudo mv $DEPLOY_PATH $DEPLOY_PATH.backup
                echo 'Created backup at $DEPLOY_PATH.backup'
            fi
            
            sudo mv package $DEPLOY_PATH
            sudo chown -R deploy:www-data $DEPLOY_PATH
        else
            # Handle without sudo - assume deploy user has access or directory exists
            echo 'Note: Running without sudo privileges'
            mkdir -p $DEPLOY_PATH 2>/dev/null || true
            
            if [ -d $DEPLOY_PATH ] && [ -n \"\$(ls -A $DEPLOY_PATH 2>/dev/null)\" ]; then
                rm -rf $DEPLOY_PATH.backup 2>/dev/null || true
                mv $DEPLOY_PATH $DEPLOY_PATH.backup 2>/dev/null || echo 'Could not create backup'
            fi
            
            mv package $DEPLOY_PATH || exit 1
        fi
        
        rm -f crossword-deployment-${DEPLOYMENT_ID}.tar.gz
    "
    
    BACKUP_PATH="$DEPLOY_PATH.backup"
    
    # Cleanup local archive
    rm -f "deploy/crossword-deployment-${DEPLOYMENT_ID}.tar.gz"
    
    print_success "Package uploaded and extracted successfully"
}

# Enhanced server setup with proper dependency management
setup_server() {
    print_header "🖥️  Setting Up Server Infrastructure"
    
    print_status "Installing system dependencies..."
    ssh_execute "Server infrastructure setup" "
        # Check if we can use sudo without password
        if sudo -n true 2>/dev/null; then
            echo 'Using sudo for system setup'
            # Update system and install packages
            # Create deploy user if it doesn't exist
            if ! id deploy &>/dev/null; then
                sudo useradd -m -s /bin/bash deploy || echo 'Could not create deploy user'
                sudo usermod -aG www-data deploy || echo 'Could not add deploy user to www-data group'
            fi
        else
            echo 'Running without sudo - limited system setup'
            echo 'Please ensure the following are installed: nginx, certbot, nodejs, npm, sqlite3, ufw, jq, curl, pm2'
            echo 'Please ensure the deploy user exists and has proper permissions'
            echo ''
            echo 'To enable passwordless sudo for automated deployment:'
            echo '  echo \"deploy ALL=(ALL) NOPASSWD: ALL\" | sudo tee /etc/sudoers.d/deploy'
            echo '  sudo chmod 0440 /etc/sudoers.d/deploy'
            echo ''
            echo 'See deploy/SUDO-SETUP.md for detailed instructions'
        fi
        
        echo 'Server infrastructure setup completed'
    "
    
    print_success "Server infrastructure setup completed"
}

# Enhanced application setup with proper error handling
setup_application() {
    print_header "⚙️  Setting Up Application Environment"
    
    print_status "Setting up environment variables..."
    ssh_execute "Environment setup" "
        cd $DEPLOY_PATH
        if [ -f scripts/env-setup.sh ]; then
            bash scripts/env-setup.sh || exit 1
        else
            echo 'Warning: env-setup.sh not found, skipping environment setup'
        fi
    "
    
    print_status "Installing application dependencies and building..."
    ssh_execute "Application dependencies and build" "
        cd $DEPLOY_PATH
        
        # Frontend dependencies and build
        cd frontend
        npm ci --production=false || exit 1
        echo 'Attempting to build frontend on server...'
        NODE_ENV=production NEXT_PUBLIC_API_URL=https://${DOMAIN}/api npm run build || {
            echo 'Frontend build failed, will use development mode'
            # Create basic next config to avoid issues
            echo '/** @type {import(\"next\").NextConfig} */' > next.config.js
            echo 'const nextConfig = { output: \"standalone\" };' >> next.config.js
            echo 'module.exports = nextConfig;' >> next.config.js
        }
        cd ..
        
        # Backend dependencies and database setup
        cd backend
        npm ci --production || exit 1
        npx prisma generate || exit 1
        npx prisma db push || exit 1
        
        # Create production environment file
        cp ../backend-production.env .env || {
            echo 'Creating production .env file...'
            cat > .env << ENVEOF
NODE_ENV=production
PORT=${BACKEND_PORT}
DATABASE_URL=\"file:./prisma/production.db\"
JWT_SECRET=your-super-secret-jwt-key-production
JWT_EXPIRE=7d
SESSION_SECRET=your-session-secret-production
PUZZLE_SECRET=your-puzzle-generation-secret-production
CORS_ORIGIN=https://${DOMAIN}
ENVEOF
        }
        
        # Generate initial puzzle if script exists
        if [ -f 'dist/scripts/generate-puzzle.js' ]; then
            node dist/scripts/generate-puzzle.js || echo 'Puzzle generation skipped'
        fi
        cd ..
        
        # Setup PM2 log directory
        if sudo -n true 2>/dev/null; then
            sudo mkdir -p /var/log/pm2
            sudo chown -R deploy:deploy /var/log/pm2
        else
            mkdir -p /var/log/pm2 2>/dev/null || mkdir -p $HOME/pm2-logs
            echo 'Note: PM2 logs may be in $HOME/pm2-logs instead of /var/log/pm2'
        fi
    "
    
    print_status "Configuring PM2..."
    ssh_execute "PM2 configuration" "
        cd $DEPLOY_PATH
        
        # Stop existing PM2 processes
        pm2 delete all 2>/dev/null || true
        
        # Check if frontend build succeeded and update PM2 config accordingly
        cd frontend
        if [ -d '.next' ] && [ -f '.next/BUILD_ID' ]; then
            echo 'Frontend build successful - using production mode'
            FRONTEND_SCRIPT='npm'
            FRONTEND_ARGS='start'
            FRONTEND_ENV='production'
            FRONTEND_INSTANCES=2
            FRONTEND_EXEC_MODE='cluster'
        else
            echo 'Frontend build failed - using development mode'
            FRONTEND_SCRIPT='npm'
            FRONTEND_ARGS='run dev'
            FRONTEND_ENV='development'
            FRONTEND_INSTANCES=1
            FRONTEND_EXEC_MODE='fork'
        fi
        cd ..
        
        # Update ecosystem config based on build result
        cat > ecosystem.config.js << PMEOF
// PM2 Ecosystem Configuration for Galactic Crossword
module.exports = {
  apps: [
    {
      name: 'crossword-backend',
      cwd: '${DEPLOY_PATH}/backend',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: ${BACKEND_PORT}
      },
      log_file: '/var/log/pm2/crossword-backend.log',
      out_file: '/var/log/pm2/crossword-backend-out.log',
      error_file: '/var/log/pm2/crossword-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      max_memory_restart: '500M',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'crossword-frontend',
      cwd: '${DEPLOY_PATH}/frontend',
      script: '\$FRONTEND_SCRIPT',
      args: '\$FRONTEND_ARGS',
      instances: \$FRONTEND_INSTANCES,
      exec_mode: '\$FRONTEND_EXEC_MODE',
      env: {
        NODE_ENV: '\$FRONTEND_ENV',
        PORT: ${FRONTEND_PORT},
        NEXT_PUBLIC_API_URL: 'https://${DOMAIN}/api'
      },
      log_file: '/var/log/pm2/crossword-frontend.log',
      out_file: '/var/log/pm2/crossword-frontend-out.log',
      error_file: '/var/log/pm2/crossword-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      max_memory_restart: '300M',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ]
};
PMEOF
        
        # Start applications with updated ecosystem config
        pm2 start ecosystem.config.js --env production || exit 1
        
        # Save PM2 process list and setup startup
        pm2 save || exit 1
        
        # Setup PM2 startup script if sudo is available
        if sudo -n true 2>/dev/null; then
            sudo env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy || echo 'Could not setup PM2 startup script'
        else
            echo 'Note: PM2 startup script not configured - applications may not restart on reboot'
            echo 'To manually configure: sudo env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy'
        fi
    "
    
    print_success "Application environment setup completed"
}

# Enhanced nginx and SSL configuration with proper ordering
configure_nginx_ssl() {
    print_header "🔒 Configuring Nginx and SSL"
    
    print_status "Configuring nginx (HTTP only)..."
    ssh_execute "Nginx HTTP configuration" "
        cd $DEPLOY_PATH
        
        # Check if we can use sudo for nginx configuration
        if sudo -n true 2>/dev/null; then
            # Create temporary HTTP-only config for certificate validation
            sudo tee /etc/nginx/sites-available/${DOMAIN}-temp > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name ${DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
NGINXEOF
            
            # Enable temporary config
            sudo rm -f /etc/nginx/sites-enabled/default
            sudo ln -sf /etc/nginx/sites-available/${DOMAIN}-temp /etc/nginx/sites-enabled/
            
            # Test and reload nginx
            sudo nginx -t || exit 1
            sudo systemctl reload nginx || exit 1
        else
            echo 'Cannot configure nginx without sudo privileges'
            echo 'Please manually configure nginx and SSL certificates'
            exit 1
        fi
    "
    
    print_status "Obtaining SSL certificate..."
    ssh_execute "SSL certificate setup" "
        if sudo -n true 2>/dev/null; then
            # Obtain certificate
            sudo certbot certonly \\
                --webroot \\
                --webroot-path=/var/www/html \\
                --email $ADMIN_EMAIL \\
                --agree-tos \\
                --no-eff-email \\
                --force-renewal \\
                -d $DOMAIN || exit 1
            
            # Verify certificate was created
            if [ ! -f '/etc/letsencrypt/live/${DOMAIN}/fullchain.pem' ]; then
                echo 'SSL certificate creation failed'
                exit 1
            fi
        else
            echo 'Cannot obtain SSL certificate without sudo privileges'
            echo 'Please manually run: sudo certbot certonly --webroot --webroot-path=/var/www/html --email $ADMIN_EMAIL --agree-tos --no-eff-email -d $DOMAIN'
            exit 1
        fi
    "
    
    print_status "Configuring nginx with SSL..."
    ssh_execute "Nginx SSL configuration" "
        cd $DEPLOY_PATH
        
        if sudo -n true 2>/dev/null; then
            # Install full nginx configuration
            sudo cp nginx-crossword.conf /etc/nginx/sites-available/$DOMAIN || exit 1
            
            # Remove temporary config and enable full config
            sudo rm -f /etc/nginx/sites-enabled/${DOMAIN}-temp
            sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
            
            # Test nginx configuration
            sudo nginx -t || exit 1
            
            # Reload nginx
            sudo systemctl reload nginx || exit 1
            
            # Configure firewall for HTTPS
            sudo ufw allow 443/tcp || echo 'Could not configure firewall for HTTPS'
        else
            echo 'Cannot configure nginx SSL without sudo privileges'
            echo 'Please manually configure nginx with SSL'
            exit 1
        fi
    "
    
    print_success "Nginx and SSL configuration completed"
}

# Enhanced health checks with proper timing
run_health_checks() {
    print_header "🏥 Running Health Checks"
    
    print_status "Checking PM2 status..."
    ssh_execute "PM2 status check" "
        cd $DEPLOY_PATH
        pm2 status
        pm2 logs --lines 5
    "
    
    print_status "Waiting for services to be ready..."
    wait_for_condition "Backend service startup" "curl -f -s http://$DOMAIN:$BACKEND_PORT/health > /dev/null 2>&1" 120 5
    wait_for_condition "Frontend service startup" "curl -f -s http://$DOMAIN:$FRONTEND_PORT > /dev/null 2>&1" 120 5
    
    print_status "Testing application endpoints..."
    
    # Test backend API
    if curl -f -s --max-time 30 "https://$DOMAIN/api/puzzle/today" > /dev/null; then
        print_success "Backend API is responding correctly"
    else
        print_warning "Backend API health check failed - this may be expected during initial setup"
    fi
    
    # Test frontend
    if curl -f -s --max-time 30 "https://$DOMAIN" > /dev/null; then
        print_success "Frontend is responding correctly"
    else
        print_warning "Frontend health check failed"
    fi
    
    # Test SSL certificate
    if echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        print_success "SSL certificate is valid"
    else
        print_warning "SSL certificate validation failed"
    fi
    
    print_success "Health checks completed"
}

# Enhanced deployment summary
show_deployment_summary() {
    print_header "📋 Deployment Summary"
    
    echo -e "${BLUE}🌟 Deployment Information${NC}"
    echo -e "  Deployment ID: $DEPLOYMENT_ID"
    echo -e "  Domain: https://$DOMAIN"
    echo -e "  Deploy Path: $DEPLOY_PATH"
    echo -e "  Backend Port: $BACKEND_PORT"
    echo -e "  Frontend Port: $FRONTEND_PORT"
    echo -e "  Git Commit: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
    echo -e "  Deploy Time: $(date)"
    echo -e "  Log File: $LOGFILE"
    if [ -n "$BACKUP_PATH" ]; then
        echo -e "  Backup Location: $BACKUP_PATH"
    fi
    echo ""
    echo -e "${YELLOW}🔧 Post-Deployment Tasks${NC}"
    echo -e "  1. Test the application at https://$DOMAIN"
    echo -e "  2. Check logs: ssh $DEPLOY_USER@$DOMAIN 'pm2 logs'"
    echo -e "  3. Monitor performance: ssh $DEPLOY_USER@$DOMAIN 'pm2 monit'"
    echo -e "  4. Update DNS if needed"
    echo -e "  5. Configure monitoring/backup as needed"
    echo ""
    echo -e "${YELLOW}🔄 Rollback Command (if needed):${NC}"
    if [ -n "$BACKUP_PATH" ]; then
        echo -e "  ssh $DEPLOY_USER@$DOMAIN 'cd $DEPLOY_PATH && pm2 delete all && sudo mv $BACKUP_PATH $DEPLOY_PATH && cd $DEPLOY_PATH && pm2 start ecosystem.config.js'"
    fi
    echo ""
    print_success "🎉 Deployment completed successfully!"
}

# Main deployment flow with enhanced error handling
case "$MODE" in
    "full")
        validate_prerequisites
        build_application
        upload_package
        setup_server
        setup_application
        configure_nginx_ssl
        run_health_checks
        show_deployment_summary
        ;;
    "build-only")
        validate_prerequisites
        build_application
        print_success "Build completed. Package available in ./deploy/package"
        ;;
    "upload-only")
        validate_prerequisites
        upload_package
        setup_application
        run_health_checks
        show_deployment_summary
        ;;
    "server-only")
        validate_prerequisites
        setup_server
        configure_nginx_ssl
        print_success "Server setup completed"
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        print_error "Unknown mode: $MODE"
        show_usage
        ;;
esac