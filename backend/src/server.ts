import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import passport from './services/auth/passport';
import apiRoutes from './routes';
import puzzleCronService from './services/puzzle/cronService';
import achievementService from './services/achievement/achievementService';
import { prisma } from './lib/prisma';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for theme globe)
});

// Middleware
app.use(helmet());
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

app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'OK', message: 'Galactic Crossword API is running' });
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

// Database connection
const connectDB = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    console.log('✅ SQLite database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.log('⚠️  Continuing without database - some features will not work');
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
    } catch (error) {
      console.error('❌ Error initializing services:', error);
    }
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Galactic Crossword API server running on port ${PORT}`);
    console.log(`🌌 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (dbConnected) {
      console.log(`📊 Database: Connected`);
      console.log(`🏆 Achievements: Initialized`);
      console.log(`📅 Puzzle cron: Running`);
    } else {
      console.log(`📊 Database: Disconnected (features limited)`);
    }
  });
};

startServer().catch(console.error);

export default app;