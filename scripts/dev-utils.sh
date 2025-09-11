#!/bin/bash
# Galactic Crossword Development Utilities
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

cd "$PROJECT_ROOT"

print_header() {
    echo -e "${CYAN}===================================================${NC}"
    echo -e "${CYAN}🌌 Galactic Crossword - Development Utilities${NC}"
    echo -e "${CYAN}===================================================${NC}"
}

print_usage() {
    echo -e "${YELLOW}Usage: $0 [COMMAND]${NC}"
    echo ""
    echo -e "${YELLOW}Available commands:${NC}"
    echo -e "  ${GREEN}start${NC}         Start the development environment"
    echo -e "  ${GREEN}stop${NC}          Stop all services"
    echo -e "  ${GREEN}restart${NC}       Restart all services"
    echo -e "  ${GREEN}logs${NC}          View logs from all services"
    echo -e "  ${GREEN}logs-backend${NC}  View backend logs only"
    echo -e "  ${GREEN}logs-frontend${NC} View frontend logs only"
    echo -e "  ${GREEN}logs-redis${NC}    View Redis logs only"
    echo -e "  ${GREEN}status${NC}        Check service status"
    echo -e "  ${GREEN}reset${NC}         Reset and rebuild everything"
    echo -e "  ${GREEN}setup${NC}         Initial project setup"
    echo -e "  ${GREEN}db-studio${NC}     Open Prisma Studio"
    echo -e "  ${GREEN}db-reset${NC}      Reset the database"
    echo -e "  ${GREEN}health${NC}        Check service health"
    echo -e "  ${GREEN}clean${NC}         Clean Docker resources"
    echo ""
}

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

load_env() {
    if [ -f ".env.development" ]; then
        echo -e "${BLUE}📋 Loading development environment variables...${NC}"
        export $(grep -v '^#' .env.development | xargs)
    else
        echo -e "${YELLOW}⚠️ Warning: .env.development file not found. Using defaults...${NC}"
    fi
}

start_services() {
    print_header
    echo -e "${BLUE}🚀 Starting Galactic Crossword development environment...${NC}"
    
    check_docker
    load_env
    
    # Ensure Prisma client is generated for the host
    echo -e "${BLUE}🔧 Ensuring Prisma client is properly generated...${NC}"
    cd "$BACKEND_DIR" && npx prisma generate
    cd "$PROJECT_ROOT"
    
    # Clean up any existing containers
    echo -e "${BLUE}🧹 Cleaning up existing containers...${NC}"
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Start services
    echo -e "${BLUE}🐳 Starting services with Docker Compose...${NC}"
    docker-compose --env-file .env.development up --build -d backend frontend redis
    
    # Wait for backend to be ready
    echo -e "${BLUE}⏱️ Waiting for backend to be ready...${NC}"
    sleep 5
    
    # Setup database and populate categories
    echo -e "${BLUE}🗄️ Setting up database and populating categories...${NC}"
    docker-compose exec backend npx prisma db push --accept-data-loss
    docker-compose exec backend npx ts-node src/scripts/populateCategories.ts
    
    # Create test user
    echo -e "${BLUE}👤 Creating test user...${NC}"
    docker-compose exec backend npx ts-node -e "
import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@galacticcrossword.com' }
    });
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      await prisma.user.create({
        data: {
          email: 'test@galacticcrossword.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          points: 0
        }
      });
      console.log('✅ Test user created');
    } else {
      console.log('✅ Test user already exists');
    }
  } catch (error) {
    console.error('❌ Error with test user:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createTestUser();
"
    
    echo -e "${GREEN}🎉 Development environment ready!${NC}"
    echo -e "${GREEN}📱 Frontend: http://localhost:3000${NC}"
    echo -e "${GREEN}🚀 Backend: http://localhost:5000${NC}"
    echo -e "${GREEN}👤 Test login: test@galacticcrossword.com / testpassword123${NC}"
}

stop_services() {
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    docker-compose down --remove-orphans
    echo -e "${GREEN}✅ All services stopped${NC}"
}

restart_services() {
    echo -e "${BLUE}🔄 Restarting services...${NC}"
    stop_services
    start_services
}

view_logs() {
    local service="$1"
    if [ -z "$service" ]; then
        echo -e "${BLUE}📋 Viewing logs from all services...${NC}"
        docker-compose logs -f
    else
        echo -e "${BLUE}📋 Viewing logs from $service...${NC}"
        docker-compose logs -f "$service"
    fi
}

check_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    echo ""
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        docker-compose ps
        echo ""
        
        # Check service health
        echo -e "${BLUE}🏥 Health Checks:${NC}"
        
        # Backend health
        if curl -s http://localhost:${BACKEND_PORT:-5000}/api/puzzle/today >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend API (http://localhost:${BACKEND_PORT:-5000}/api)${NC}"
        else
            echo -e "${RED}❌ Backend API (http://localhost:${BACKEND_PORT:-5000}/api)${NC}"
        fi
        
        # Frontend health
        if curl -s http://localhost:${FRONTEND_PORT:-3000} >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend (http://localhost:${FRONTEND_PORT:-3000})${NC}"
        else
            echo -e "${RED}❌ Frontend (http://localhost:${FRONTEND_PORT:-3000})${NC}"
        fi
        
        # Redis health
        if docker-compose exec redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            echo -e "${GREEN}✅ Redis (localhost:${REDIS_PORT:-6379})${NC}"
        else
            echo -e "${RED}❌ Redis (localhost:${REDIS_PORT:-6379})${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️ No services are currently running${NC}"
        echo "Run './scripts/dev-utils.sh start' to start the development environment"
    fi
}

