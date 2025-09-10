#!/bin/bash
# Development Environment Troubleshooting Script
# Comprehensive diagnostics and recovery for HMR and development issues

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
    echo -e "${CYAN}🔧 Galactic Crossword - Development Troubleshooter${NC}"
    echo -e "${CYAN}===================================================${NC}"
}

check_system_requirements() {
    echo -e "${BLUE}🔍 Checking system requirements...${NC}"
    
    # Node.js version
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
        
        # Check if version is 18+
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            echo -e "${YELLOW}⚠️  Warning: Node.js 18+ is recommended for Next.js 15${NC}"
        fi
    else
        echo -e "${RED}❌ Node.js not found${NC}"
    fi
    
    # npm version
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
    else
        echo -e "${RED}❌ npm not found${NC}"
    fi
    
    # pnpm version (optional)
    if command -v pnpm >/dev/null 2>&1; then
        PNPM_VERSION=$(pnpm --version)
        echo -e "${GREEN}✅ pnpm: $PNPM_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  pnpm not found (optional)${NC}"
    fi
    
    # Memory check
    if command -v free >/dev/null 2>&1; then
        TOTAL_RAM=$(free -h | awk '/^Mem:/ { print $2 }')
        AVAILABLE_RAM=$(free -h | awk '/^Mem:/ { print $7 }')
        echo -e "${GREEN}✅ RAM: $AVAILABLE_RAM / $TOTAL_RAM available${NC}"
    fi
    
    # Disk space
    if command -v df >/dev/null 2>&1; then
        DISK_USAGE=$(df -h . | awk 'NR==2 { print $4 " available (" $5 " used)" }')
        echo -e "${GREEN}✅ Disk: $DISK_USAGE${NC}"
    fi
    
    echo ""
}

check_running_processes() {
    echo -e "${BLUE}🔍 Checking running development processes...${NC}"
    
    # Check for Node processes
    if pgrep -f "next dev" > /dev/null; then
        echo -e "${YELLOW}⚠️  Found running Next.js processes:${NC}"
        pgrep -f "next dev" | while read pid; do
            echo -e "   PID $pid: $(ps -p $pid -o cmd --no-headers 2>/dev/null || echo 'Process not found')"
        done
        echo ""
    else
        echo -e "${GREEN}✅ No Next.js processes running${NC}"
    fi
    
    # Check for nodemon
    if pgrep -f "nodemon" > /dev/null; then
        echo -e "${YELLOW}⚠️  Found running nodemon processes:${NC}"
        pgrep -f "nodemon" | while read pid; do
            echo -e "   PID $pid: $(ps -p $pid -o cmd --no-headers 2>/dev/null || echo 'Process not found')"
        done
        echo ""
    else
        echo -e "${GREEN}✅ No nodemon processes running${NC}"
    fi
    
    # Check port usage
    echo -e "${BLUE}🔍 Checking port usage...${NC}"
    
    if lsof -i :3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port 3000 is in use:${NC}"
        lsof -i :3000 | tail -n +2 | while read line; do
            echo -e "   $line"
        done
        echo ""
    else
        echo -e "${GREEN}✅ Port 3000 is available${NC}"
    fi
    
    if lsof -i :5000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port 5000 is in use:${NC}"
        lsof -i :5000 | tail -n +2 | while read line; do
            echo -e "   $line"
        done
        echo ""
    else
        echo -e "${GREEN}✅ Port 5000 is available${NC}"
    fi
}

check_project_structure() {
    echo -e "${BLUE}🔍 Checking project structure...${NC}"
    
    # Check main directories
    if [ -d "$BACKEND_DIR" ]; then
        echo -e "${GREEN}✅ Backend directory exists${NC}"
    else
        echo -e "${RED}❌ Backend directory missing${NC}"
    fi
    
    if [ -d "$FRONTEND_DIR" ]; then
        echo -e "${GREEN}✅ Frontend directory exists${NC}"
    else
        echo -e "${RED}❌ Frontend directory missing${NC}"
    fi
    
    # Check package.json files
    if [ -f "$BACKEND_DIR/package.json" ]; then
        echo -e "${GREEN}✅ Backend package.json exists${NC}"
    else
        echo -e "${RED}❌ Backend package.json missing${NC}"
    fi
    
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        echo -e "${GREEN}✅ Frontend package.json exists${NC}"
    else
        echo -e "${RED}❌ Frontend package.json missing${NC}"
    fi
    
    # Check node_modules
    if [ -d "$BACKEND_DIR/node_modules" ]; then
        BACKEND_MODULES=$(find "$BACKEND_DIR/node_modules" -maxdepth 1 -type d | wc -l)
        echo -e "${GREEN}✅ Backend node_modules exists ($BACKEND_MODULES directories)${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend node_modules missing - run: cd backend && npm install${NC}"
    fi
    
    if [ -d "$FRONTEND_DIR/node_modules" ]; then
        FRONTEND_MODULES=$(find "$FRONTEND_DIR/node_modules" -maxdepth 1 -type d | wc -l)
        echo -e "${GREEN}✅ Frontend node_modules exists ($FRONTEND_MODULES directories)${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend node_modules missing - run: cd frontend && npm install${NC}"
    fi
    
    echo ""
}

