#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}===================================================${NC}"
echo -e "${CYAN}🔧 Galactic Crossword - WEBPACK-ONLY Mode${NC}"
echo -e "${CYAN}===================================================${NC}"

# Navigate to project root
cd "$(dirname "$0")/.." || exit

# Kill any existing processes
echo -e "${BLUE}🔍 Stopping any existing development processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
sleep 2

# Clear Next.js cache completely
echo -e "${BLUE}🧹 Clearing all Next.js caches...${NC}"
rm -rf frontend/.next
rm -rf frontend/.turbo
rm -rf frontend/node_modules/.cache
rm -rf /tmp/next-*

# Set environment to explicitly disable Turbopack
echo -e "${BLUE}🔧 Setting environment for pure Webpack...${NC}"
export NEXT_PRIVATE_SKIP_TURBOPACK=1
export NEXT_TURBOPACK=0
export TURBOPACK=0

# Create a custom next.config.js backup
if [ -f "frontend/next.config.js" ]; then
    cp frontend/next.config.js frontend/next.config.js.backup
fi

# Create webpack-only configuration
cat > frontend/next.config.webpack-only.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable all experimental features
  experimental: {
    turbo: undefined,
    turbopack: undefined
  },
  
  // Webpack configuration optimized for stability
  webpack: (config, { isServer }) => {
    // Handle Three.js imports
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    
    // Disable webpack cache for clean builds
    config.cache = false;
    
    // Set mode explicitly
    config.mode = 'development';
    
    // Optimize for Three.js
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three': require.resolve('three')
      };
    }
    
    return config;
  },
  
  // Disable fast refresh for stability
  reactStrictMode: false,
  
  // Disable SWC minification
  swcMinify: false,
  
  // Use babel instead of SWC
  compiler: undefined
};

module.exports = nextConfig;
EOF

# Start backend
echo -e "${BLUE}🚀 Starting backend server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend
echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
sleep 5

# Start frontend with webpack-only config
echo -e "${BLUE}🎨 Starting frontend with pure Webpack...${NC}"
cd frontend

# Use the webpack-only config
mv next.config.js next.config.turbopack.js 2>/dev/null || true
cp next.config.webpack-only.js next.config.js

# Run with explicit environment variables
NEXT_PRIVATE_SKIP_TURBOPACK=1 TURBOPACK=0 npm run dev &
FRONTEND_PID=$!

cd ..

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping development servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    # Restore original config
    cd frontend
    if [ -f "next.config.turbopack.js" ]; then
        mv next.config.turbopack.js next.config.js
    fi
    cd ..
    
    echo -e "${GREEN}✅ Development environment stopped${NC}"
    exit 0
}

trap cleanup INT TERM

echo -e "\n${GREEN}🎉 WEBPACK-ONLY Development Environment Starting!${NC}"
echo -e "${CYAN}📍 Application URLs:${NC}"
echo -e "   ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "   ${GREEN}Backend API:${NC} http://localhost:5000/api"
echo -e "\n${YELLOW}⚠️  This mode completely bypasses Turbopack${NC}"
echo -e "${YELLOW}⚠️  Using traditional Webpack bundler only${NC}"
echo -e "\n${BLUE}Press Ctrl+C to stop${NC}\n"

# Keep script running
wait