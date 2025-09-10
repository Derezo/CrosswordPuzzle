import { Router } from 'express';
import passport from '../services/auth/passport';
import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

const router = Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // 50 requests in dev, 5 in prod
  message: 'Too many authentication attempts, please try again later.'
});

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      }
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req: any, res: any) => {
    const user = req.user as User;
    const token = generateToken(user);

    // Redirect to frontend with token
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', authenticateToken, (req: any, res: any) => {
  const user = req.user as User;
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      points: user.points
    }
  });
});

// Logout (for session-based auth if needed)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

export default router;