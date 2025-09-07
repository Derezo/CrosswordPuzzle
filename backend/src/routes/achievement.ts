import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { User } from '@prisma/client';
import achievementService from '../services/achievement/achievementService';

const router = Router();

// Get user's achievements
router.get('/user', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as User;
    const achievements = await achievementService.getUserAchievements(user.id);
    
    res.json({
      achievements: achievements.map(ua => ({
        id: ua.id,
        achievement: {
          id: (ua.achievement as any).id,
          name: (ua.achievement as any).name,
          description: (ua.achievement as any).description,
          points: (ua.achievement as any).points,
          icon: (ua.achievement as any).icon
        },
        earnedAt: ua.earnedAt,
        puzzleDate: ua.puzzleDate,
        metadata: ua.metadataData ? JSON.parse(ua.metadataData) : null
      }))
    });

  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available achievements
router.get('/available', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as User;
    
    // Get all achievements
    const allAchievements = await achievementService.getAllAchievements();
    
    // Get user's achievements
    const userAchievements = await achievementService.getUserAchievements(user.id);
    const earnedAchievementIds = userAchievements.map(ua => ua.achievementId);

    const availableAchievements = allAchievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      points: achievement.points,
      icon: achievement.icon,
      earned: earnedAchievementIds.includes(achievement.id),
      earnedAt: userAchievements.find(ua => 
        ua.achievementId === achievement.id
      )?.earnedAt
    }));

    res.json({ achievements: availableAchievements });

  } catch (error) {
    console.error('Error fetching available achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get achievement statistics
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as User;
    const userAchievements = await achievementService.getUserAchievements(user.id);
    const allAchievements = await achievementService.getAllAchievements();

    const stats = {
      totalEarned: userAchievements.length,
      totalAvailable: allAchievements.length,
      totalPoints: userAchievements.reduce((sum, ua) => sum + (ua.achievement as any).points, 0),
      completionPercentage: Math.round((userAchievements.length / allAchievements.length) * 100),
      recentAchievements: userAchievements.slice(0, 5).map(ua => ({
        id: ua.id,
        name: (ua.achievement as any).name,
        points: (ua.achievement as any).points,
        icon: (ua.achievement as any).icon,
        earnedAt: ua.earnedAt
      }))
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;