check_three_js_setup() {
    echo -e "${BLUE}🔍 Checking Three.js and React Three Fiber setup...${NC}"
    
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        cd "$FRONTEND_DIR"
        
        # Check Three.js version
        if [ -d "node_modules/three" ]; then
            THREE_VERSION=$(grep '"version"' node_modules/three/package.json | cut -d'"' -f4 2>/dev/null || echo "unknown")
            echo -e "${GREEN}✅ Three.js installed: v$THREE_VERSION${NC}"
        else
            echo -e "${RED}❌ Three.js not installed${NC}"
        fi
        
        # Check React Three Fiber
        if [ -d "node_modules/@react-three/fiber" ]; then
            FIBER_VERSION=$(grep '"version"' node_modules/@react-three/fiber/package.json | cut -d'"' -f4 2>/dev/null || echo "unknown")
            echo -e "${GREEN}✅ React Three Fiber installed: v$FIBER_VERSION${NC}"
        else
            echo -e "${RED}❌ React Three Fiber not installed${NC}"
        fi
        
        # Check React Three Drei
        if [ -d "node_modules/@react-three/drei" ]; then
            DREI_VERSION=$(grep '"version"' node_modules/@react-three/drei/package.json | cut -d'"' -f4 2>/dev/null || echo "unknown")
            echo -e "${GREEN}✅ React Three Drei installed: v$DREI_VERSION${NC}"
        else
            echo -e "${RED}❌ React Three Drei not installed${NC}"
        fi
        
        cd "$PROJECT_ROOT"
    fi
    
    # Check Three.js components
    if [ -f "$FRONTEND_DIR/src/components/ThemeGlobe.tsx" ]; then
        echo -e "${GREEN}✅ ThemeGlobe component exists${NC}"
        
        # Check for common issues in the component
        if grep -q "useFrame" "$FRONTEND_DIR/src/components/ThemeGlobe.tsx"; then
            echo -e "${GREEN}✅ Component uses useFrame hook${NC}"
        else
            echo -e "${YELLOW}⚠️  Component doesn't use useFrame hook${NC}"
        fi
        
        if grep -q "'use client'" "$FRONTEND_DIR/src/components/ThemeGlobe.tsx"; then
            echo -e "${GREEN}✅ Component has 'use client' directive${NC}"
        else
            echo -e "${YELLOW}⚠️  Component missing 'use client' directive${NC}"
        fi
    else
        echo -e "${RED}❌ ThemeGlobe component missing${NC}"
    fi
    
    if [ -f "$FRONTEND_DIR/src/components/ThemeGlobeWrapper.tsx" ]; then
        echo -e "${GREEN}✅ ThemeGlobeWrapper component exists${NC}"
    else
        echo -e "${RED}❌ ThemeGlobeWrapper component missing${NC}"
    fi
    
    echo ""
}

