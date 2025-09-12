# 🚀 VPS Deployment Guide for crossword.mittonvillage.com

This guide provides step-by-step instructions for deploying the Galactic Crossword application to your Linux VPS on the subdomain `crossword.mittonvillage.com`.

## 📋 Prerequisites

- Linux VPS with Ubuntu 20.04+ (your mittonvillage.com server)
- Domain `crossword.mittonvillage.com` pointing to your server IP
- Root/sudo access on the server
- Node.js 18+ and npm installed

## 🏗️ Architecture Overview

```
Internet → Nginx (Port 80/443) → Frontend (Port 3001) & Backend (Port 5001)
                                     ↓
                              SQLite Database + PM2 Process Manager
```

## ⚙️ Optional: Automated Configuration Setup

**For automated deployments without interactive prompts, configure optional settings before deployment:**

### Creating .env.deploy file (Recommended)

```bash
# Navigate to your project directory
cd /home/eric/Projects/CrosswordPuzzle

# Copy the example file
cp .env.deploy.example .env.deploy

# Edit with your values
nano .env.deploy
```

**Example .env.deploy content:**
```bash
# Google OAuth Configuration (optional)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Admin email for notifications (optional)
ADMIN_EMAIL=admin@yourdomain.com
```

**Benefits of using .env.deploy:**
- ✅ Eliminates interactive prompts during deployment
- ✅ Enables fully automated deployments
- ✅ Consistent configuration across deployments
- ✅ Secure - file is gitignored and only used locally
- ✅ All fields are optional - leave empty to skip

## 🚀 Complete Deployment Process

### Step 1: Prepare Deployment Package (Local Machine)

```bash
# Navigate to your project directory
cd /home/eric/Projects/CrosswordPuzzle

# Make deployment script executable
chmod +x deploy/deploy.sh

# Run the deployment preparation script
./deploy/deploy.sh
```

This creates a deployment package in `deploy/package/` with:
- Built frontend and backend
- Production environment template
- All necessary configuration files

### Step 2: Update DNS Configuration

Ensure your DNS provider has an A record for `crossword.mittonvillage.com` pointing to your VPS IP address.

```bash
# Test DNS resolution (run locally)
nslookup crossword.mittonvillage.com
```

### Step 3: Server Initial Setup

Transfer the deployment package to your server and run initial setup:

```bash
# Upload deployment package to your server
scp -r deploy/package/* root@mittonvillage.com:/tmp/crossword-deployment/

# SSH into your server as root
ssh root@mittonvillage.com

# Navigate to deployment directory
cd /tmp/crossword-deployment

# Make server setup script executable
chmod +x scripts/server-setup.sh

# Run server setup as root
./scripts/server-setup.sh
```

**What this does:**
- Installs system dependencies (nginx, certbot, nodejs, npm, pm2, sqlite3)
- Creates `deploy` user for security
- Sets up application directory at `/var/www/crossword`
- Configures UFW firewall
- Installs PM2 globally

### Step 4: Application Setup

```bash
# Switch to deploy user
su - deploy

# Copy deployment files to application directory
sudo cp -r /tmp/crossword-deployment/* /var/www/crossword/
sudo chown -R deploy:www-data /var/www/crossword

# Navigate to application directory
cd /var/www/crossword

# Make application setup script executable
chmod +x scripts/app-setup.sh

# Run application setup
./scripts/app-setup.sh
```

**What this does:**
- Installs frontend and backend dependencies
- Sets up SQLite database with Prisma
- Configures PM2 process manager
- Starts applications on ports 3001 (frontend) and 5001 (backend)
- Sets up log rotation

### Step 5: Environment Configuration

```bash
# Still as deploy user in /var/www/crossword
chmod +x scripts/env-setup.sh

# Run environment setup (now automated with .env.deploy)
./scripts/env-setup.sh
```

**Configuration behavior:**
- **With .env.deploy file**: Automatically loads Google Client ID, Client Secret, and Admin Email from the file
- **Without .env.deploy file**: Falls back to interactive prompts (you can press Enter to skip optional fields)
- **Mixed approach**: .env.deploy provides defaults, interactive prompts for missing values

**This generates:**
- Secure JWT, session, and puzzle secrets (automatically generated)
- Production environment files with your configuration
- Backup of secrets at `/home/deploy/crossword-secrets-backup-[timestamp].txt` (save this securely!)

**Important:** The deployment script will no longer hang on interactive prompts if you've configured .env.deploy

### Step 6: Configure Nginx and SSL

```bash
# Exit back to root user
exit

# Navigate to deployment directory
cd /tmp/crossword-deployment

# Update email in SSL script (IMPORTANT!)
nano scripts/ssl-setup.sh
# Change: EMAIL="your-email@example.com" to your actual email

# Make SSL setup script executable
chmod +x scripts/ssl-setup.sh

# Run SSL setup
./scripts/ssl-setup.sh
```

**What this does:**
- Copies nginx configuration to `/etc/nginx/sites-available/`
- Enables the site
- Obtains Let's Encrypt SSL certificate
- Configures automatic certificate renewal
- Sets up secure nginx configuration with rate limiting

### Step 7: Start and Verify Services

