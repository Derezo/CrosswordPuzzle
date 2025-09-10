# Docker Development Environment Setup

This guide provides instructions for running the Galactic Crossword application using Docker for development.

## Prerequisites

- Docker and Docker Compose installed
- Git for cloning the repository
- Basic terminal/command line knowledge

## Quick Start

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd CrosswordPuzzle
   ```

2. **Initial setup** (first time only):
   ```bash
   ./scripts/dev-utils.sh setup
   ```

3. **Start the development environment**:
   ```bash
   ./scripts/dev-utils.sh start
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Redis: localhost:6379

## Development Utility Script

The `./scripts/dev-utils.sh` script provides comprehensive development environment management:

### Core Commands

```bash
# Start the development environment
./scripts/dev-utils.sh start

# Stop all services
./scripts/dev-utils.sh stop

# Restart all services
./scripts/dev-utils.sh restart

# Check service status and health
./scripts/dev-utils.sh status
```

### Logging and Debugging

```bash
# View logs from all services
./scripts/dev-utils.sh logs

# View backend logs only
./scripts/dev-utils.sh logs-backend

# View frontend logs only
./scripts/dev-utils.sh logs-frontend

# View Redis logs only
./scripts/dev-utils.sh logs-redis

# Comprehensive health check
./scripts/dev-utils.sh health
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
./scripts/dev-utils.sh db-studio

# Reset the database (WARNING: destructive)
./scripts/dev-utils.sh db-reset
```

### Maintenance Commands

```bash
# Reset entire environment (clean slate)
./scripts/dev-utils.sh reset

# Clean Docker resources
./scripts/dev-utils.sh clean

# Initial project setup
./scripts/dev-utils.sh setup
```

## Direct Docker Compose Commands

If you prefer using Docker Compose directly:

```bash
# Start services in development mode
docker-compose --env-file .env.development up --build

# Start services in background
docker-compose --env-file .env.development up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose --env-file .env.development up --build --force-recreate
```

## Service Architecture

### Backend Service
- **Image**: Node.js 20 Alpine
- **Port**: 5000 (configurable via BACKEND_PORT)
- **Database**: SQLite with Prisma ORM
- **Development**: Hot reload with nodemon
- **Binary Targets**: Includes linux-musl-openssl-3.0.x for Alpine compatibility

### Frontend Service  
- **Image**: Node.js 20 Alpine
- **Port**: 3000 (configurable via FRONTEND_PORT)
- **Framework**: Next.js 15 with Turbopack
- **Development**: Hot reload enabled

### Redis Service
- **Image**: Redis 7 Alpine
- **Port**: 6379 (configurable via REDIS_PORT)
- **Persistence**: AOF enabled
- **Password**: dev-redis-password (development only)

## Environment Configuration

The development environment uses `.env.development` for configuration:

```bash
# Core settings
NODE_ENV=development
BUILD_TARGET=dev

# Service ports
BACKEND_PORT=5000
FRONTEND_PORT=3000
REDIS_PORT=6379

# API configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Database
DATABASE_URL="file:./prisma/dev.db"

# Security (development only - NOT for production)
JWT_SECRET=dev-jwt-secret-key-not-for-production
SESSION_SECRET=dev-session-secret-not-for-production
PUZZLE_SECRET=dev-puzzle-secret-not-for-production

# Redis
REDIS_PASSWORD=dev-redis-password
```

## Volume Mounts

### Development Mode
- Backend source code: `./backend:/app:delegated`
- Frontend source code: `./frontend:/app:delegated`
- Backend data: `backend_data:/app/prisma`
- Frontend cache: `frontend_cache:/app/.next/cache`
- Redis data: `redis_data:/data`

## Troubleshooting

### Prisma Database Issues

If you encounter Prisma client errors:

```bash
# Regenerate Prisma client
cd backend && npx prisma generate

# Reset and rebuild
./scripts/dev-utils.sh reset
```

### Port Conflicts

If ports are already in use, modify `.env.development`:

```bash
BACKEND_PORT=5001
FRONTEND_PORT=3001
REDIS_PORT=6380
```

### Docker Issues

```bash
# Clean Docker system
./scripts/dev-utils.sh clean

# Check Docker status
docker info

# View Docker Compose status
docker-compose ps
```

### Database Connection Problems

```bash
# Check backend logs
./scripts/dev-utils.sh logs-backend

# Verify database file permissions
ls -la backend/prisma/

# Reset database
./scripts/dev-utils.sh db-reset
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Clean build cache
docker builder prune

# Use fewer services for testing
docker-compose up backend redis
```

## Development Workflow

### Making Backend Changes
1. Edit files in `./backend/src/`
2. Changes auto-reload with nodemon
3. Database changes require `npx prisma db push`

### Making Frontend Changes  
1. Edit files in `./frontend/src/`
2. Changes auto-reload with Next.js
3. Turbopack provides fast builds

### Adding Dependencies

**Backend:**
```bash
cd backend
npm install <package-name>
# Rebuild container if needed
docker-compose up --build backend
```

**Frontend:**
```bash
cd frontend  
npm install <package-name>
# Rebuild container if needed
docker-compose up --build frontend
```

### Database Schema Changes

```bash
# Edit backend/prisma/schema.prisma
cd backend
npx prisma db push        # Apply changes
npx prisma generate       # Regenerate client
# Restart backend container
docker-compose restart backend
```

## Health Checks

The services include health checks:

- **Backend**: GET /api/puzzle/today
- **Frontend**: GET / (root page)
- **Redis**: PING command

Check health status:
```bash
./scripts/dev-utils.sh health
./scripts/dev-utils.sh status
```

## Security Notes

- Development secrets are weak and clearly marked
- Redis password is exposed for development convenience
- CORS is permissive in development
- Never use development configuration in production

## Logs and Debugging

### Container Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis
```

### Application Logs
- Backend: Console output via nodemon
- Frontend: Next.js development server output
- Database: Prisma query logs (enabled in development)

## Production Considerations

This setup is for development only. For production:

- Use production environment files
- Enable proper secrets management
- Configure reverse proxy (nginx)
- Enable SSL/TLS
- Use production database
- Enable monitoring and logging
- Configure proper CORS policies

## Getting Help

1. Check service status: `./scripts/dev-utils.sh status`
2. View logs: `./scripts/dev-utils.sh logs`
3. Run health check: `./scripts/dev-utils.sh health`
4. Reset environment: `./scripts/dev-utils.sh reset`

For additional help, check the main project README or documentation.