check_next_js_config() {
    echo -e "${BLUE}🔍 Checking Next.js configuration...${NC}"
    
    if [ -f "$FRONTEND_DIR/next.config.js" ]; then
        echo -e "${GREEN}✅ next.config.js exists${NC}"
        
        # Check for Turbopack configuration
        if grep -q "turbopack" "$FRONTEND_DIR/next.config.js"; then
            echo -e "${GREEN}✅ Turbopack configuration found${NC}"
        else
            echo -e "${YELLOW}⚠️  Turbopack configuration not found${NC}"
        fi
        
        # Check for Three.js specific config
        if grep -q "three" "$FRONTEND_DIR/next.config.js"; then
            echo -e "${GREEN}✅ Three.js webpack configuration found${NC}"
        else
            echo -e "${YELLOW}⚠️  Three.js webpack configuration not found${NC}"
        fi
        
        # Check for experimental features
        if grep -q "experimental" "$FRONTEND_DIR/next.config.js"; then
            echo -e "${GREEN}✅ Experimental features configured${NC}"
        else
            echo -e "${YELLOW}⚠️  No experimental features configured${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  next.config.js missing${NC}"
    fi
    
    # Check Next.js version
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        NEXT_VERSION=$(grep '"next"' "$FRONTEND_DIR/package.json" | cut -d'"' -f4 2>/dev/null || echo "not found")
        echo -e "${GREEN}✅ Next.js version: $NEXT_VERSION${NC}"
        
        # Check for version compatibility
        if [[ "$NEXT_VERSION" == "15."* ]]; then
            echo -e "${GREEN}✅ Using Next.js 15 (latest)${NC}"
        elif [[ "$NEXT_VERSION" == "14."* ]]; then
            echo -e "${YELLOW}⚠️  Using Next.js 14 (consider upgrading)${NC}"
        else
            echo -e "${RED}❌ Old Next.js version detected${NC}"
        fi
    fi
    
    echo ""
}

run_diagnostics() {
    echo -e "${BLUE}🔍 Running diagnostic tests...${NC}"
    
    # Test backend build
    echo -e "${BLUE}Testing backend build...${NC}"
    cd "$BACKEND_DIR"
    if npm run build >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend build successful${NC}"
    else
        echo -e "${RED}❌ Backend build failed${NC}"
        echo -e "${YELLOW}Run: cd backend && npm run build${NC}"
    fi
    
    # Test frontend type checking
    echo -e "${BLUE}Testing frontend type checking...${NC}"
    cd "$FRONTEND_DIR"
    if npm run type-check >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend type checking passed${NC}"
    else
        echo -e "${RED}❌ Frontend type checking failed${NC}"
        echo -e "${YELLOW}Run: cd frontend && npm run type-check${NC}"
    fi
    
    # Test Prisma client generation
    echo -e "${BLUE}Testing Prisma client generation...${NC}"
    cd "$BACKEND_DIR"
    if npx prisma generate >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Prisma client generation successful${NC}"
    else
        echo -e "${RED}❌ Prisma client generation failed${NC}"
        echo -e "${YELLOW}Run: cd backend && npx prisma generate${NC}"
    fi
    
    cd "$PROJECT_ROOT"
    echo ""
}

provide_recommendations() {
    echo -e "${PURPLE}💡 Troubleshooting Recommendations:${NC}"
    echo ""
    
    echo -e "${YELLOW}For HMR (Hot Module Replacement) Issues:${NC}"
    echo -e "1. Use stable mode: ${GREEN}./scripts/dev-stable.sh${NC}"
    echo -e "2. Clear Next.js cache: ${GREEN}rm -rf frontend/.next${NC}"
    echo -e "3. Restart development server completely"
    echo -e "4. Try browser hard refresh: Ctrl+F5 or Ctrl+Shift+R"
    echo -e "5. Disable browser cache in DevTools"
    echo ""
    
    echo -e "${YELLOW}For Three.js Component Crashes:${NC}"
    echo -e "1. Check browser WebGL support: visit https://get.webgl.org/"
    echo -e "2. Update graphics drivers"
    echo -e "3. Try different browser (Chrome/Firefox/Safari)"
    echo -e "4. Disable hardware acceleration in browser settings"
    echo -e "5. Use error boundary recovery buttons in the UI"
    echo ""
    
    echo -e "${YELLOW}For Port Conflicts:${NC}"
    echo -e "1. Kill all Node processes: ${GREEN}pkill -f node${NC}"
    echo -e "2. Free specific ports: ${GREEN}lsof -ti :3000 | xargs kill -9${NC}"
    echo -e "3. Use different ports with ENV vars: ${GREEN}PORT=3001 npm run dev${NC}"
    echo ""
    
    echo -e "${YELLOW}For Performance Issues:${NC}"
    echo -e "1. Close unnecessary browser tabs and applications"
    echo -e "2. Increase Node.js memory: ${GREEN}NODE_OPTIONS='--max-old-space-size=4096'${NC}"
    echo -e "3. Use production build for testing: ${GREEN}npm run build && npm start${NC}"
    echo ""
    
    echo -e "${YELLOW}For Dependency Issues:${NC}"
    echo -e "1. Clear node_modules: ${GREEN}rm -rf {backend,frontend}/node_modules${NC}"
    echo -e "2. Clear package locks: ${GREEN}rm -f {backend,frontend}/package-lock.json${NC}"
    echo -e "3. Reinstall: ${GREEN}npm install${NC} in both directories"
    echo -e "4. Check Node.js version compatibility"
    echo ""
}

