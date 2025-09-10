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
        echo "🔄 Running database migrations..."
        cd backend
        npx prisma migrate dev
        ;;
    "generate")
        echo "⚙️ Generating Prisma client..."
        cd backend
        npx prisma generate
        ;;
    "backup")
        echo "💾 Creating database backup..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        mkdir -p backups
        cp backend/prisma/dev.db "backups/backup_${timestamp}.db"
        echo "✅ Backup created: backups/backup_${timestamp}.db"
        ;;
    *)
        echo "Database utilities:"
        echo "  ./scripts/db-utils.sh reset    - Reset database and reseed"
        echo "  ./scripts/db-utils.sh studio   - Open Prisma Studio"
        echo "  ./scripts/db-utils.sh migrate  - Run migrations"
        echo "  ./scripts/db-utils.sh generate - Generate Prisma client"
        echo "  ./scripts/db-utils.sh backup   - Create database backup"
        ;;
esac
