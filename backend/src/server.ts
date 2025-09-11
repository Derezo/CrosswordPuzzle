import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { helmetConfig, rateLimiters, sanitizeInput, securityHeaders, corsConfig } from './middleware/security';
import { requestSizeLimits } from './middleware/validation';
import { requestLogger, authLogger, securityEventLogger, rateLimitLogger } from './middleware/logging';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers, performHealthCheck } from './middleware/errorHandler';
import { metricsMiddleware, getMetrics } from './utils/monitoring';
import logger, { logSecurityEvent } from './utils/logger';
import passport from './services/auth/passport';
import apiRoutes from './routes';
import puzzleCronService from './services/puzzle/cronService';
import achievementService from './services/achievement/achievementService';
import { prisma } from './lib/prisma';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmetConfig);
app.use(securityHeaders);

// Logging middleware (early in the pipeline)
app.use(requestLogger);
app.use(authLogger);
app.use(securityEventLogger);
app.use(rateLimitLogger);

// Metrics middleware
app.use(metricsMiddleware);
// Enhanced CORS configuration for Docker and local development
const getCorsOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://your-frontend-domain.com';
  }
  
  // Development origins - include both localhost and Docker network IPs
  const origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000'
  ];
  
  // Add Docker network origins if running in Docker
  if (process.env.DOCKER_ENV || process.env.BUILD_TARGET === 'dev') {
    origins.push(
      'http://crossword-frontend:3000',
      'http://frontend:3000'
    );
  }
  
  // Allow all origins in development if ENABLE_CORS_ALL is set
  if (process.env.ENABLE_CORS_ALL === 'true') {
    return true;
  }
  
  return origins;
};

// CORS with enhanced security configuration
app.use(cors({
  ...corsConfig,
  origin: getCorsOrigins() // Use existing origin logic
}));

// Rate limiting with different limits for different endpoints
app.use('/api/auth', rateLimiters.auth);
app.use('/api/puzzle/generate', rateLimiters.puzzleGeneration);
app.use('/api/suggestion', rateLimiters.suggestions);
app.use('/api', rateLimiters.general);

// Request parsing with size limits and sanitization
app.use(express.json({ limit: requestSizeLimits.medium }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimits.medium }));
app.use(sanitizeInput);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api', apiRoutes);

// Health check endpoints
app.get('/api/health', async (req: express.Request, res: express.Response) => {
  try {
    const healthResult = await performHealthCheck();
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      message: 'Galactic Crossword API health check',
      ...healthResult
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple ping endpoint for load balancers
app.get('/api/ping', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'OK', 
    message: 'pong',
    timestamp: new Date().toISOString() 
  });
});

// Metrics endpoint (protected in production)
app.get('/api/metrics', (req: express.Request, res: express.Response) => {
  if (process.env.NODE_ENV === 'production' && req.headers.authorization !== `Bearer ${process.env.METRICS_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const metrics = getMetrics();
  res.json({
    message: 'Application metrics',
    timestamp: new Date().toISOString(),
    ...metrics
  });
});

// Development Easter Egg endpoint (for testing network requests)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/dev/easter-egg-achievement', (req: express.Request, res: express.Response) => {
    console.log('🎉 DEV EASTER EGG: Backend received easter egg request!', req.body);
    res.json({ 
      success: true, 
      message: 'Easter egg achievement triggered!',
      timestamp: new Date().toISOString(),
      achievementId: req.body?.achievementId
    });
  });
}

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Setup global error handlers
setupGlobalErrorHandlers();

// Database connection
const connectDB = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    logger.info('SQLite database connected successfully');
    return true;
  } catch (error) {
    logger.error('Database connection error', { error });
    logger.warn('Continuing without database - some features will not work');
    return false;
  }
};

// Start server
const startServer = async () => {
  const dbConnected = await connectDB();
  
  // Initialize achievements only if database is connected
  if (dbConnected) {
    try {
      await achievementService.initializeAchievements();
      // Start puzzle cron service
      puzzleCronService.start();
      logger.info('Services initialized successfully', { 
        achievements: true, 
        puzzleCron: true 
      });
    } catch (error) {
      logger.error('Error initializing services', { error });
    }
  }
  
  app.listen(PORT, () => {
    logger.info('Galactic Crossword API server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      database: dbConnected ? 'Connected' : 'Disconnected',
      features: {
        achievements: dbConnected,
        puzzleCron: dbConnected,
        logging: true,
        security: true,
        validation: true
      }
    });
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

