#!/bin/bash

# Database Migration Utility Script
# This script provides safe database migration operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure we're in the backend directory
cd "$(dirname "$0")/../backend" || exit 1

show_help() {
    echo "Database Migration Utility"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create [name]    Create a new migration"
    echo "  deploy          Deploy pending migrations"
    echo "  status          Show migration status"
    echo "  reset           Reset database (DANGER: will lose all data)"
    echo "  rollback        Rollback last migration"
    echo "  backup          Create database backup before migration"
    echo ""
    echo "Examples:"
    echo "  $0 create add_user_preferences"
    echo "  $0 deploy"
    echo "  $0 status"
}

resolve_db_path() {
    # Resolve the SQLite DB path from DATABASE_URL (file:...). Prisma resolves
    # relative paths against the directory containing schema.prisma (prisma/),
    # so a URL like "file:./prisma/dev.db" lives at prisma/prisma/dev.db from
    # the backend root. Fall back to the documented default if DATABASE_URL is
    # missing or non-file.
    local url
    if [[ -f .env ]]; then
        url=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
        url=${url%\"}
        url=${url#\"}
        url=${url%\'}
        url=${url#\'}
    fi
    if [[ -z "$url" || "$url" != file:* ]]; then
        echo "prisma/prisma/dev.db"
        return
    fi
    local path=${url#file:}
    if [[ "$path" = /* ]]; then
        echo "$path"
    else
        # Strip leading ./ for cleanliness, then resolve relative to prisma/.
        path=${path#./}
        echo "prisma/$path"
    fi
}

create_backup() {
    local db_path
    db_path=$(resolve_db_path)
    if [[ ! -f "$db_path" ]]; then
        echo -e "${YELLOW}⚠️  No existing database at $db_path — skipping backup (fresh setup).${NC}"
        return
    fi
    local backup_name="migration_backup_$(date +%Y%m%d_%H%M%S).db"
    mkdir -p backups
    cp "$db_path" "backups/$backup_name"
    echo -e "${GREEN}✅ Database backed up to: backups/$backup_name${NC}"
}

create_migration() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}❌ Error: Migration name is required${NC}"
        echo "Usage: $0 create [migration_name]"
        exit 1
    fi
    
    echo -e "${BLUE}🔧 Creating migration: $name${NC}"
    create_backup
    npx prisma migrate dev --name "$name"
    echo -e "${GREEN}✅ Migration '$name' created successfully${NC}"
}

deploy_migrations() {
    echo -e "${BLUE}🚀 Deploying pending migrations...${NC}"
    create_backup
    npx prisma migrate deploy
    echo -e "${GREEN}✅ All migrations deployed successfully${NC}"
}

show_status() {
    echo -e "${BLUE}📊 Migration Status:${NC}"
    npx prisma migrate status
}

reset_database() {
    echo -e "${RED}⚠️  WARNING: This will delete all data in the database!${NC}"
    echo -e "${YELLOW}Are you sure you want to continue? (yes/no)${NC}"
    read -r confirmation
    
    if [[ "$confirmation" == "yes" ]]; then
        echo -e "${BLUE}🔄 Resetting database...${NC}"
        create_backup
        npx prisma migrate reset --force
        echo -e "${GREEN}✅ Database reset completed${NC}"
    else
        echo -e "${YELLOW}Operation cancelled${NC}"
    fi
}

rollback_migration() {
    echo -e "${RED}⚠️  Rolling back last migration${NC}"
    echo -e "${YELLOW}Note: This will require manual intervention for SQLite${NC}"

    # For SQLite, we need to restore from backup
    local latest_backup
    latest_backup=$(ls -t backups/*.db 2>/dev/null | head -1)
    if [[ -n "$latest_backup" ]]; then
        local db_path
        db_path=$(resolve_db_path)
        echo -e "${YELLOW}Restoring $db_path from latest backup: $latest_backup${NC}"
        cp "$latest_backup" "$db_path"
        echo -e "${GREEN}✅ Database restored from backup${NC}"
    else
        echo -e "${RED}❌ No backup found for rollback${NC}"
        exit 1
    fi
}

case "${1:-}" in
    "create")
        create_migration "$2"
        ;;
    "deploy")
        deploy_migrations
        ;;
    "status")
        show_status
        ;;
    "reset")
        reset_database
        ;;
    "rollback")
        rollback_migration
        ;;
    "backup")
        create_backup
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: ${1:-}${NC}"
        show_help
        exit 1
        ;;
esac