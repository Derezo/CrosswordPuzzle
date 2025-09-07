"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// Get top 100 users by points
router.get('/top100', auth_1.optionalAuth, async (req, res) => {
    try {
        const leaderboard = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                points: true
            },
            orderBy: { points: 'desc' },
            take: 100
        });
        const leaderboardWithRanks = leaderboard.map((user, index) => ({
            rank: index + 1,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName
            },
            points: user.points
        }));
        // If user is authenticated, find their position if not in top 100
        let userRank = null;
        if (req.user) {
            const user = req.user;
            const userInTop100 = leaderboardWithRanks.find(entry => entry.user.id === user.id);
            if (!userInTop100) {
                const usersAbove = await prisma_1.prisma.user.count({
                    where: { points: { gt: user.points } }
                });
                userRank = {
                    rank: usersAbove + 1,
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName
                    },
                    points: user.points
                };
            }
        }
        res.json({
            leaderboard: leaderboardWithRanks,
            userRank
        });
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's rank and nearby users
router.get('/user-rank', auth_1.optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const user = req.user;
        // Get user's rank
        const usersAbove = await prisma_1.prisma.user.count({
            where: { points: { gt: user.points } }
        });
        const userRank = usersAbove + 1;
        // Get users around the current user's rank (5 above, 5 below)
        const usersAround = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                points: true
            },
            orderBy: { points: 'desc' },
            skip: Math.max(0, userRank - 6),
            take: 11
        });
        const rankedUsersAround = usersAround.map((u, index) => ({
            rank: Math.max(1, userRank - 5) + index,
            user: {
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName
            },
            points: u.points,
            isCurrentUser: u.id === user.id
        }));
        res.json({
            userRank: {
                rank: userRank,
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName
                },
                points: user.points
            },
            usersAround: rankedUsersAround
        });
    }
    catch (error) {
        console.error('Error fetching user rank:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=leaderboard.js.map