#!/bin/bash

# Crossword Puzzle Regeneration Script
# Usage: ./regenerate-puzzle.sh [date] [--force]
# Example: ./regenerate-puzzle.sh 2024-09-09 --force

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    echo -e "${RED}❌ Error: This script must be run from the backend directory${NC}"
    echo "Usage: cd backend && ./regenerate-puzzle.sh [date] [--force]"
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

# Parse command line arguments
DATE=""
FORCE=false

for arg in "$@"; do
    case $arg in
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            echo "Crossword Puzzle Regeneration Script"
            echo ""
            echo "Usage: ./regenerate-puzzle.sh [date] [--force]"
            echo ""
            echo "Arguments:"
            echo "  date     Date in YYYY-MM-DD format (optional, defaults to today)"
            echo "  --force  Force regeneration even if puzzle exists"
            echo "  --help   Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./regenerate-puzzle.sh                    # Generate today's puzzle"
            echo "  ./regenerate-puzzle.sh 2024-09-09         # Generate puzzle for specific date"
            echo "  ./regenerate-puzzle.sh 2024-09-09 --force # Force regenerate even if exists"
            exit 0
            ;;
        *)
            if [[ -z "$DATE" ]] && [[ "$arg" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
                DATE="$arg"
            else
                echo -e "${RED}❌ Error: Invalid argument '$arg'${NC}"
                echo "Use --help for usage information"
                exit 1
            fi
            shift
            ;;
    esac
done

# If no date provided, use today
if [[ -z "$DATE" ]]; then
    DATE=$(date +%Y-%m-%d)
fi

# Validate date format
if [[ ! "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo -e "${RED}❌ Error: Invalid date format. Use YYYY-MM-DD${NC}"
    exit 1
fi

echo -e "${BLUE}🧩 Crossword Puzzle Regeneration Script${NC}"
echo -e "${BLUE}=======================================${NC}"
echo "Date: $DATE"
echo "Force: $FORCE"
echo ""

# Create a TypeScript script in the backend directory
TEMP_SCRIPT="./regenerate-puzzle-temp.ts"

cat > "$TEMP_SCRIPT" << 'EOF'
import { prisma } from './src/lib/prisma';
import { generateStrictPuzzle } from './src/services/puzzle/strictCrosswordGenerator';

async function regeneratePuzzle() {
    const date = process.argv[2];
    const force = process.argv[3] === 'true';
    
    try {
        console.log(`🔍 Checking for existing puzzle for ${date}...`);
        
        // Check if puzzle already exists
        const existingPuzzle = await prisma.dailyPuzzle.findUnique({ 
            where: { date } 
        });
        
        if (existingPuzzle && !force) {
            console.log(`❌ Puzzle for ${date} already exists. Use --force to regenerate.`);
            process.exit(1);
        }
        
        if (existingPuzzle && force) {
            console.log(`🗑️  Deleting existing puzzle and related data for ${date}...`);
            
            // Delete related UserProgress records first (no cascade delete configured)
            const deletedProgress = await prisma.userProgress.deleteMany({ 
                where: { puzzleDate: date } 
            });
            console.log(`🗑️  Deleted ${deletedProgress.count} user progress records`);
            
            // Delete related Suggestions (these have cascade delete but let's be explicit)
            const deletedSuggestions = await prisma.suggestion.deleteMany({
                where: { puzzleDate: date }
            });
            console.log(`🗑️  Deleted ${deletedSuggestions.count} suggestion records`);
            
            // Now we can safely delete the puzzle
            await prisma.dailyPuzzle.delete({ where: { date } });
            console.log(`✅ Existing puzzle and all related data deleted`);
        }
        
        console.log(`🧩 Generating new puzzle for ${date}...`);
        
        // Generate the puzzle using strict constraint algorithm
        const puzzleData = generateStrictPuzzle(date);
        
        if (!puzzleData || !puzzleData.grid || !puzzleData.clues) {
            throw new Error('Failed to generate valid puzzle data');
        }
        
        // Save to database
        const savedPuzzle = await prisma.dailyPuzzle.create({
            data: {
                date,
                gridData: JSON.stringify(puzzleData.grid),
                cluesData: JSON.stringify(puzzleData.clues),
                rows: puzzleData.size.rows,
                cols: puzzleData.size.cols
            }
        });
        
        console.log(`✅ Puzzle for ${date} generated and saved successfully!`);
        console.log(`📊 Grid size: ${puzzleData.size.rows}x${puzzleData.size.cols}`);
        console.log(`📝 Total clues: ${puzzleData.clues.length}`);
        console.log(`🆔 Puzzle ID: ${savedPuzzle.id}`);
        
    } catch (error) {
        console.error(`❌ Error generating puzzle for ${date}:`, error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

regeneratePuzzle();
EOF

echo -e "${YELLOW}⚙️  Building TypeScript...${NC}"
npm run build

echo -e "${YELLOW}🔄 Running puzzle generation...${NC}"
echo ""

# Run the TypeScript script with ts-node
npx ts-node "$TEMP_SCRIPT" "$DATE" "$FORCE"

# Clean up temporary script
rm -f "$TEMP_SCRIPT"

echo ""
echo -e "${GREEN}🎉 Puzzle regeneration completed!${NC}"
echo ""
echo "Next steps:"
echo "  • Start the backend server: npm run dev"
echo "  • Check the puzzle in the frontend application"
echo "  • Verify the puzzle data in Prisma Studio: npx prisma studio"