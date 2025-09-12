# Sudo Setup for Automated Deployment

To enable smooth automated deployment, the deploy user needs passwordless sudo access for specific commands. This is a common and secure practice for production deployments.

## Option 1: Full Passwordless Sudo (Easiest)

Run this on your production server as root or a user with sudo access:

```bash
# Add deploy user to sudoers with no password required
echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/deploy

# Set correct permissions
sudo chmod 0440 /etc/sudoers.d/deploy
```

## Option 2: Limited Passwordless Sudo (More Secure)

For production environments, you may want to limit which commands can be run without a password:

```bash
# Create a sudoers file with limited permissions
sudo tee /etc/sudoers.d/deploy << 'EOF'
# Deploy user permissions for automated deployment
deploy ALL=(ALL) NOPASSWD: /usr/bin/apt, /usr/bin/apt-get
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx
deploy ALL=(ALL) NOPASSWD: /usr/bin/certbot
deploy ALL=(ALL) NOPASSWD: /usr/sbin/ufw
deploy ALL=(ALL) NOPASSWD: /bin/mkdir, /bin/chown, /bin/chmod
deploy ALL=(ALL) NOPASSWD: /bin/mv, /bin/rm, /bin/cp
deploy ALL=(ALL) NOPASSWD: /usr/bin/tee
deploy ALL=(ALL) NOPASSWD: /usr/bin/ln
deploy ALL=(ALL) NOPASSWD: /usr/bin/npm
deploy ALL=(ALL) NOPASSWD: /usr/bin/useradd, /usr/sbin/usermod
EOF

# Set correct permissions
sudo chmod 0440 /etc/sudoers.d/deploy
```

## Option 3: Manual Setup (No Passwordless Sudo)

If you prefer not to use passwordless sudo, you can manually run the deployment steps:

1. **Server Setup**: Manually install nginx, certbot, nodejs, npm, sqlite3, ufw, jq, curl, pm2
2. **User Setup**: Create the deploy user and add to www-data group
3. **Directory Setup**: Create `/var/www/crossword` with proper permissions
4. **Run Deployment**: Use the deployment script with existing infrastructure

```bash
# Manual server setup commands
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm sqlite3 ufw jq curl
sudo npm install -g pm2
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG www-data deploy
sudo mkdir -p /var/www/crossword
sudo chown -R deploy:www-data /var/www/crossword
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5001
sudo ufw allow 3001
sudo ufw allow 443/tcp
```

## Verification

After setting up sudo access, verify it works:

```bash
# Test sudo access (should not prompt for password)
ssh deploy@your-server "sudo -n true && echo 'Passwordless sudo working' || echo 'Passwordless sudo not configured'"
```

## Security Considerations

- The deploy user should only be used for deployment purposes
- Consider using SSH key authentication only (disable password auth)
- Regularly audit the sudoers configuration
- Use Option 2 (limited permissions) for production environments
- Monitor deployment logs for any suspicious activity

## Alternative: Docker-based Deployment

For environments where sudo access is not feasible, consider containerizing the application with Docker, which can run without sudo privileges.