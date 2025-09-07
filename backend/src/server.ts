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
  max: 100, // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
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