offer_recovery_actions() {
    echo -e "${CYAN}🔧 Available Recovery Actions:${NC}"
    echo ""
    echo -e "1. ${GREEN}Kill all development processes${NC}"
    echo -e "2. ${GREEN}Clear all caches (.next, node_modules/.cache, etc.)${NC}"
    echo -e "3. ${GREEN}Reinstall dependencies${NC}"
    echo -e "4. ${GREEN}Run in stable mode (no Turbopack)${NC}"
    echo -e "5. ${GREEN}Generate Prisma client${NC}"
    echo -e "6. ${GREEN}Full environment reset${NC}"
    echo -e "7. ${GREEN}Exit (no actions)${NC}"
    echo ""
    
    read -p "Select an action (1-7): " choice
    
    case $choice in
        1)
            echo -e "${YELLOW}Killing all development processes...${NC}"
            pkill -f "next dev" 2>/dev/null || true
            pkill -f "nodemon" 2>/dev/null || true
            pkill -f "node.*server" 2>/dev/null || true
            echo -e "${GREEN}✅ Processes killed${NC}"
            ;;
        2)
            echo -e "${YELLOW}Clearing caches...${NC}"
            rm -rf "$FRONTEND_DIR/.next" 2>/dev/null || true
            rm -rf "$FRONTEND_DIR/node_modules/.cache" 2>/dev/null || true
            rm -rf "$BACKEND_DIR/node_modules/.cache" 2>/dev/null || true
            rm -rf "$BACKEND_DIR/dist" 2>/dev/null || true
            echo -e "${GREEN}✅ Caches cleared${NC}"
            ;;
        3)
            echo -e "${YELLOW}Reinstalling dependencies...${NC}"
            cd "$BACKEND_DIR" && npm install
            cd "$FRONTEND_DIR" && npm install
            echo -e "${GREEN}✅ Dependencies reinstalled${NC}"
            ;;
        4)
            echo -e "${YELLOW}Starting in stable mode...${NC}"
            exec "$PROJECT_ROOT/scripts/dev-stable.sh"
            ;;
        5)
            echo -e "${YELLOW}Generating Prisma client...${NC}"
            cd "$BACKEND_DIR" && npx prisma generate
            echo -e "${GREEN}✅ Prisma client generated${NC}"
            ;;
        6)
            echo -e "${YELLOW}Performing full environment reset...${NC}"
            pkill -f "next dev" 2>/dev/null || true
            pkill -f "nodemon" 2>/dev/null || true
            rm -rf "$FRONTEND_DIR/.next" 2>/dev/null || true
            rm -rf "$FRONTEND_DIR/node_modules" 2>/dev/null || true
            rm -rf "$BACKEND_DIR/node_modules" 2>/dev/null || true
            rm -rf "$BACKEND_DIR/dist" 2>/dev/null || true
            cd "$BACKEND_DIR" && npm install && npx prisma generate
            cd "$FRONTEND_DIR" && npm install
            echo -e "${GREEN}✅ Full reset complete${NC}"
            echo -e "${CYAN}You can now run ./scripts/dev-stable.sh to start in stable mode${NC}"
            ;;
        7)
            echo -e "${BLUE}Exiting without actions${NC}"
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
}

# Main execution
print_header
check_system_requirements
check_running_processes
check_project_structure
check_three_js_setup
check_next_js_config
run_diagnostics
provide_recommendations
offer_recovery_actions

echo ""
echo -e "${GREEN}🏁 Troubleshooting complete!${NC}"
echo ""
echo -e "${CYAN}For stable development, use: ${GREEN}./scripts/dev-stable.sh${NC}"
echo -e "${CYAN}For normal development, use: ${GREEN}./scripts/dev.sh${NC}"
echo -e "${CYAN}For Docker development, use: ${GREEN}./scripts/dev-utils.sh start${NC}"