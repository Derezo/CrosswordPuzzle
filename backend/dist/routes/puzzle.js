"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const cronService_1 = __importDefault(require("../services/puzzle/cronService"));
const achievementService_1 = __importDefault(require("../services/achievement/achievementService"));
const router = (0, express_1.Router)();
// Get today's puzzle
router.get('/today', auth_1.authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const user = req.user;
        // Get today's puzzle
        let puzzle = await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date: today } });
        if (!puzzle) {
            // Generate puzzle if it doesn't exist
            await cronService_1.default.generatePuzzleForDate(today);
            puzzle = await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date: today } });
        }
        if (!puzzle) {
            return res.status(404).json({ error: 'No puzzle available for today' });
        }
        // Get user's progress for today's puzzle
        let progress = await prisma_1.prisma.userProgress.findUnique({
            where: {
                userId_puzzleDate: {
                    userId: user.id,
                    puzzleDate: today
                }
            }
        });
        if (!progress) {
            // Create new progress entry
            progress = await prisma_1.prisma.userProgress.create({
                data: {
                    userId: user.id,
                    puzzleDate: today,
                    answersData: '{}',
                    completedClues: '[]',
                    isCompleted: false
                }
            });
        }
        // Parse puzzle data
        const gridData = JSON.parse(puzzle.gridData);
        const cluesData = JSON.parse(puzzle.cluesData);
        // Don't send the actual answers in the puzzle data
        const puzzleData = {
            id: puzzle.id,
            date: puzzle.date,
            grid: gridData.map((row) => row.map((cell) => ({
                letter: null, // Don't send the actual letters
                number: cell.number,
                isBlocked: cell.isBlocked
            }))),
            clues: cluesData.map((clue) => ({
                number: clue.number,
                clue: clue.clue,
                direction: clue.direction,
                startRow: clue.startRow,
                startCol: clue.startCol,
                length: clue.length
                // Don't send the answer
            })),
            rows: puzzle.rows,
            cols: puzzle.cols
        };
        const progressData = {
            answers: JSON.parse(progress.answersData),
            completedClues: JSON.parse(progress.completedClues),
            isCompleted: progress.isCompleted,
            completedAt: progress.completedAt,
            solveTime: progress.solveTime
        };
        res.json({
            puzzle: puzzleData,
            progress: progressData
        });
    }
    catch (error) {
        console.error('Error fetching today\'s puzzle:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Validate answers
router.post('/validate', auth_1.authenticateToken, async (req, res) => {
    try {
        const { answers, puzzleDate } = req.body;
        const user = req.user;
        if (!answers || !puzzleDate) {
            return res.status(400).json({ error: 'Answers and puzzle date are required' });
        }
        // Get the puzzle
        const puzzle = await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date: puzzleDate } });
        if (!puzzle) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }
        // Get or create user progress
        let progress = await prisma_1.prisma.userProgress.findUnique({
            where: {
                userId_puzzleDate: {
                    userId: user.id,
                    puzzleDate
                }
            }
        });
        if (!progress) {
            progress = await prisma_1.prisma.userProgress.create({
                data: {
                    userId: user.id,
                    puzzleDate,
                    answersData: '{}',
                    completedClues: '[]',
                    isCompleted: false
                }
            });
        }
        // Parse puzzle clues and current progress
        const cluesData = JSON.parse(puzzle.cluesData);
        const currentAnswers = JSON.parse(progress.answersData);
        const currentCompletedClues = JSON.parse(progress.completedClues);
        // Validate answers and update progress
        const results = {};
        const newCompletedClues = [];
        for (const [clueNumberStr, userAnswer] of Object.entries(answers)) {
            const clueNumber = parseInt(clueNumberStr);
            const clue = cluesData.find((c) => c.number === clueNumber);
            if (clue) {
                const isCorrect = clue.answer.toUpperCase() === userAnswer.toUpperCase();
                results[clueNumber] = isCorrect;
                if (isCorrect && !currentCompletedClues.includes(clueNumber)) {
                    newCompletedClues.push(clueNumber);
                    currentCompletedClues.push(clueNumber);
                }
            }
        }
        // Update progress answers
        for (const [clueNumber, answer] of Object.entries(answers)) {
            currentAnswers[clueNumber] = answer;
        }
        // Check if puzzle is completed
        const allCluesCompleted = cluesData.every((clue) => currentCompletedClues.includes(clue.number));
        const updateData = {
            answersData: JSON.stringify(currentAnswers),
            completedClues: JSON.stringify(currentCompletedClues),
            updatedAt: new Date()
        };
        if (allCluesCompleted && !progress.isCompleted) {
            updateData.isCompleted = true;
            updateData.completedAt = new Date();
            updateData.solveTime = Math.floor((new Date().getTime() - progress.startedAt.getTime()) / 1000);
        }
        progress = await prisma_1.prisma.userProgress.update({
            where: { id: progress.id },
            data: updateData
        });
        // Check for new achievements
        const newAchievements = await achievementService_1.default.checkAchievements({
            user,
            puzzleDate,
            progress,
            newCompletedClues,
            solveTime: progress.solveTime
        });
        res.json({
            results,
            newCompletedClues,
            isCompleted: progress.isCompleted,
            solveTime: progress.solveTime,
            newAchievements: newAchievements.map(ua => ({
                id: ua.id,
                achievement: ua.achievementId,
                earnedAt: ua.earnedAt,
                metadata: ua.metadataData ? JSON.parse(ua.metadataData) : null
            }))
        });
    }
    catch (error) {
        console.error('Error validating answers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get puzzle progress for a specific date
router.get('/progress/:date', auth_1.authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const user = req.user;
        const progress = await prisma_1.prisma.userProgress.findUnique({
            where: {
                userId_puzzleDate: {
                    userId: user.id,
                    puzzleDate: date
                }
            }
        });
        if (!progress) {
            return res.json({
                answers: {},
                completedClues: [],
                isCompleted: false
            });
        }
        res.json({
            answers: JSON.parse(progress.answersData),
            completedClues: JSON.parse(progress.completedClues),
            isCompleted: progress.isCompleted,
            completedAt: progress.completedAt,
            solveTime: progress.solveTime
        });
    }
    catch (error) {
        console.error('Error fetching puzzle progress:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Auto-solve puzzle (reveals all answers, no achievements/points)
router.post('/auto-solve', auth_1.authenticateToken, async (req, res) => {
    try {
        const { puzzleDate } = req.body;
        const user = req.user;
        if (!puzzleDate) {
            return res.status(400).json({ error: 'Puzzle date is required' });
        }
        // Get the puzzle
        const puzzle = await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date: puzzleDate } });
        if (!puzzle) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }
        // Get or create user progress
        let progress = await prisma_1.prisma.userProgress.findUnique({
            where: {
                userId_puzzleDate: {
                    userId: user.id,
                    puzzleDate
                }
            }
        });
        if (!progress) {
            progress = await prisma_1.prisma.userProgress.create({
                data: {
                    userId: user.id,
                    puzzleDate,
                    answersData: '{}',
                    completedClues: '[]',
                    isCompleted: false
                }
            });
        }
        // Parse puzzle clues
        const cluesData = JSON.parse(puzzle.cluesData);
        // Create answers object with all correct answers
        const allAnswers = {};
        const allCompletedClues = [];
        cluesData.forEach((clue) => {
            allAnswers[clue.number.toString()] = clue.answer;
            allCompletedClues.push(clue.number);
        });
        // Update progress with auto-solved state (no achievements/points)
        const updateData = {
            answersData: JSON.stringify(allAnswers),
            completedClues: JSON.stringify(allCompletedClues),
            isCompleted: true,
            completedAt: new Date(),
            solveTime: null, // No solve time for auto-solved puzzles
            updatedAt: new Date()
        };
        progress = await prisma_1.prisma.userProgress.update({
            where: { id: progress.id },
            data: updateData
        });
        // Return all answers (no achievements are checked or awarded)
        res.json({
            answers: allAnswers,
            completedClues: allCompletedClues,
            isCompleted: true,
            autoSolved: true // Flag to indicate this was auto-solved
        });
    }
    catch (error) {
        console.error('Error auto-solving puzzle:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=puzzle.js.map