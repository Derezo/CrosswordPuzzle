"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const achievementService_1 = __importDefault(require("../services/achievement/achievementService"));
const router = (0, express_1.Router)();
// Get user's achievements
router.get('/user', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const achievements = await achievementService_1.default.getUserAchievements(user.id);
        res.json({
            achievements: achievements.map(ua => ({
                id: ua.id,
                achievement: {
                    id: ua.achievement.id,
                    name: ua.achievement.name,
                    description: ua.achievement.description,
                    points: ua.achievement.points,
                    icon: ua.achievement.icon
                },
                earnedAt: ua.earnedAt,
                puzzleDate: ua.puzzleDate,
                metadata: ua.metadataData ? JSON.parse(ua.metadataData) : null
            }))
        });
    }
    catch (error) {
        console.error('Error fetching user achievements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get all available achievements
router.get('/available', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        // Get all achievements
        const allAchievements = await achievementService_1.default.getAllAchievements();
        // Get user's achievements
        const userAchievements = await achievementService_1.default.getUserAchievements(user.id);
        const earnedAchievementIds = userAchievements.map(ua => ua.achievementId);
        const availableAchievements = allAchievements.map(achievement => ({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            points: achievement.points,
            icon: achievement.icon,
            earned: earnedAchievementIds.includes(achievement.id),
            earnedAt: userAchievements.find(ua => ua.achievementId === achievement.id)?.earnedAt
        }));
        res.json({ achievements: availableAchievements });
    }
    catch (error) {
        console.error('Error fetching available achievements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get achievement statistics
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const userAchievements = await achievementService_1.default.getUserAchievements(user.id);
        const allAchievements = await achievementService_1.default.getAllAchievements();
        const stats = {
            totalEarned: userAchievements.length,
            totalAvailable: allAchievements.length,
            totalPoints: userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0),
            completionPercentage: Math.round((userAchievements.length / allAchievements.length) * 100),
            recentAchievements: userAchievements.slice(0, 5).map(ua => ({
                id: ua.id,
                name: ua.achievement.name,
                points: ua.achievement.points,
                icon: ua.achievement.icon,
                earnedAt: ua.earnedAt
            }))
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching achievement stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=achievement.js.map