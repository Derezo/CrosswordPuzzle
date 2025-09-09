# Galactic Crossword - Deployment Guide

This comprehensive deployment guide covers all aspects of deploying the Galactic Crossword application to production environments.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Infrastructure Overview](#infrastructure-overview)
- [Environment Setup](#environment-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Docker Deployment](#docker-deployment)
- [Security Configuration](#security-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Database Management](#database-management)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git
- pnpm (recommended) or npm

### Local Development Setup
```bash
# Clone and setup development environment
git clone <repository-url>
cd CrosswordPuzzle
./scripts/dev-setup.sh

# Start development environment
./scripts/dev.sh
```

### Production Deployment
```bash
# Deploy to production
./scripts/production-deploy.sh deploy

# Check deployment status
./scripts/production-deploy.sh status
```

## 🏗️ Infrastructure Overview

### Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Next.js       │    │   Express.js    │
│  (Reverse Proxy)│◄──►│   Frontend      │◄──►│    Backend      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │   Monitoring    │    │   SQLite/       │
│   (Caching)     │    │  (Prometheus)   │    │  PostgreSQL     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: Next.js 15 with Turbopack, TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript, Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Caching**: Redis
- **Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **Deployment**: Docker + GitHub Actions

## ⚙️ Environment Setup

### Environment Files Structure
```
├── .env.development     # Development configuration
├── .env.staging        # Staging configuration  
├── .env.production     # Production configuration
├── backend/.env        # Active backend environment
└── frontend/.env.local # Active frontend environment
```

### Required Environment Variables

#### Backend (.env)
```bash
# Core Configuration
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://user:pass@localhost:5432/crossword"

# Security
JWT_SECRET="your-super-secure-jwt-secret"
JWT_EXPIRE="7d"
SESSION_SECRET="your-session-secret"
PUZZLE_SECRET="your-puzzle-generation-secret"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Rate Limiting
AUTO_SOLVE_COOLDOWN_HOURS=12
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Security Configuration

#### GitHub Secrets (Required)
```bash
# Deployment
PRODUCTION_HOST=your-server-ip
PRODUCTION_USER=deploy-user
PRODUCTION_SSH_KEY=your-private-key
PRODUCTION_PATH=/opt/galactic-crossword

# Environment Secrets
PRODUCTION_JWT_SECRET=secure-jwt-secret
PRODUCTION_SESSION_SECRET=secure-session-secret
PRODUCTION_PUZZLE_SECRET=secure-puzzle-secret
PRODUCTION_DB_PASSWORD=secure-db-password

# OAuth
PRODUCTION_GOOGLE_CLIENT_ID=prod-google-client-id
PRODUCTION_GOOGLE_CLIENT_SECRET=prod-google-client-secret

# Monitoring
GRAFANA_ADMIN_PASSWORD=secure-grafana-password
GRAFANA_SECRET_KEY=grafana-secret-key

# Notifications
SLACK_WEBHOOK_URL=your-slack-webhook
SNYK_TOKEN=your-snyk-token
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Continuous Integration (`.github/workflows/ci.yml`)
- **Triggers**: Push to main/develop, PRs to main
- **Steps**:
  - Security scanning (Snyk, npm audit)
  - TypeScript type checking
  - Build verification
  - Puzzle generation testing
  - Docker image building

#### 2. Security Scanning (`.github/workflows/security-scan.yml`)
- **Triggers**: Daily at 2 AM UTC, push events
- **Scans**:
  - Dependency vulnerabilities
  - CodeQL static analysis
  - Docker image security
  - Secret detection
  - License compliance

#### 3. Deployment (`.github/workflows/deploy.yml`)
- **Triggers**: Tags (v*), manual dispatch
- **Environments**:
  - Staging: Automatic on main branch
  - Production: Manual approval required
- **Features**:
  - Zero-downtime deployment
  - Automatic rollback on failure
  - Health checks
  - Slack notifications

### Pipeline Configuration

#### Branch Strategy
```
main        ──┬──► Staging (automatic)
              └──► Production (on tags)
develop     ──┬──► Development preview
feature/*   ──┴──► Pull request preview
```

#### Deployment Flow
```
Code Push → CI Tests → Security Scan → Build → Deploy Staging → Manual Approval → Deploy Production
```

## 🐳 Docker Deployment

### Development with Docker
```bash
# Start development environment
docker-compose up --build

# With specific profile
docker-compose --profile dev up

# View logs
docker-compose logs -f backend frontend
```

### Production with Docker
```bash
# Production deployment
docker-compose -f docker-compose.yml --profile production up -d

# With monitoring
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# Scale services
docker-compose up -d --scale backend=3 --scale frontend=2
```

### Docker Images

#### Backend Dockerfile Features
- Multi-stage build for optimization
- Non-root user for security
- Health checks
- Production dependencies only
- Build size: ~150MB

#### Frontend Dockerfile Features
- Next.js standalone output
- Static asset optimization
- Multi-stage build
- Build size: ~120MB

## 🔒 Security Configuration

### SSL/TLS Setup
```bash
# Generate certificates (Let's Encrypt recommended)
certbot certonly --standalone -d yourdomain.com

# Update nginx configuration
cp nginx/nginx.conf /etc/nginx/sites-available/galactic-crossword
ln -s /etc/nginx/sites-available/galactic-crossword /etc/nginx/sites-enabled/
```

### Security Headers (Nginx)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Rate Limiting
- API: 10 requests/second per IP
- Auth endpoints: 5 requests/second per IP
- General: 100 requests/second per IP

### Security Monitoring
- Automated dependency scanning
- Docker image vulnerability scans
- Secret detection in commits
- Real-time security alerts

## 📊 Monitoring & Logging

### Monitoring Stack
```bash
# Start monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml up -d
```

#### Services
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Visualization (port 3001)
- **AlertManager**: Alerting (port 9093)
- **Loki**: Log aggregation (port 3100)
- **Uptime Kuma**: Uptime monitoring (port 3002)

#### Key Metrics
- Response times and error rates
- Database query performance
- Memory and CPU usage
- Active user sessions
- Puzzle generation times

### Logging Configuration

#### Log Levels
- **Production**: WARN and ERROR only
- **Staging**: INFO, WARN, ERROR
- **Development**: All levels including DEBUG

#### Log Files
```
backend/logs/
├── app-YYYY-MM-DD.log          # Application logs
├── error-YYYY-MM-DD.log        # Error logs only
├── security-YYYY-MM-DD.log     # Security events
└── performance-YYYY-MM-DD.log  # Performance metrics
```

## 🗄️ Database Management

### Migration Strategy
```bash
# Development
npx prisma db push

# Production
npx prisma migrate deploy
```

### Backup Strategy

#### Automated Backups
- Daily backups at 2 AM UTC
- Retention: 30 days
- Stored in `/opt/backups/galactic-crossword/`

#### Manual Backup
```bash
# Create backup
./scripts/db-utils.sh backup

# Restore from backup
./scripts/production-deploy.sh rollback backup_20240909_140530
```

### Database Scaling

#### SQLite to PostgreSQL Migration
1. Export SQLite data: `./scripts/migrate-to-postgres.sh export`
2. Update DATABASE_URL to PostgreSQL
3. Run migrations: `npx prisma migrate deploy`
4. Import data: `./scripts/migrate-to-postgres.sh import`

## ⚡ Performance Optimization

### Frontend Optimizations
- Next.js Turbopack for faster builds
- Static asset caching (1 year)
- Image optimization (AVIF/WebP)
- Bundle splitting and tree shaking
- Gzip compression

### Backend Optimizations
- Database query optimization
- Redis caching for frequent requests
- Connection pooling
- Puzzle generation caching

### CDN Configuration
```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database status
systemctl status postgresql

# Check connection
psql $DATABASE_URL -c "SELECT 1;"

# Restart database
sudo systemctl restart postgresql
```

#### 2. Service Health Checks
```bash
# Check service status
./scripts/production-deploy.sh status

# View logs
journalctl -u galactic-crossword-backend -f
journalctl -u galactic-crossword-frontend -f
```

#### 3. Build Failures
```bash
# Clear build cache
rm -rf frontend/.next backend/dist

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Check TypeScript errors
npx tsc --noEmit
```

#### 4. Performance Issues
```bash
# Check resource usage
htop
docker stats

# Analyze logs
tail -f backend/logs/performance-*.log

# Monitor database
npx prisma studio
```

### Log Analysis
```bash
# Find errors in logs
grep -r "ERROR" backend/logs/

# Monitor real-time logs
tail -f backend/logs/app-$(date +%Y-%m-%d).log

# Analyze security events
grep -r "SECURITY" backend/logs/security-*.log
```

### Performance Monitoring
```bash
# Check response times
curl -w "%{time_total}" http://localhost:5000/api/puzzle/today

# Monitor memory usage
free -h
df -h
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Update dependencies monthly
- [ ] Review security scans weekly
- [ ] Monitor disk space daily
- [ ] Backup verification weekly
- [ ] Performance review monthly

### Emergency Procedures
1. **Service Down**: Check logs, restart services, notify team
2. **Database Issues**: Stop writes, investigate, restore from backup if needed
3. **Security Breach**: Isolate system, analyze logs, patch vulnerabilities
4. **Performance Degradation**: Scale services, check resource usage, optimize queries

### Getting Help
- Check application logs first
- Review monitoring dashboards
- Search this documentation
- Contact the development team

---

## 📚 Additional Resources

- [CLAUDE.md](./CLAUDE.md) - Complete codebase documentation
- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production](https://www.prisma.io/docs/guides/deployment)
- [GitHub Actions](https://docs.github.com/en/actions)

---

*Last updated: 2025-09-09*
*Version: 1.0.0*