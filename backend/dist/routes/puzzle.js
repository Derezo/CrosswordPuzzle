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
const gridValidator_1 = require("../services/puzzle/gridValidator");
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
            gridData: progress.gridData ? JSON.parse(progress.gridData) : null,
            completedClues: JSON.parse(progress.completedClues),
            isCompleted: progress.isCompleted,
            completedAt: progress.completedAt,
            solveTime: progress.solveTime,
            firstViewedAt: progress.firstViewedAt
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
                    gridData: null,
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
// Pure grid-based validation endpoint
router.post('/validate-grid', auth_1.authenticateToken, async (req, res) => {
    try {
        const { gridData, puzzleDate } = req.body;
        const user = req.user;
        console.log('validate-grid called');
        console.log('gridData type:', typeof gridData);
        console.log('gridData length:', Array.isArray(gridData) ? gridData.length : 'not array');
        console.log('gridData sample:', gridData?.[0]?.[0]);
        if (!gridData || !puzzleDate) {
            console.log('Missing data - gridData:', !!gridData, 'puzzleDate:', !!puzzleDate);
            return res.status(400).json({ error: 'Grid data and puzzle date are required' });
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
                    gridData: null,
                    completedClues: '[]',
                    isCompleted: false
                }
            });
        }
        // Parse puzzle data
        const cluesData = JSON.parse(puzzle.cluesData);
        const solutionGrid = JSON.parse(puzzle.gridData);
        const currentCompletedClues = JSON.parse(progress.completedClues);
        // Use shared validation logic
        const validationResult = (0, gridValidator_1.validateGrid)(gridData, solutionGrid, cluesData, currentCompletedClues);
        // Update completed clues list
        const allNewCompletedClues = [...currentCompletedClues, ...validationResult.newCompletedClues];
        // Check if puzzle is completed
        const allCluesCompleted = cluesData.every((clue) => allNewCompletedClues.includes(clue.number));
        // Update progress (store solved clues for UI compatibility and grid state)
        const updateData = {
            answersData: JSON.stringify(validationResult.solvedClues),
            gridData: JSON.stringify(gridData), // Save current grid state
            completedClues: JSON.stringify(allNewCompletedClues),
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
            newCompletedClues: validationResult.newCompletedClues,
            solveTime: progress.solveTime
        });
        // Return both grid validation and solved clues (for UI only)
        res.json({
            results: validationResult.clueResults, // Per-clue validation results
            cellValidation: validationResult.cellValidation, // Per-cell validation results
            newCompletedClues: validationResult.newCompletedClues,
            isCompleted: progress.isCompleted,
            solveTime: progress.solveTime,
            solvedClues: validationResult.solvedClues, // Extracted clue answers for UI display only
            validatedGrid: gridData, // Return the validated grid
            newAchievements: newAchievements.map(ua => ({
                id: ua.id,
                achievement: ua.achievementId,
                earnedAt: ua.earnedAt,
                metadata: ua.metadataData ? JSON.parse(ua.metadataData) : null
            }))
        });
    }
    catch (error) {
        console.error('Error validating grid answers:', error);
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
                gridData: null,
                completedClues: [],
                isCompleted: false,
                firstViewedAt: null
            });
        }
        res.json({
            answers: JSON.parse(progress.answersData),
            gridData: progress.gridData ? JSON.parse(progress.gridData) : null,
            completedClues: JSON.parse(progress.completedClues),
            isCompleted: progress.isCompleted,
            completedAt: progress.completedAt,
            solveTime: progress.solveTime,
            firstViewedAt: progress.firstViewedAt
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
        // Check if puzzle is within the cooldown period
        const puzzleCreatedAt = new Date(puzzle.createdAt);
        const currentTime = new Date();
        const timeDifference = currentTime.getTime() - puzzleCreatedAt.getTime();
        // Use environment variable for cooldown duration
        // 5 minutes (0.083 hours) in dev, 12 hours in production
        const cooldownHours = process.env.NODE_ENV === 'development'
            ? 5 / 60 // 5 minutes converted to hours
            : parseFloat(process.env.AUTO_SOLVE_COOLDOWN_HOURS || '12');
        const hoursElapsed = timeDifference / (1000 * 60 * 60); // Convert to hours
        if (hoursElapsed < cooldownHours) {
            const remainingTime = cooldownHours - hoursElapsed;
            const remainingHours = Math.floor(remainingTime);
            const remainingMinutes = Math.floor((remainingTime % 1) * 60);
            const remainingSeconds = Math.floor(((remainingTime % 1) * 60 % 1) * 60);
            return res.status(429).json({
                error: 'AUTO_SOLVE_COOLDOWN',
                message: 'This puzzle cannot be auto-solved yet!',
                remainingTime: {
                    hours: remainingHours,
                    minutes: remainingMinutes,
                    seconds: remainingSeconds,
                    totalSeconds: Math.floor(remainingTime * 3600)
                },
                canAutoSolveAt: new Date(puzzleCreatedAt.getTime() + (cooldownHours * 60 * 60 * 1000)).toISOString()
            });
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
                    gridData: null,
                    completedClues: '[]',
                    isCompleted: false
                }
            });
        }
        // Parse puzzle data
        const cluesData = JSON.parse(puzzle.cluesData);
        const solutionGrid = JSON.parse(puzzle.gridData);
        // Create solution grid using shared function
        const completeSolutionGrid = (0, gridValidator_1.createSolutionGrid)(solutionGrid, cluesData);
        // Validate the complete solution grid to get proper validation results
        const validationResult = (0, gridValidator_1.validateGrid)(completeSolutionGrid, solutionGrid, cluesData, []);
        // Create cell validation results (all cells should be correct)
        const cellValidation = {};
        for (let row = 0; row < solutionGrid.length; row++) {
            for (let col = 0; col < solutionGrid[0]?.length || 0; col++) {
                const cell = solutionGrid[row][col];
                if (!cell.isBlocked) {
                    cellValidation[`${row},${col}`] = true;
                }
            }
        }
        // Update progress with auto-solved state (no achievements/points)
        const updateData = {
            answersData: JSON.stringify(validationResult.solvedClues),
            gridData: JSON.stringify(completeSolutionGrid), // Save complete solution grid
            completedClues: JSON.stringify(validationResult.newCompletedClues),
            isCompleted: true,
            completedAt: new Date(),
            solveTime: null, // No solve time for auto-solved puzzles
            updatedAt: new Date()
        };
        progress = await prisma_1.prisma.userProgress.update({
            where: { id: progress.id },
            data: updateData
        });
        // Return grid-based response (no achievements are checked or awarded)
        res.json({
            answers: validationResult.solvedClues, // Clue answers for UI compatibility
            completedClues: validationResult.newCompletedClues,
            isCompleted: true,
            autoSolved: true, // Flag to indicate this was auto-solved
            cellValidation, // Cell-level validation results
            validatedGrid: completeSolutionGrid, // The complete solution grid
            results: validationResult.clueResults // Per-clue validation results
        });
    }
    catch (error) {
        console.error('Error auto-solving puzzle:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=puzzle.js.map