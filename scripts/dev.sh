#!/bin/bash
# Start development environment
set -e

echo "🚀 Starting Galactic Crossword development environment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Load development environment variables
if [ -f ".env.development" ]; then
    echo "📋 Loading development environment variables..."
    export $(grep -v '^#' .env.development | xargs)
else
    echo "⚠️ Warning: .env.development file not found. Using defaults..."
fi

# Clean up any existing containers to avoid conflicts
echo "🧹 Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Start services with Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose -f docker-compose.yml --env-file .env.development up --build backend frontend redis

echo "🎉 Development environment is ready!"
echo "   Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "   Backend API: http://localhost:${BACKEND_PORT:-5000}/api"
echo "   Redis: localhost:${REDIS_PORT:-6379}"
echo "   Database Studio: Run 'cd backend && pnpm run studio'"
echo ""
echo "🔧 To stop services: docker-compose down"
echo "📊 To view logs: docker-compose logs -f [service]"
