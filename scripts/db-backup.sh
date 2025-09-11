#!/bin/bash

# Automated Database Backup System
# Supports scheduled backups, rotation, and restore operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_DIR="$(dirname "$0")/../backend"
BACKUP_DIR="$BACKEND_DIR/backups"
DATABASE_FILE="$BACKEND_DIR/prisma/dev.db"
MAX_BACKUPS=30  # Keep last 30 backups
COMPRESSION=true

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
cd "$BACKEND_DIR" || exit 1

show_help() {
    echo "Database Backup System"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create [name]      Create a backup with optional name"
    echo "  list              List all backups"
    echo "  restore [file]    Restore from specific backup"
    echo "  cleanup           Remove old backups (keeps last $MAX_BACKUPS)"
    echo "  auto              Create automatic backup (for cron)"
    echo "  schedule          Set up automatic backups via cron"
    echo ""
    echo "Examples:"
    echo "  $0 create pre_migration"
    echo "  $0 restore backup_20250910_133000.db.gz"
    echo "  $0 list"
    echo "  $0 cleanup"
}

create_backup() {
    local name="${1:-$(date +%Y%m%d_%H%M%S)}"
    local backup_file="backup_${name}.db"
    local backup_path="$BACKUP_DIR/$backup_file"
    
    if [[ ! -f "$DATABASE_FILE" ]]; then
        echo -e "${RED}❌ Database file not found: $DATABASE_FILE${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}📦 Creating backup: $backup_file${NC}"
    
    # Copy database file
    cp "$DATABASE_FILE" "$backup_path"
    
    # Compress if enabled
    if [[ "$COMPRESSION" == true ]]; then
        gzip "$backup_path"
        backup_file="$backup_file.gz"
        backup_path="$backup_path.gz"
    fi
    
    # Get file size for reporting
    local size=$(du -h "$backup_path" | cut -f1)
    
    echo -e "${GREEN}✅ Backup created: $backup_file (${size})${NC}"
    
    # Create metadata file
    cat > "${backup_path}.meta" << EOF
{
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database_file": "$DATABASE_FILE",
  "backup_name": "$name",
  "compressed": $COMPRESSION,
  "size": "$size",
  "checksum": "$(md5sum "$backup_path" | cut -d' ' -f1)"
}
EOF
    
    echo -e "${BLUE}📄 Metadata saved: ${backup_file}.meta${NC}"
}

list_backups() {
    echo -e "${BLUE}📋 Available Backups:${NC}"
    echo ""
    
    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null | grep -E '\.db(\.gz)?$')" ]]; then
        echo -e "${YELLOW}No backups found${NC}"
        return
    fi
    
    printf "%-30s %-12s %-20s %s\n" "BACKUP FILE" "SIZE" "CREATED" "CHECKSUM"
    printf "%-30s %-12s %-20s %s\n" "----------" "----" "-------" "--------"
    
    for backup in "$BACKUP_DIR"/backup_*.db* "$BACKUP_DIR"/backup_*.db.gz*; do
        if [[ -f "$backup" && ! "$backup" =~ \.meta$ ]]; then
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local created="N/A"
            local checksum="N/A"
            
            # Try to read metadata
            if [[ -f "${backup}.meta" ]]; then
                created=$(grep '"created"' "${backup}.meta" | cut -d'"' -f4 | cut -dT -f1 2>/dev/null || echo "N/A")
                checksum=$(grep '"checksum"' "${backup}.meta" | cut -d'"' -f4 | cut -c1-8 2>/dev/null || echo "N/A")
            fi
            
            printf "%-30s %-12s %-20s %s\n" "$filename" "$size" "$created" "$checksum"
        fi
    done
}

