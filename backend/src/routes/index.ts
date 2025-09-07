import { Router } from 'express';
import authRoutes from './auth';
import puzzleRoutes from './puzzle';
import leaderboardRoutes from './leaderboard';
import achievementRoutes from './achievement';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/puzzle', puzzleRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/achievement', achievementRoutes);

export default router;