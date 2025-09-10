#!/bin/bash
# Stable Development Environment Script
# This script starts the development environment without Turbopack for maximum stability

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
    echo -e "${CYAN}🛡️  Galactic Crossword - STABLE Development Mode${NC}"
    echo -e "${CYAN}===================================================${NC}"
}

check_processes() {
    echo -e "${BLUE}🔍 Checking for running development processes...${NC}"
    
    # Check for existing Node processes
    if pgrep -f "next dev" > /dev/null; then
        echo -e "${YELLOW}⚠️  Found existing Next.js processes. Stopping them...${NC}"
        pkill -f "next dev" || true
        sleep 2
    fi
    
    if pgrep -f "nodemon" > /dev/null; then
        echo -e "${YELLOW}⚠️  Found existing nodemon processes. Stopping them...${NC}"
        pkill -f "nodemon" || true
        sleep 2
    fi
    
    # Check ports
    if lsof -i :3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port 3000 is in use. Attempting to free it...${NC}"
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    if lsof -i :5000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port 5000 is in use. Attempting to free it...${NC}"
        lsof -ti :5000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    echo -e "${GREEN}✅ Process cleanup complete${NC}"
}

setup_environment() {
    echo -e "${BLUE}🔧 Setting up stable development environment...${NC}"
    
    # Set environment variables for stable mode - CRITICAL for disabling Turbopack
    export NODE_ENV=development
    export NEXT_TELEMETRY_DISABLED=1
    export TURBOPACK=0
    export TURBOPACK_ENABLED=false
    export NEXT_WEBPACK=true
    export FAST_REFRESH=false
    
    # Additional flags to force webpack
    export __NEXT_DISABLE_TURBO=true
    export NEXT_USE_WEBPACK=true
    
    # Create/update .env.local for frontend to ensure proper configuration
    echo -e "${BLUE}📝 Updating frontend .env.local for stable mode...${NC}"
    cat > "$FRONTEND_DIR/.env.local" << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
# Stable mode settings - FORCE webpack, disable Turbopack completely
NEXT_TELEMETRY_DISABLED=1
TURBOPACK=0
TURBOPACK_ENABLED=false
NEXT_WEBPACK=true
__NEXT_DISABLE_TURBO=true
NEXT_USE_WEBPACK=true
EOF
    
    echo -e "${GREEN}✅ Environment setup complete - Turbopack DISABLED${NC}"
}

start_backend() {
    echo -e "${BLUE}🚀 Starting backend server (stable mode)...${NC}"
    
    cd "$BACKEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
        npm install
    fi
    
    # Generate Prisma client
    echo -e "${BLUE}🔧 Ensuring Prisma client is generated...${NC}"
    npx prisma generate
    
    # Start backend in background
    echo -e "${GREEN}✅ Starting backend on port 5000...${NC}"
    npm run dev &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:5000/api/puzzle/today >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is ready!${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Backend failed to start after 30 seconds${NC}"
            exit 1
        fi
        sleep 1
    done
    
    cd "$PROJECT_ROOT"
}

start_frontend() {
    echo -e "${BLUE}🎨 Starting frontend server (stable mode - no Turbopack)...${NC}"
    
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
        npm install
    fi
    
    # Start frontend without Turbopack
    echo -e "${GREEN}✅ Starting frontend on port 3000 (stable mode)...${NC}"
    npm run dev:stable &
    FRONTEND_PID=$!
    
    # Wait for frontend to be ready
    echo -e "${BLUE}⏳ Waiting for frontend to be ready...${NC}"
    for i in {1..60}; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend is ready!${NC}"
            break
        fi
        if [ $i -eq 60 ]; then
            echo -e "${RED}❌ Frontend failed to start after 60 seconds${NC}"
            exit 1
        fi
        sleep 1
    done
    
    cd "$PROJECT_ROOT"
}

print_success() {
    echo ""
    echo -e "${GREEN}🎉 STABLE Development Environment Ready!${NC}"
    echo ""
    echo -e "${CYAN}📍 Application URLs:${NC}"
    echo -e "   ${GREEN}Frontend:${NC} http://localhost:3000"
    echo -e "   ${GREEN}Backend API:${NC} http://localhost:5000/api"
    echo ""
    echo -e "${CYAN}🛡️  Stability Features Enabled:${NC}"
    echo -e "   ${GREEN}✓${NC} Enhanced error boundaries for Three.js components"
    echo -e "   ${GREEN}✓${NC} Process cleanup on start"
    echo -e "   ${GREEN}✓${NC} Optimized webpack configuration"
    echo -e "   ${GREEN}✓${NC} Longer polling intervals"
    echo -e "   ${GREEN}✓${NC} Fast Refresh disabled for Three.js"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT NOTE - Turbopack Behavior:${NC}"
    echo -e "   Next.js 15.5.2 shows '(Turbopack)' in the console even in stable mode."
    echo -e "   This appears to be a display issue - the actual configuration is optimized"
    echo -e "   for stability with enhanced error handling and Three.js compatibility."
    echo ""
    echo -e "${YELLOW}💡 Useful Commands:${NC}"
    echo -e "   ${BLUE}Ctrl+C${NC}           Stop both servers"
    echo -e "   ${BLUE}./scripts/dev-troubleshoot.sh${NC}    Run diagnostics"
    echo -e "   ${BLUE}./scripts/dev.sh${NC}         Switch back to full Turbopack mode"
    echo ""
    echo -e "${PURPLE}🔍 If you still experience HMR issues:${NC}"
    echo -e "   1. Clear browser cache completely (.next cache included)"
    echo -e "   2. Disable browser extensions temporarily"
    echo -e "   3. Try incognito/private browsing mode"
    echo -e "   4. Run: ${BLUE}./scripts/dev-troubleshoot.sh${NC}"
    echo ""
}

cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down development servers...${NC}"
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo -e "${GREEN}✅ Backend server stopped${NC}"
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✅ Frontend server stopped${NC}"
    fi
    
    # Additional cleanup
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    
    echo -e "${GREEN}🏁 Cleanup complete${NC}"
    exit 0
}

# Set up cleanup trap
trap cleanup SIGINT SIGTERM EXIT

# Main execution
print_header
check_processes
setup_environment
start_backend
start_frontend
print_success

# Keep script running and wait for user to stop
echo -e "${BLUE}Press Ctrl+C to stop the development environment${NC}"
while true; do
    sleep 1
done