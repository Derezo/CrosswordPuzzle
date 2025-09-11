#!/bin/bash
# Database utility commands

case "$1" in
    "reset")
        echo "🗄️ Resetting database..."
        cd backend
        npx prisma db push --force-reset
        npx ts-node scripts/seed.ts
        ./regenerate-puzzle.sh
        ;;
    "studio")
        echo "🎨 Opening Prisma Studio..."
        cd backend
        npx prisma studio
        ;;
    "migrate")
        echo "🔄 Running database migration..."
        ./scripts/db-migrate.sh deploy
        ;;
    "migration-status")
        echo "📊 Checking migration status..."
        ./scripts/db-migrate.sh status
        ;;
    "generate")
        echo "⚙️ Generating Prisma client..."
        cd backend
        npx prisma generate
        ;;
    "backup")
        echo "💾 Creating database backup..."
        ./scripts/db-backup.sh create "manual_$(date +%Y%m%d_%H%M%S)"
        ;;
    "list-backups")
        echo "📋 Listing database backups..."
        ./scripts/db-backup.sh list
        ;;
    *)
        echo "Database utilities:"
        echo "  ./scripts/db-utils.sh reset            - Reset database and reseed"
        echo "  ./scripts/db-utils.sh studio           - Open Prisma Studio"
        echo "  ./scripts/db-utils.sh migrate          - Run migrations"
        echo "  ./scripts/db-utils.sh migration-status - Check migration status"
        echo "  ./scripts/db-utils.sh generate         - Generate Prisma client"
        echo "  ./scripts/db-utils.sh backup           - Create database backup"
        echo "  ./scripts/db-utils.sh list-backups     - List all backups"
        ;;
esac
