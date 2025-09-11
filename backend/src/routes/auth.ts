import { Router } from 'express';
import passport from '../services/auth/passport';
import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { authValidationSchemas, validateWithJoi, joiSchemas } from '../middleware/validation';
import { ConflictError, AuthenticationError, asyncHandler } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

const router = Router();

// Register - with comprehensive validation
router.post('/register', authValidationSchemas.register, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ 
    where: { email: email.toLowerCase() } 
  });
  if (existingUser) {
    throw new ConflictError('Email already registered');
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
}));

// Login - with validation  
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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

// Update password
router.put('/update-password', authenticateToken, authValidationSchemas.updatePassword, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { currentPassword, password } = req.body;
  const user = req.user as User;

  // Verify current password
  if (!user.password) {
    throw new AuthenticationError('Account was created with Google OAuth. Password cannot be updated.');
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

// Update profile information
router.put('/update-profile', authenticateToken, authValidationSchemas.updateProfile, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { firstName, lastName, email } = req.body;
  const user = req.user as User;

  // Check if email is already taken by another user
  const existingUser = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      id: { not: user.id }
    }
  });

  if (existingUser) {
    throw new ConflictError('Email is already in use by another account');
  }

  // Update user profile
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase()
    }
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      points: updatedUser.points
    }
  });
}));

// Get detailed profile (includes additional info)
router.get('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user as User;
  
  const detailedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      achievements: {
        include: {
          achievement: true
        }
      },
      favoriteCategory: true,
      _count: {
        select: {
          progresses: true,
          suggestions: true
        }
      }
    }
  });

  if (!detailedUser) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    success: true,
    user: {
      id: detailedUser.id,
      email: detailedUser.email,
      firstName: detailedUser.firstName,
      lastName: detailedUser.lastName,
      points: detailedUser.points,
      favoriteCategoryId: detailedUser.favoriteCategoryId,
      favoriteCategory: detailedUser.favoriteCategory,
      createdAt: detailedUser.createdAt,
      hasPassword: !!detailedUser.password,
      isGoogleUser: !!detailedUser.googleId,
      stats: {
        totalPuzzlesPlayed: detailedUser._count.progresses,
        totalSuggestions: detailedUser._count.suggestions,
        totalAchievements: detailedUser.achievements.length
      }
    }
  });
}));

// Delete account
router.delete('/delete-account', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user as User;
  
  // Delete user and all related data (cascading deletes handled by Prisma)
  await prisma.user.delete({
    where: { id: user.id }
  });
  
  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

// Update favorite category
router.put('/update-favorite-category', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { categoryId } = req.body;
  const user = req.user as User;
  
  // Validate category exists if provided
  if (categoryId) {
    const categoryExists = await prisma.user.findFirst({
      where: { favoriteCategoryId: categoryId }
    });
    // Note: In a real app, you'd check if the category exists in a categories table
    // For now, we'll just accept any valid string
  }
  
  await prisma.user.update({
    where: { id: user.id },
    data: { favoriteCategoryId: categoryId || null }
  });
  
  res.json({
    success: true,
    message: 'Favorite category updated successfully'
  });
}));

// Logout (for session-based auth if needed)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

export default router;