reset_all() {
    echo -e "${YELLOW}🔄 Resetting entire development environment...${NC}"
    
    # Stop all services
    echo -e "${BLUE}🛑 Stopping all services...${NC}"
    stop_services
    
    # Clean Docker resources
    echo -e "${BLUE}🧹 Cleaning Docker resources...${NC}"
    clean_docker
    
    # Clean Prisma permission issues
    echo -e "${BLUE}🔧 Cleaning Prisma client permissions...${NC}"
    clean_prisma_permissions
    
    # Regenerate Prisma client with better error handling
    echo -e "${BLUE}🔧 Regenerating Prisma client...${NC}"
    cd "$BACKEND_DIR"
    if ! npx prisma generate; then
        echo -e "${RED}❌ Failed to generate Prisma client. Trying with force...${NC}"
        # Try to install dependencies if generation fails
        npm install --silent 2>/dev/null || true
        npx prisma generate --force-reinstall 2>/dev/null || npx prisma generate
    fi
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    load_env
    
    # Rebuild and start with better error handling
    echo -e "${BLUE}🏗️ Rebuilding and starting services...${NC}"
    if docker-compose --env-file .env.development up --build -d backend frontend redis; then
        echo -e "${GREEN}✅ Services started successfully${NC}"
        
        # Wait for services to be ready
        echo -e "${BLUE}⏱️ Waiting for services to initialize...${NC}"
        sleep 10
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            echo -e "${GREEN}✅ Environment reset complete!${NC}"
            print_success_info
        else
            echo -e "${YELLOW}⚠️ Services may not be fully ready. Check status with: ./scripts/dev-utils.sh status${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to start services. Check Docker and try again.${NC}"
        echo -e "${YELLOW}💡 You can check logs with: docker-compose logs${NC}"
        return 1
    fi
}

initial_setup() {
    print_header
    echo -e "${BLUE}🛠️ Initial project setup...${NC}"
    
    check_docker
    
    # Install backend dependencies
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd "$BACKEND_DIR" && npm install
    
    # Install frontend dependencies
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR" && npm install
    
    # Generate Prisma client
    echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
    cd "$BACKEND_DIR" && npx prisma generate
    
    # Create .env.development if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env.development" ]; then
        echo -e "${BLUE}📝 Creating .env.development file...${NC}"
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.development" 2>/dev/null || true
    fi
    
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✅ Initial setup complete!${NC}"
    echo -e "${YELLOW}You can now run './scripts/dev-utils.sh start' to start the development environment${NC}"
}

db_studio() {
    echo -e "${BLUE}🎨 Opening Prisma Studio...${NC}"
    cd "$BACKEND_DIR"
    npx prisma studio
}

db_reset() {
    echo -e "${YELLOW}⚠️ This will reset the entire database. Continue? [y/N]${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${BLUE}🗄️ Resetting database...${NC}"
        cd "$BACKEND_DIR"
        npx prisma db push --force-reset
        echo -e "${GREEN}✅ Database reset complete${NC}"
    else
        echo -e "${YELLOW}❌ Database reset cancelled${NC}"
    fi
}

