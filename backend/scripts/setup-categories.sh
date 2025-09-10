#!/bin/bash

# Setup Categories Script
# This script sets up the database schema and loads categories from the CSV file

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Categories System${NC}"
echo -e "${BLUE}==============================${NC}"

# Check if we're in the backend directory
if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    echo -e "${RED}❌ Error: This script must be run from the backend directory${NC}"
    echo "Usage: cd backend && ./scripts/setup-categories.sh"
    exit 1
fi

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}⚠️  Warning: node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found. Please copy .env.example to .env and configure it.${NC}"
    if [[ -f ".env.example" ]]; then
        echo "You can run: cp .env.example .env"
    fi
    exit 1
fi

# Check if CSV file exists
CSV_FILE="./src/data/crossword_dictionary_with_clues.csv"
if [[ ! -f "$CSV_FILE" ]]; then
    echo -e "${RED}❌ Error: CSV file not found at $CSV_FILE${NC}"
    echo "Please ensure the crossword_dictionary_with_clues.csv file exists in src/data/"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1: Generating Prisma Client...${NC}"
npx prisma generate

echo -e "${YELLOW}📋 Step 2: Pushing database schema...${NC}"
npx prisma db push

echo -e "${YELLOW}📋 Step 3: Loading categories from CSV...${NC}"
npx ts-node scripts/load-categories.ts

echo -e "${YELLOW}📋 Step 4: Verifying categories in database...${NC}"

# Simple verification using a one-liner
npx ts-node -e "
import { prisma } from './src/lib/prisma';
async function verify() {
  const count = await prisma.puzzleCategory.count();
  const top5 = await prisma.puzzleCategory.findMany({
    take: 5,
    orderBy: { wordCount: 'desc' },
    select: { name: true, wordCount: true, favoritesCount: true }
  });
  console.log('✅ Found', count, 'categories in database');
  console.log('🏆 Top 5 categories by word count:');
  top5.forEach((cat, index) => {
    console.log(\`\${index + 1}. \${cat.name}: \${cat.wordCount} words, \${cat.favoritesCount} favorites\`);
  });
  await prisma.\$disconnect();
}
verify();
"

echo ""
echo -e "${GREEN}🎉 Categories system setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  • Start the backend server: npm run dev"
echo "  • Start the frontend server: cd ../frontend && npm run dev"
echo "  • Visit http://localhost:3000/categories to see the categories"
echo "  • Check user profiles at http://localhost:3000/profile"
echo ""
echo "Database commands:"
echo "  • View data in Prisma Studio: npx prisma studio"
echo "  • Reset categories: npx ts-node scripts/load-categories.ts"