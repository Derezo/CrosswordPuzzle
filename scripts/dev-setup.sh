#!/bin/bash

# Development Environment Setup Script
# This script sets up the complete development environment for Galactic Crossword

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Galactic Crossword Development Setup${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js via nvm if not present
install_nodejs() {
    if ! command_exists node; then
        echo -e "${YELLOW}📦 Installing Node.js...${NC}"
        if ! command_exists nvm; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        fi
        nvm install 20
        nvm use 20
    else
        echo -e "${GREEN}✅ Node.js is already installed${NC}"
    fi
}

# Function to install pnpm
install_pnpm() {
    if ! command_exists pnpm; then
        echo -e "${YELLOW}📦 Installing pnpm...${NC}"
        npm install -g pnpm
    else
        echo -e "${GREEN}✅ pnpm is already installed${NC}"
    fi
}

# Function to install Docker
install_docker() {
    if ! command_exists docker; then
        echo -e "${YELLOW}🐳 Docker not found. Please install Docker manually.${NC}"
        echo "Visit: https://docs.docker.com/get-docker/"
        echo "Then run this script again."
        exit 1
    else
        echo -e "${GREEN}✅ Docker is available${NC}"
    fi
}

# Check prerequisites
echo -e "${PURPLE}🔍 Checking prerequisites...${NC}"
install_nodejs
install_pnpm
install_docker

# Check for Docker Compose
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose not found${NC}"
    echo "Please install Docker Compose or use Docker Desktop"
    exit 1
else
    echo -e "${GREEN}✅ Docker Compose is available${NC}"
fi

echo ""

# Setup environment files
echo -e "${PURPLE}⚙️  Setting up environment files...${NC}"

# Backend environment
if [[ ! -f "backend/.env" ]]; then
    echo -e "${YELLOW}📄 Creating backend/.env from template...${NC}"
    cp .env.development backend/.env
    echo -e "${YELLOW}⚠️  Please update backend/.env with your actual configuration${NC}"
else
    echo -e "${GREEN}✅ backend/.env already exists${NC}"
fi

# Frontend environment
if [[ ! -f "frontend/.env.local" ]]; then
    echo -e "${YELLOW}📄 Creating frontend/.env.local...${NC}"
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > frontend/.env.local
else
    echo -e "${GREEN}✅ frontend/.env.local already exists${NC}"
fi

echo ""

# Install dependencies
echo -e "${PURPLE}📦 Installing dependencies...${NC}"

echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
pnpm install
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd ../frontend
pnpm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

cd ..

echo ""

# Setup database
echo -e "${PURPLE}🗄️  Setting up database...${NC}"
cd backend
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}Setting up database schema...${NC}"
npx prisma db push

echo -e "${YELLOW}Seeding database...${NC}"
if [[ -f "scripts/seed.ts" ]]; then
    npx ts-node scripts/seed.ts
else
    echo -e "${YELLOW}⚠️  Seed script not found, skipping...${NC}"
fi

echo -e "${YELLOW}Generating today's puzzle...${NC}"
./regenerate-puzzle.sh

cd ..

echo ""

# Create useful development scripts
echo -e "${PURPLE}🛠️  Creating development utility scripts...${NC}"

# Main development script
cat > scripts/dev.sh << 'EOF'
#!/bin/bash
# Start development environment
set -e

echo "🚀 Starting Galactic Crossword development environment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start services with Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose -f docker-compose.yml --profile dev up --build

echo "🎉 Development environment is ready!"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000/api"
echo "   Database Studio: Run 'pnpm run studio' in backend folder"
EOF

# Backend development script
cat > scripts/dev-backend.sh << 'EOF'
#!/bin/bash
# Start only backend for development
cd backend
echo "🔧 Starting backend development server..."
pnpm run dev
EOF

# Frontend development script
cat > scripts/dev-frontend.sh << 'EOF'
#!/bin/bash
# Start only frontend for development
cd frontend
echo "🎨 Starting frontend development server..."
pnpm run dev
EOF

# Database utilities script
cat > scripts/db-utils.sh << 'EOF'
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
EOF

# Testing script
cat > scripts/test.sh << 'EOF'
#!/bin/bash
# Run all tests

echo "🧪 Running tests..."

echo "🔍 TypeScript type checking (Backend)..."
cd backend
npx tsc --noEmit

echo "🔍 TypeScript type checking (Frontend)..."
cd ../frontend
npx tsc --noEmit

echo "🔍 ESLint (Frontend)..."
pnpm run lint

echo "🧩 Testing puzzle generation..."
cd ../backend
node -e "
const { generateStrictPuzzle } = require('./dist/services/puzzle/strictCrosswordGenerator');
const puzzle = generateStrictPuzzle('2024-01-01');
if (!puzzle || !puzzle.grid || !puzzle.clues) {
  console.error('❌ Puzzle generation test failed');
  process.exit(1);
}
console.log('✅ Puzzle generation test passed');
"

echo "✅ All tests passed!"
EOF

# Make scripts executable
chmod +x scripts/*.sh

echo -e "${GREEN}✅ Development utility scripts created${NC}"

echo ""

# Final setup verification
echo -e "${PURPLE}🔍 Verifying setup...${NC}"

# Check if all key files exist
key_files=(
    "backend/package.json"
    "frontend/package.json"
    "backend/.env"
    "frontend/.env.local"
    "backend/prisma/schema.prisma"
    "docker-compose.yml"
)

for file in "${key_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file (missing)${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}Quick Start Commands:${NC}"
echo -e "  ${YELLOW}./scripts/dev.sh${NC}           - Start full development environment"
echo -e "  ${YELLOW}./scripts/dev-backend.sh${NC}   - Start only backend"
echo -e "  ${YELLOW}./scripts/dev-frontend.sh${NC}  - Start only frontend"
echo -e "  ${YELLOW}./scripts/db-utils.sh${NC}      - Database utilities"
echo -e "  ${YELLOW}./scripts/test.sh${NC}          - Run all tests"
echo ""
echo -e "${BLUE}Manual Development:${NC}"
echo -e "  Backend:  ${YELLOW}cd backend && pnpm run dev${NC}"
echo -e "  Frontend: ${YELLOW}cd frontend && pnpm run dev${NC}"
echo -e "  Database: ${YELLOW}cd backend && npx prisma studio${NC}"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo -e "  Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "  Backend:  ${YELLOW}http://localhost:5000/api${NC}"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo -e "  1. Update backend/.env with your actual configuration"
echo -e "  2. Set up Google OAuth credentials if needed"
echo -e "  3. Review the database schema in backend/prisma/schema.prisma"