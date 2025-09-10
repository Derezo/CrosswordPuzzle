import { Router } from 'express';
import authRoutes from './auth';
import puzzleRoutes from './puzzle';
import leaderboardRoutes from './leaderboard';
import achievementRoutes from './achievement';
import suggestionRoutes from './suggestion';
import categoriesRoutes from './categories';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/puzzle', puzzleRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/achievement', achievementRoutes);
router.use('/suggestion', suggestionRoutes);
router.use('/categories', categoriesRoutes);

export default router;