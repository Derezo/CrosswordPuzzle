#!/bin/bash

# Production Deployment Script
# This script handles production deployment with zero-downtime and rollback capabilities

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="/opt/galactic-crossword"
BACKUP_DIR="/opt/backups/galactic-crossword"
LOG_FILE="/var/log/galactic-crossword-deploy.log"
SERVICE_NAME="galactic-crossword"

# Function to log messages
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to create backup
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log "${YELLOW}📦 Creating backup: $backup_name${NC}"
    
    mkdir -p "$backup_path"
    
    # Backup application files
    if [[ -d "$DEPLOYMENT_DIR" ]]; then
        cp -r "$DEPLOYMENT_DIR" "$backup_path/app"
    fi
    
    # Backup database
    if [[ -f "$DEPLOYMENT_DIR/backend/prisma/dev.db" ]]; then
        cp "$DEPLOYMENT_DIR/backend/prisma/dev.db" "$backup_path/database.db"
    fi
    
    # Create backup manifest
    cat > "$backup_path/manifest.json" << EOF
{
  "backup_name": "$backup_name",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
  "deployment_dir": "$DEPLOYMENT_DIR"
}
EOF
    
    # Cleanup old backups (keep last 10)
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | sort -r | tail -n +11 | xargs -r rm -rf
    
    log "${GREEN}✅ Backup created: $backup_path${NC}"
    echo "$backup_path"
}

