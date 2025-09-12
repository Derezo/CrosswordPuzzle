// PM2 Ecosystem Configuration for Galactic Crossword
module.exports = {
  apps: [
    {
      name: 'crossword-backend',
      cwd: '/var/www/crossword/backend',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        DATABASE_URL: 'file:./prisma/production.db'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      // Logging
      log_file: '/var/log/pm2/crossword-backend.log',
      out_file: '/var/log/pm2/crossword-backend-out.log',
      error_file: '/var/log/pm2/crossword-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      
      // Memory and CPU limits
      max_memory_restart: '500M',
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Cron for daily puzzle generation
      cron_restart: '0 0 * * *', // Daily at midnight
    },
    {
      name: 'crossword-frontend',
      cwd: '/var/www/crossword/frontend/.next/standalone/frontend',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_PUBLIC_API_URL: `https://${process.env.DEPLOY_DOMAIN}/api`
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Logging
      log_file: '/var/log/pm2/crossword-frontend.log',
      out_file: '/var/log/pm2/crossword-frontend-out.log',
      error_file: '/var/log/pm2/crossword-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart
      watch: false,
      ignore_watch: ['node_modules', '.next'],
      
      // Memory and CPU limits
      max_memory_restart: '300M',
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: [process.env.DEPLOY_DOMAIN],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/CrosswordPuzzle.git', // Update with your repo
      path: '/var/www/crossword',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production && pm2 save'
    }
  }
};