restore_backup() {
    local backup_name="$1"
    
    if [[ -z "$backup_name" ]]; then
        echo -e "${RED}❌ Backup filename required${NC}"
        echo "Usage: $0 restore [backup_file]"
        list_backups
        exit 1
    fi
    
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [[ ! -f "$backup_path" ]]; then
        echo -e "${RED}❌ Backup file not found: $backup_path${NC}"
        list_backups
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  This will replace the current database!${NC}"
    echo -e "${YELLOW}Current database will be backed up first.${NC}"
    echo -e "${YELLOW}Continue? (yes/no)${NC}"
    read -r confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        echo -e "${YELLOW}Operation cancelled${NC}"
        exit 0
    fi
    
    # Backup current database first
    echo -e "${BLUE}📦 Backing up current database...${NC}"
    create_backup "pre_restore_$(date +%Y%m%d_%H%M%S)"
    
    # Restore from backup
    echo -e "${BLUE}🔄 Restoring from backup: $backup_name${NC}"
    
    if [[ "$backup_name" =~ \.gz$ ]]; then
        # Compressed backup
        gunzip -c "$backup_path" > "$DATABASE_FILE"
    else
        # Uncompressed backup
        cp "$backup_path" "$DATABASE_FILE"
    fi
    
    echo -e "${GREEN}✅ Database restored successfully${NC}"
    
    # Verify integrity
    if command -v sqlite3 &> /dev/null; then
        echo -e "${BLUE}🔍 Verifying database integrity...${NC}"
        if sqlite3 "$DATABASE_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
            echo -e "${GREEN}✅ Database integrity verified${NC}"
        else
            echo -e "${RED}⚠️  Database integrity check failed${NC}"
        fi
    fi
}

cleanup_backups() {
    echo -e "${BLUE}🧹 Cleaning up old backups (keeping last $MAX_BACKUPS)...${NC}"
    
    local backup_files=($(ls -t "$BACKUP_DIR"/backup_*.db* "$BACKUP_DIR"/backup_*.db.gz* 2>/dev/null | grep -v '\.meta$' | head -n $MAX_BACKUPS))
    local all_files=($(ls "$BACKUP_DIR"/backup_*.db* "$BACKUP_DIR"/backup_*.db.gz* 2>/dev/null | grep -v '\.meta$'))
    
    local removed=0
    for file in "${all_files[@]}"; do
        local should_keep=false
        for keep_file in "${backup_files[@]}"; do
            if [[ "$file" == "$keep_file" ]]; then
                should_keep=true
                break
            fi
        done
        
        if [[ "$should_keep" == false ]]; then
            rm -f "$file" "${file}.meta"
            echo -e "${YELLOW}🗑️  Removed: $(basename "$file")${NC}"
            ((removed++))
        fi
    done
    
    if [[ $removed -eq 0 ]]; then
        echo -e "${GREEN}✅ No old backups to remove${NC}"
    else
        echo -e "${GREEN}✅ Removed $removed old backup(s)${NC}"
    fi
}

auto_backup() {
    echo -e "${BLUE}🤖 Creating automatic backup...${NC}"
    create_backup "auto_$(date +%Y%m%d_%H%M%S)"
    cleanup_backups
}

schedule_backups() {
    echo -e "${BLUE}⏰ Setting up automatic backup schedule...${NC}"
    
    local script_path="$(realpath "$0")"
    local cron_job="0 2 * * * $script_path auto >> $BACKUP_DIR/backup.log 2>&1"
    
    echo -e "${YELLOW}Adding cron job for daily backups at 2:00 AM:${NC}"
    echo "$cron_job"
    echo ""
    echo -e "${YELLOW}Add this line to your crontab? (yes/no)${NC}"
    read -r confirmation
    
    if [[ "$confirmation" == "yes" ]]; then
        (crontab -l 2>/dev/null | grep -v "$script_path auto"; echo "$cron_job") | crontab -
        echo -e "${GREEN}✅ Cron job added successfully${NC}"
        echo -e "${BLUE}📋 Current crontab:${NC}"
        crontab -l | grep "$script_path" || true
    else
        echo -e "${YELLOW}Manual setup required. Add the following to your crontab:${NC}"
        echo "$cron_job"
    fi
}

case "${1:-}" in
    "create")
        create_backup "$2"
        ;;
    "list")
        list_backups
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "cleanup")
        cleanup_backups
        ;;
    "auto")
        auto_backup
        ;;
    "schedule")
        schedule_backups
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