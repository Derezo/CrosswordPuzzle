#!/bin/bash
# Development Environment Selector
# Choose the best development mode for your needs

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}===================================================${NC}"
    echo -e "${CYAN}🌌 Galactic Crossword - Development Mode Selector${NC}"
    echo -e "${CYAN}===================================================${NC}"
}

print_modes() {
    echo -e "${YELLOW}Choose your development mode:${NC}"
    echo ""
    
    echo -e "${GREEN}1. 🛡️  STABLE MODE${NC} (Recommended for reliability)"
    echo -e "   • Uses standard Webpack dev server (TURBOPACK=0)"
    echo -e "   • Enhanced error boundaries for Three.js"
    echo -e "   • Automatic process cleanup on start"
    echo -e "   • Best for: Consistent development, no HMR crashes"
    echo ""
    
    echo -e "${BLUE}2. ⚡ TURBOPACK MODE${NC} (Fast but may have HMR issues)"
    echo -e "   • Uses Turbopack for faster builds"
    echo -e "   • Latest Next.js 15 features"
    echo -e "   • Experimental optimizations"
    echo -e "   • Best for: Quick iterations, latest features"
    echo ""
    
    echo -e "${PURPLE}3. 🐳 DOCKER MODE${NC} (Containerized environment)"
    echo -e "   • Runs in Docker containers"
    echo -e "   • Consistent across different systems"
    echo -e "   • Includes Redis and full stack"
    echo -e "   • Best for: Production-like development"
    echo ""
    
    echo -e "${CYAN}4. 🔧 TROUBLESHOOT${NC} (Diagnose and fix issues)"
    echo -e "   • Comprehensive system diagnostics"
    echo -e "   • Automated problem detection"
    echo -e "   • Recovery actions and recommendations"
    echo -e "   • Best for: When something is broken"
    echo ""
    
    echo -e "${YELLOW}5. ❌ EXIT${NC}"
    echo ""
}

check_conditions() {
    echo -e "${BLUE}🔍 Checking current environment...${NC}"
    
    # Check for running processes
    if pgrep -f "next dev" > /dev/null || pgrep -f "nodemon" > /dev/null; then
        echo -e "${YELLOW}⚠️  Development processes are currently running${NC}"
        echo -e "${YELLOW}⚠️  Some modes will stop existing processes${NC}"
    else
        echo -e "${GREEN}✅ No development processes running${NC}"
    fi
    
    # Check for Docker
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is available${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker not available (Docker mode won't work)${NC}"
    fi
    
    # Check Node.js version
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 18 ]; then
            echo -e "${GREEN}✅ Node.js $NODE_VERSION (compatible)${NC}"
        else
            echo -e "${YELLOW}⚠️  Node.js $NODE_VERSION (v18+ recommended)${NC}"
        fi
    fi
    
    echo ""
}

main() {
    print_header
    check_conditions
    print_modes
    
    read -p "Select a mode (1-5): " choice
    echo ""
    
    case $choice in
        1)
            echo -e "${GREEN}🛡️  Starting STABLE MODE...${NC}"
            echo -e "${BLUE}This mode provides maximum stability and reliability${NC}"
            sleep 1
            exec "./scripts/dev-stable.sh"
            ;;
        2)
            echo -e "${BLUE}⚡ Starting TURBOPACK MODE...${NC}"
            echo -e "${YELLOW}Note: This mode may have HMR issues with Three.js components${NC}"
            sleep 1
            exec "./scripts/dev.sh"
            ;;
        3)
            echo -e "${PURPLE}🐳 Starting DOCKER MODE...${NC}"
            echo -e "${BLUE}This will start the full containerized environment${NC}"
            sleep 1
            exec "./scripts/dev-utils.sh" start
            ;;
        4)
            echo -e "${CYAN}🔧 Starting TROUBLESHOOTER...${NC}"
            echo -e "${BLUE}Running comprehensive diagnostics...${NC}"
            sleep 1
            exec "./scripts/dev-troubleshoot.sh"
            ;;
        5)
            echo -e "${YELLOW}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Please select 1-5.${NC}"
            echo ""
            main
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    echo -e "${YELLOW}Expected to find frontend/ and backend/ directories${NC}"
    exit 1
fi

main