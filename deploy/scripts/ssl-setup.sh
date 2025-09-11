#!/bin/bash

# SSL Setup Script for Galactic Crossword
# Run this as root after nginx is configured

set -e

# Configuration
DOMAIN="crossword.mittonvillage.com"
EMAIL="your-email@example.com"  # UPDATE THIS!

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 Setting up SSL Certificate for ${DOMAIN}${NC}"

# Function to print status
print_status() {
    echo -e "${YELLOW}⭐ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
fi

# Check if email is updated
if [ "$EMAIL" = "your-email@example.com" ]; then
    print_error "Please update the EMAIL variable in this script with your actual email address"
fi

print_status "Configuring nginx site..."

# Copy nginx configuration
if [ -f "nginx-crossword.conf" ]; then
    cp nginx-crossword.conf /etc/nginx/sites-available/$DOMAIN
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    print_success "Nginx site configured"
else
    print_error "nginx-crossword.conf not found. Please ensure you're in the deployment package directory."
fi

print_status "Testing nginx configuration..."
nginx -t || print_error "Nginx configuration test failed"

print_status "Reloading nginx..."
systemctl reload nginx

print_status "Obtaining SSL certificate from Let's Encrypt..."

# First, create a temporary nginx config without SSL for domain verification
cat > /etc/nginx/sites-available/${DOMAIN}-temp << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# Enable temporary config
ln -sf /etc/nginx/sites-available/${DOMAIN}-temp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/$DOMAIN
nginx -t && systemctl reload nginx

# Obtain certificate
certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN

print_success "SSL certificate obtained"

print_status "Configuring nginx with SSL..."

# Remove temporary config and enable the full SSL config
rm -f /etc/nginx/sites-enabled/${DOMAIN}-temp
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Test nginx config
nginx -t || print_error "Nginx SSL configuration test failed"

# Reload nginx
systemctl reload nginx

print_success "Nginx reloaded with SSL configuration"

print_status "Setting up automatic certificate renewal..."

# Test certificate renewal
certbot renew --dry-run

print_success "Certificate renewal test passed"

print_status "Configuring firewall..."
ufw allow 443/tcp

print_success "SSL setup completed!"

echo -e "${YELLOW}🔐 SSL Certificate Information:${NC}"
certbot certificates

echo -e "${YELLOW}🌐 Your site should now be available at:${NC}"
echo -e "   https://${DOMAIN}"

print_success "SSL setup complete!"