# Function to deploy application
deploy_application() {
    log "${PURPLE}🚀 Starting production deployment...${NC}"
    
    # Verify we're on the correct branch and have latest changes
    if git status --porcelain | grep -q .; then
        log "${RED}❌ Working directory is not clean. Please commit or stash changes.${NC}"
        exit 1
    fi
    
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" ]]; then
        log "${YELLOW}⚠️  Warning: Deploying from branch '$current_branch' instead of 'main'${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "${YELLOW}Deployment cancelled${NC}"
            exit 0
        fi
    fi
    
    # Pull latest changes
    log "${YELLOW}📥 Pulling latest changes...${NC}"
    git pull origin "$current_branch"
    
    # Create deployment backup
    local backup_path=$(create_backup)
    
    # Create temporary deployment directory
    local temp_dir="/tmp/galactic-crossword-deploy-$(date +%s)"
    mkdir -p "$temp_dir"
    
    log "${YELLOW}📋 Copying files to temporary directory...${NC}"
    cp -r . "$temp_dir/"
    cd "$temp_dir"
    
    # Load production environment
    if [[ -f ".env.production" ]]; then
        log "${YELLOW}⚙️  Loading production environment...${NC}"
        export $(grep -v '^#' .env.production | xargs)
    else
        log "${RED}❌ Production environment file not found${NC}"
        exit 1
    fi
    
    # Install and build backend
    log "${YELLOW}🔧 Building backend...${NC}"
    cd backend
    pnpm install --frozen-lockfile --production
    npx prisma generate
    pnpm run build
    
    # Install and build frontend
    log "${YELLOW}🎨 Building frontend...${NC}"
    cd ../frontend
    pnpm install --frozen-lockfile --production
    pnpm run build
    
    cd ..
    
    # Run pre-deployment tests
    log "${YELLOW}🧪 Running pre-deployment tests...${NC}"
    cd backend
    npm test || {
        log "${RED}❌ Tests failed. Deployment cancelled.${NC}"
        cleanup_temp "$temp_dir"
        exit 1
    }
    cd ..
    
    # Stop services gracefully
    log "${YELLOW}⏸️  Stopping services...${NC}"
    systemctl stop "$SERVICE_NAME-frontend" || true
    systemctl stop "$SERVICE_NAME-backend" || true
    
    # Wait for services to stop
    sleep 5
    
    # Deploy new version
    log "${YELLOW}📦 Deploying new version...${NC}"
    if [[ -d "$DEPLOYMENT_DIR" ]]; then
        rm -rf "$DEPLOYMENT_DIR.old"
        mv "$DEPLOYMENT_DIR" "$DEPLOYMENT_DIR.old"
    fi
    
    mkdir -p "$DEPLOYMENT_DIR"
    cp -r "$temp_dir"/* "$DEPLOYMENT_DIR/"
    
    # Update file permissions
    chown -R galactic-crossword:galactic-crossword "$DEPLOYMENT_DIR"
    chmod -R 755 "$DEPLOYMENT_DIR"
    
    # Run database migrations
    log "${YELLOW}🗄️  Running database migrations...${NC}"
    cd "$DEPLOYMENT_DIR/backend"
    npx prisma migrate deploy
    
    # Start services
    log "${YELLOW}▶️  Starting services...${NC}"
    systemctl start "$SERVICE_NAME-backend"
    systemctl start "$SERVICE_NAME-frontend"
    
    # Wait for services to start
    sleep 10
    
    # Health check
    log "${YELLOW}🔍 Running health checks...${NC}"
    local health_check_passed=false
    
    for i in {1..5}; do
        if curl -f -s "http://localhost:5000/api/puzzle/today" > /dev/null; then
            log "${GREEN}✅ Backend health check passed${NC}"
            health_check_passed=true
            break
        fi
        log "${YELLOW}⏳ Waiting for backend to be ready... ($i/5)${NC}"
        sleep 10
    done
    
    if [[ "$health_check_passed" != true ]]; then
        log "${RED}❌ Backend health check failed. Rolling back...${NC}"
        rollback_deployment "$backup_path"
        exit 1
    fi
    
    # Frontend health check
    for i in {1..5}; do
        if curl -f -s "http://localhost:3000" > /dev/null; then
            log "${GREEN}✅ Frontend health check passed${NC}"
            break
        fi
        log "${YELLOW}⏳ Waiting for frontend to be ready... ($i/5)${NC}"
        sleep 10
    done
    
    # Cleanup
    cleanup_temp "$temp_dir"
    rm -rf "$DEPLOYMENT_DIR.old"
    
    log "${GREEN}🎉 Deployment completed successfully!${NC}"
    log "${BLUE}Deployment info:${NC}"
    log "  Commit: $(git rev-parse HEAD)"
    log "  Branch: $current_branch"
    log "  Backup: $backup_path"
    log "  Time: $(date)"
}

# Function to rollback deployment
rollback_deployment() {
    local backup_path="$1"
    
    log "${YELLOW}🔄 Rolling back to previous version...${NC}"
    
    # Stop services
    systemctl stop "$SERVICE_NAME-frontend" || true
    systemctl stop "$SERVICE_NAME-backend" || true
    
    # Restore from backup
    if [[ -d "$backup_path/app" ]]; then
        rm -rf "$DEPLOYMENT_DIR"
        cp -r "$backup_path/app" "$DEPLOYMENT_DIR"
        chown -R galactic-crossword:galactic-crossword "$DEPLOYMENT_DIR"
    fi
    
    # Restore database
    if [[ -f "$backup_path/database.db" ]]; then
        cp "$backup_path/database.db" "$DEPLOYMENT_DIR/backend/prisma/dev.db"
    fi
    
    # Start services
    systemctl start "$SERVICE_NAME-backend"
    systemctl start "$SERVICE_NAME-frontend"
    
    log "${GREEN}✅ Rollback completed${NC}"
}

# Function to cleanup temporary directory
cleanup_temp() {
    local temp_dir="$1"
    if [[ -d "$temp_dir" ]]; then
        rm -rf "$temp_dir"
    fi
}

# Function to show usage
show_usage() {
    echo "Production Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy           Deploy current branch to production"
    echo "  rollback [name]  Rollback to specific backup"
    echo "  status           Show deployment status"
    echo "  logs             Show deployment logs"
    echo "  backups          List available backups"
    echo "  help             Show this help message"
}

# Function to show status
show_status() {
    log "${BLUE}📊 Deployment Status${NC}"
    
    if systemctl is-active --quiet "$SERVICE_NAME-backend"; then
        log "${GREEN}✅ Backend: Running${NC}"
    else
        log "${RED}❌ Backend: Stopped${NC}"
    fi
    
    if systemctl is-active --quiet "$SERVICE_NAME-frontend"; then
        log "${GREEN}✅ Frontend: Running${NC}"
    else
        log "${RED}❌ Frontend: Stopped${NC}"
    fi
    
    if [[ -d "$DEPLOYMENT_DIR" ]]; then
        local commit=$(cd "$DEPLOYMENT_DIR" && git rev-parse HEAD 2>/dev/null || echo 'unknown')
        log "${BLUE}Current version: $commit${NC}"
    fi
}

# Function to list backups
list_backups() {
    log "${BLUE}📦 Available Backups${NC}"
    
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | sort -r | while read -r backup; do
            local name=$(basename "$backup")
            local manifest="$backup/manifest.json"
            
            if [[ -f "$manifest" ]]; then
                local timestamp=$(jq -r '.timestamp' "$manifest" 2>/dev/null || echo 'unknown')
                local commit=$(jq -r '.git_commit' "$manifest" 2>/dev/null || echo 'unknown')
                log "  $name (${timestamp}, commit: ${commit:0:8})"
            else
                log "  $name"
            fi
        done
    else
        log "${YELLOW}No backups found${NC}"
    fi
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy_application
        ;;
    "rollback")
        if [[ -n "$2" ]]; then
            rollback_deployment "$BACKUP_DIR/$2"
        else
            log "${RED}❌ Please specify backup name${NC}"
            list_backups
            exit 1
        fi
        ;;
    "status")
        show_status
        ;;
    "logs")
        tail -f "$LOG_FILE"
        ;;
    "backups")
        list_backups
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        log "${RED}❌ Unknown command: $1${NC}"
        show_usage
        exit 1
        ;;
esac