```bash
# Switch back to deploy user
su - deploy
cd /var/www/crossword

# Check PM2 status
pm2 status

# Restart all services to apply new environment variables
pm2 restart all

# Save PM2 configuration
pm2 save

# Check application is responding
curl -I http://localhost:3001  # Frontend
curl -I http://localhost:5001/api/health  # Backend (if health endpoint exists)
```

### Step 8: Final Verification

1. **Test HTTPS access**: Visit https://crossword.mittonvillage.com
2. **Check SSL certificate**: Use SSL checker tools
3. **Test application features**:
   - User registration/login
   - Puzzle loading
   - Favorites functionality
   - Profile settings

## 📊 File Structure After Deployment

```
/var/www/crossword/
├── frontend/
│   ├── .next/                 # Next.js build output
│   ├── public/               # Static assets
│   ├── package.json
│   └── .env.local            # Frontend environment
├── backend/
│   ├── dist/                 # TypeScript compiled output
│   ├── prisma/
│   │   └── production.db     # SQLite database
│   ├── package.json
│   └── .env                  # Backend environment
├── ecosystem.config.js       # PM2 configuration
└── scripts/                  # Deployment scripts
```

## 🔧 Management Commands

### Application Management
```bash
# As deploy user
cd /var/www/crossword

# Check status
pm2 status

# View logs
pm2 logs
pm2 logs crossword-backend
pm2 logs crossword-frontend

# Restart services
pm2 restart all
pm2 restart crossword-backend

# Monitor resources
pm2 monit
```

### Nginx Management
```bash
# As root
systemctl status nginx
systemctl reload nginx
systemctl restart nginx

# Check configuration
nginx -t

# View logs
tail -f /var/log/nginx/crossword_access.log
tail -f /var/log/nginx/crossword_error.log
```

### SSL Certificate Management
```bash
# As root
# Check certificate status
certbot certificates

# Manual renewal (automatic renewal is configured)
certbot renew

# Test renewal
certbot renew --dry-run
```

### Database Management
```bash
# As deploy user
cd /var/www/crossword/backend

# Backup database
cp prisma/production.db backups/backup_$(date +%Y%m%d_%H%M%S).db

# Check database size
ls -lh prisma/production.db

# Run Prisma Studio (for database GUI)
npx prisma studio
# Access at http://localhost:5555 (remember to close after use)
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Site Not Loading
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx configuration
sudo nginx -t

# Check DNS
nslookup crossword.mittonvillage.com
```

#### 2. SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Check nginx SSL configuration
sudo nano /etc/nginx/sites-available/crossword.mittonvillage.com

# Restart nginx
sudo systemctl restart nginx
```

#### 3. Application Not Starting
```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs --lines 50

# Check disk space
df -h

# Check memory usage
free -m
```

#### 4. Database Issues
```bash
# Check database file permissions
ls -la backend/prisma/production.db

# Check database size
du -h backend/prisma/production.db

# Regenerate Prisma client if needed
cd backend
npx prisma generate
```

## 🔄 Updates and Maintenance

### Updating the Application
```bash
# 1. Prepare new deployment package (on local machine)
./deploy/deploy.sh

# 2. Upload to server
scp -r deploy/package/* deploy@mittonvillage.com:/tmp/update/

# 3. On server, backup current version
sudo cp -r /var/www/crossword /var/www/crossword.backup.$(date +%Y%m%d)

# 4. Copy new files
sudo cp -r /tmp/update/* /var/www/crossword/
sudo chown -R deploy:www-data /var/www/crossword

# 5. Install new dependencies and restart
cd /var/www/crossword
npm ci --production
pm2 restart all
```

### Regular Maintenance
- **Database backups**: Weekly (automated via cron)
- **SSL certificate renewal**: Automatic (Let's Encrypt)
- **Log rotation**: Configured automatically
- **Security updates**: Monthly server updates

## 📞 Support

### Log Locations
- **Application logs**: `/var/log/pm2/`
- **Nginx logs**: `/var/log/nginx/`
- **SSL logs**: `/var/log/letsencrypt/`

### Important Configuration Files
- **Nginx config**: `/etc/nginx/sites-available/crossword.mittonvillage.com`
- **PM2 config**: `/var/www/crossword/ecosystem.config.js`
- **Environment files**: `/var/www/crossword/backend/.env`, `/var/www/crossword/frontend/.env.local`

### Quick Health Check
```bash
# Run this script to check overall system health
#!/bin/bash
echo "=== Crossword Application Health Check ==="
echo "Nginx status:"
systemctl is-active nginx

echo "PM2 processes:"
su - deploy -c "pm2 status"

echo "SSL certificate:"
certbot certificates | grep crossword.mittonvillage.com

echo "Disk space:"
df -h | grep -E "/$|/var"

echo "Memory usage:"
free -h
```

## 🎉 Success!

Once all steps are completed successfully, your Galactic Crossword application will be:
- ✅ Running at https://crossword.mittonvillage.com
- ✅ Secured with SSL certificate
- ✅ Managed by PM2 process manager
- ✅ Proxied through nginx with rate limiting
- ✅ Using production SQLite database
- ✅ Automatically generating daily puzzles

Your cosmic crossword adventure is now live! 🚀✨