health_check() {
    echo -e "${BLUE}🏥 Comprehensive Health Check${NC}"
    echo ""
    
    # Check Docker
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is running${NC}"
    else
        echo -e "${RED}❌ Docker is not running${NC}"
        return 1
    fi
    
    # Check if services are defined
    if [ -f "docker-compose.yml" ]; then
        echo -e "${GREEN}✅ Docker Compose configuration found${NC}"
    else
        echo -e "${RED}❌ Docker Compose configuration not found${NC}"
        return 1
    fi
    
    # Check environment file
    if [ -f ".env.development" ]; then
        echo -e "${GREEN}✅ Development environment file found${NC}"
    else
        echo -e "${YELLOW}⚠️ .env.development not found, using defaults${NC}"
    fi
    
    # Check service status
    check_status
}

clean_docker() {
    echo -e "${YELLOW}🧹 Cleaning Docker resources...${NC}"
    
    # Stop containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Remove unused images, containers, and build cache
    docker system prune -f
    
    echo -e "${GREEN}✅ Docker cleanup complete${NC}"
}

clean_prisma_permissions() {
    echo -e "${YELLOW}🔧 Cleaning Prisma client permissions...${NC}"
    
    # Check if the Prisma client directory exists and is owned by root
    if [ -d "$BACKEND_DIR/node_modules/.prisma" ]; then
        # Check if we need sudo to remove the directory
        if [ "$(stat -c %U "$BACKEND_DIR/node_modules/.prisma" 2>/dev/null)" = "root" ]; then
            echo -e "${BLUE}   Removing root-owned Prisma client files...${NC}"
            if command -v sudo >/dev/null 2>&1; then
                sudo rm -rf "$BACKEND_DIR/node_modules/.prisma" 2>/dev/null || true
            else
                echo -e "${YELLOW}   Warning: sudo not available, attempting regular removal...${NC}"
                rm -rf "$BACKEND_DIR/node_modules/.prisma" 2>/dev/null || true
            fi
        else
            echo -e "${BLUE}   Removing Prisma client files...${NC}"
            rm -rf "$BACKEND_DIR/node_modules/.prisma" 2>/dev/null || true
        fi
    fi
    
    # Also clean any generated Prisma types that might have permission issues
    if [ -d "$BACKEND_DIR/node_modules/@prisma/client" ]; then
        if [ "$(stat -c %U "$BACKEND_DIR/node_modules/@prisma/client" 2>/dev/null)" = "root" ]; then
            echo -e "${BLUE}   Removing root-owned Prisma types...${NC}"
            if command -v sudo >/dev/null 2>&1; then
                sudo rm -rf "$BACKEND_DIR/node_modules/@prisma/client" 2>/dev/null || true
            else
                rm -rf "$BACKEND_DIR/node_modules/@prisma/client" 2>/dev/null || true
            fi
        else
            rm -rf "$BACKEND_DIR/node_modules/@prisma/client" 2>/dev/null || true
        fi
    fi
    
    echo -e "${GREEN}✅ Prisma permissions cleaned${NC}"
}

print_success_info() {
    echo ""
    echo -e "${GREEN}🎉 Development environment is ready!${NC}"
    echo -e "   ${CYAN}Frontend: http://localhost:${FRONTEND_PORT:-3000}${NC}"
    echo -e "   ${CYAN}Backend API: http://localhost:${BACKEND_PORT:-5000}/api${NC}"
    echo -e "   ${CYAN}Redis: localhost:${REDIS_PORT:-6379}${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Useful commands:${NC}"
    echo -e "   ${GREEN}docker-compose logs -f${NC}         View all logs"
    echo -e "   ${GREEN}./scripts/dev-utils.sh logs${NC}    View logs with this script"
    echo -e "   ${GREEN}./scripts/dev-utils.sh stop${NC}    Stop services"
    echo -e "   ${GREEN}./scripts/dev-utils.sh status${NC}  Check service status"
    echo ""
}

# Main command handling
case "${1:-}" in
    "start")
        start_services
        if [ $? -eq 0 ]; then
            print_success_info
        fi
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        view_logs
        ;;
    "logs-backend")
        view_logs "backend"
        ;;
    "logs-frontend")
        view_logs "frontend"
        ;;
    "logs-redis")
        view_logs "redis"
        ;;
    "status")
        check_status
        ;;
    "reset")
        reset_all
        ;;
    "setup")
        initial_setup
        ;;
    "db-studio")
        db_studio
        ;;
    "db-reset")
        db_reset
        ;;
    "health")
        health_check
        ;;
    "clean")
        clean_docker
        ;;
    *)
        print_header
        print_usage
        exit 1
        ;;
esac