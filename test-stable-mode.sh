#!/bin/bash
# Quick test to verify stable mode works without Turbopack errors

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing Stable Mode Configuration${NC}"
echo -e "${BLUE}===================================${NC}"

cd "$(dirname "$0")/frontend"

echo -e "${YELLOW}Testing frontend stable mode for 15 seconds...${NC}"

# Test the stable mode
export TURBOPACK=0
export NEXT_WEBPACK=true

timeout 15s npm run dev:stable > /tmp/stable-test.log 2>&1 &
TEST_PID=$!

echo -e "${BLUE}⏳ Waiting for startup...${NC}"
sleep 8

# Check if it's running
if kill -0 $TEST_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Stable mode started successfully${NC}"
    
    # Check for the webpack warning (this means it's NOT using Turbopack)
    if grep -q "Webpack is configured while Turbopack is not" /tmp/stable-test.log; then
        echo -e "${GREEN}✅ Confirmed: Using Webpack instead of Turbopack${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Webpack/Turbopack status unclear${NC}"
    fi
    
    # Check for errors
    if grep -q "serverExternalPackages.*conflict" /tmp/stable-test.log; then
        echo -e "${RED}❌ Found Turbopack conflict errors${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ No Turbopack conflict errors found${NC}"
    fi
    
    # Clean shutdown
    kill $TEST_PID 2>/dev/null || true
    wait $TEST_PID 2>/dev/null || true
    
    echo -e "${GREEN}✅ Stable mode test completed successfully${NC}"
    echo -e "${BLUE}💡 You can now use: ./dev-selector.sh${NC}"
    
else
    echo -e "${RED}❌ Stable mode failed to start${NC}"
    cat /tmp/stable-test.log
    exit 1
fi

rm -f /tmp/stable-test.log