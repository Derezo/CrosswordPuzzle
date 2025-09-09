#!/bin/bash

# Database Setup and Migration Script
# Usage: ./setup-database.sh [environment]
# Example: ./setup-database.sh production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment setup
ENVIRONMENT=${1:-development}
ENV_FILE=".env.${ENVIRONMENT}"

echo -e "${BLUE}🗄️  Database Setup Script${NC}"
echo -e "${BLUE}=========================${NC}"
echo "Environment: $ENVIRONMENT"
echo ""

# Check if we're in the backend directory
if [[ ! -f "package.json" ]] || [[ ! -d "prisma" ]]; then
    echo -e "${RED}❌ Error: This script must be run from the backend directory${NC}"
    echo "Usage: cd backend && ./scripts/setup-database.sh [environment]"
    exit 1
fi

# Check if environment file exists
if [[ ! -f "../$ENV_FILE" ]] && [[ ! -f ".env" ]]; then
    echo -e "${RED}❌ Error: No environment file found${NC}"
    echo "Expected: ../$ENV_FILE or ./.env"
    exit 1
fi

# Load environment variables
if [[ -f "../$ENV_FILE" ]]; then
    echo -e "${YELLOW}📄 Loading environment from ../$ENV_FILE${NC}"
    export $(grep -v '^#' "../$ENV_FILE" | xargs)
elif [[ -f ".env" ]]; then
    echo -e "${YELLOW}📄 Loading environment from ./.env${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# Check if DATABASE_URL is set
if [[ -z "$DATABASE_URL" ]]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set in environment${NC}"
    exit 1
fi

echo "Database URL: ${DATABASE_URL}"
echo ""

# Backup existing database (production only)
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${YELLOW}💾 Creating database backup...${NC}"
    timestamp=$(date +%Y%m%d_%H%M%S)
    
    # Create backups directory if it doesn't exist
    mkdir -p ../backups
    
    # Backup based on database type
    if [[ "$DATABASE_URL" == *"sqlite"* ]] || [[ "$DATABASE_URL" == *"file:"* ]]; then
        # SQLite backup
        db_file=$(echo "$DATABASE_URL" | sed 's/file://')
        if [[ -f "$db_file" ]]; then
            cp "$db_file" "../backups/backup_${timestamp}.db"
            echo -e "${GREEN}✅ SQLite backup created: backups/backup_${timestamp}.db${NC}"
        fi
    elif [[ "$DATABASE_URL" == *"postgresql"* ]]; then
        # PostgreSQL backup
        pg_dump "$DATABASE_URL" > "../backups/backup_${timestamp}.sql"
        echo -e "${GREEN}✅ PostgreSQL backup created: backups/backup_${timestamp}.sql${NC}"
    fi
    
    # Keep only last 10 backups
    ls -t ../backups/backup_*.{db,sql} 2>/dev/null | tail -n +11 | xargs -r rm
    echo ""
fi

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Generate Prisma client
echo -e "${YELLOW}⚙️  Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
if [[ "$ENVIRONMENT" == "development" ]]; then
    # For development, use db push for rapid iteration
    npx prisma db push
else
    # For staging/production, use proper migrations
    npx prisma migrate deploy
fi

# Seed database with achievements
echo -e "${YELLOW}🌱 Seeding database...${NC}"
if [[ -f "scripts/seed.ts" ]]; then
    npx ts-node scripts/seed.ts
elif [[ -f "prisma/seed.ts" ]]; then
    npx ts-node prisma/seed.ts
else
    echo -e "${YELLOW}⚠️  No seed script found, skipping seeding${NC}"
fi

# Generate today's puzzle if none exists
echo -e "${YELLOW}🧩 Checking for today's puzzle...${NC}"
TODAY=$(date +%Y-%m-%d)

# Create a temporary script to check/generate puzzle
cat > check_puzzle_temp.ts << 'EOF'
import { prisma } from '../src/lib/prisma';
import { generateStrictPuzzle } from '../src/services/puzzle/strictCrosswordGenerator';

async function checkAndGeneratePuzzle() {
    const today = process.argv[2];
    
    try {
        // Check if today's puzzle exists
        const existingPuzzle = await prisma.dailyPuzzle.findUnique({ 
            where: { date: today } 
        });
        
        if (existingPuzzle) {
            console.log(`✅ Puzzle for ${today} already exists`);
            return;
        }
        
        console.log(`🧩 Generating puzzle for ${today}...`);
        
        // Generate the puzzle
        const puzzleData = generateStrictPuzzle(today);
        
        if (!puzzleData || !puzzleData.grid || !puzzleData.clues) {
            throw new Error('Failed to generate valid puzzle data');
        }
        
        // Save to database
        await prisma.dailyPuzzle.create({
            data: {
                date: today,
                gridData: JSON.stringify(puzzleData.grid),
                cluesData: JSON.stringify(puzzleData.clues),
                rows: puzzleData.size.rows,
                cols: puzzleData.size.cols
            }
        });
        
        console.log(`✅ Puzzle for ${today} generated and saved successfully!`);
        
    } catch (error) {
        console.error(`❌ Error with puzzle for ${today}:`, error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndGeneratePuzzle();
EOF

# Run the puzzle check/generation
npx ts-node check_puzzle_temp.ts "$TODAY"

# Clean up temporary script
rm -f check_puzzle_temp.ts

echo ""
echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  • Start the backend server: npm run dev"
echo "  • Check the database in Prisma Studio: npx prisma studio"
echo "  • View logs: tail -f ../logs/app.log"