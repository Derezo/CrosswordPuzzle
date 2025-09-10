import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import puzzleCronService from '../services/puzzle/cronService';
import achievementService from '../services/achievement/achievementService';
import { validateGrid, createSolutionGrid } from '../services/puzzle/gridValidator';
import { User } from '@prisma/client';

const router = Router();

// Get today's puzzle
router.get('/today', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const user = req.user as User;

    // Get today's puzzle
    let puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: today } });

    if (!puzzle) {
      // Generate puzzle if it doesn't exist
      await puzzleCronService.generatePuzzleForDate(today);
      puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: today } });
    }

    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzle available for today' });
    }

    // Get or create user's progress for today's puzzle using upsert to avoid race conditions
    const progress = await prisma.userProgress.upsert({
      where: { 
        userId_puzzleDate: {
          userId: user.id, 
          puzzleDate: today 
        }
      },
      update: {}, // Don't update anything if it already exists
      create: {
        userId: user.id,
        puzzleDate: today,
        answersData: '{}',
        completedClues: '[]',
        isCompleted: false
      }
    });

    // Parse puzzle data
    const gridData = JSON.parse(puzzle.gridData);
    const cluesData = JSON.parse(puzzle.cluesData);

    // Don't send the actual answers in the puzzle data
    const puzzleData = {
      id: puzzle.id,
      date: puzzle.date,
      grid: gridData.map((row: any) => 
        row.map((cell: any) => ({
          letter: null, // Don't send the actual letters
          number: cell.number,
          isBlocked: cell.isBlocked
        }))
      ),
      clues: cluesData.map((clue: any) => ({
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

  } catch (error) {
    console.error('Error fetching today\'s puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate answers
router.post('/validate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { answers, puzzleDate } = req.body;
    const user = req.user as User;

    if (!answers || !puzzleDate) {
      return res.status(400).json({ error: 'Answers and puzzle date are required' });
    }

    // Get the puzzle
    const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: puzzleDate } });
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    // Get or create user progress using upsert to avoid race conditions
    let progress = await prisma.userProgress.upsert({
      where: {
        userId_puzzleDate: {
          userId: user.id,
          puzzleDate
        }
      },
      update: {}, // Don't update anything if it already exists
      create: {
        userId: user.id,
        puzzleDate,
        answersData: '{}',
        gridData: null,
        completedClues: '[]',
        isCompleted: false
      }
    });

    // Parse puzzle clues and current progress
    const cluesData = JSON.parse(puzzle.cluesData);
    const currentAnswers = JSON.parse(progress.answersData);
    const currentCompletedClues = JSON.parse(progress.completedClues);

    // Validate answers and update progress
    const results: { [key: number]: boolean } = {};
    const newCompletedClues: number[] = [];

    for (const [clueNumberStr, userAnswer] of Object.entries(answers)) {
      const clueNumber = parseInt(clueNumberStr);
      const clue = cluesData.find((c: any) => c.number === clueNumber);
      
      if (clue) {
        const isCorrect = clue.answer.toUpperCase() === (userAnswer as string).toUpperCase();
        results[clueNumber] = isCorrect;
        
        if (isCorrect && !currentCompletedClues.includes(clueNumber)) {
          newCompletedClues.push(clueNumber);
          currentCompletedClues.push(clueNumber);
        }
      }
    }

    // Update progress answers
    for (const [clueNumber, answer] of Object.entries(answers)) {
      currentAnswers[clueNumber] = answer as string;
    }

    // Check if puzzle is completed
    const allCluesCompleted = cluesData.every((clue: any) => 
      currentCompletedClues.includes(clue.number)
    );

    const updateData: any = {
      answersData: JSON.stringify(currentAnswers),
      completedClues: JSON.stringify(currentCompletedClues),
      updatedAt: new Date()
    };

    if (allCluesCompleted && !progress.isCompleted) {
      updateData.isCompleted = true;
      updateData.completedAt = new Date();
      updateData.solveTime = Math.floor((new Date().getTime() - progress.startedAt.getTime()) / 1000);
    }

    progress = await prisma.userProgress.update({
      where: { id: progress.id },
      data: updateData
    });

    // Check for new achievements
    const newAchievements = await achievementService.checkAchievements({
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

  } catch (error) {
    console.error('Error validating answers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pure grid-based validation endpoint
router.post('/validate-grid', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { gridData, puzzleDate } = req.body;
    const user = req.user as User;

    console.log('validate-grid called');
    console.log('gridData type:', typeof gridData);
    console.log('gridData length:', Array.isArray(gridData) ? gridData.length : 'not array');
    console.log('gridData sample:', gridData?.[0]?.[0]);

    if (!gridData || !puzzleDate) {
      console.log('Missing data - gridData:', !!gridData, 'puzzleDate:', !!puzzleDate);
      return res.status(400).json({ error: 'Grid data and puzzle date are required' });
    }

    // Get the puzzle
    const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: puzzleDate } });
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    // Get or create user progress using upsert to avoid race conditions
    let progress = await prisma.userProgress.upsert({
      where: {
        userId_puzzleDate: {
          userId: user.id,
          puzzleDate
        }
      },
      update: {}, // Don't update anything if it already exists
      create: {
        userId: user.id,
        puzzleDate,
        answersData: '{}',
        gridData: null,
        completedClues: '[]',
        isCompleted: false
      }
    });

    // Parse puzzle data
    const cluesData = JSON.parse(puzzle.cluesData);
    const solutionGrid = JSON.parse(puzzle.gridData);
    const currentCompletedClues = JSON.parse(progress.completedClues);

    // Use shared validation logic
    const validationResult = validateGrid(gridData, solutionGrid, cluesData, currentCompletedClues);
    
    // Update completed clues list
    const allNewCompletedClues = [...currentCompletedClues, ...validationResult.newCompletedClues];

    // Check if puzzle is completed
    const allCluesCompleted = cluesData.every((clue: any) => 
      allNewCompletedClues.includes(clue.number)
    );

    // Update progress (store solved clues for UI compatibility and grid state)
    const updateData: any = {
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

    progress = await prisma.userProgress.update({
      where: { id: progress.id },
      data: updateData
    });

    // Check for new achievements
    const newAchievements = await achievementService.checkAchievements({
      user,
      puzzleDate,
      progress,
      newCompletedClues: validationResult.newCompletedClues,
      solveTime: progress.solveTime
    });

    // Return both grid validation and solved clues (for UI only)
    res.json({
      results: validationResult.clueResults,     // Per-clue validation results
      cellValidation: validationResult.cellValidation, // Per-cell validation results
      newCompletedClues: validationResult.newCompletedClues,
      isCompleted: progress.isCompleted,
      solveTime: progress.solveTime,
      solvedClues: validationResult.solvedClues, // Extracted clue answers for UI display only
      validatedGrid: gridData,   // Return the validated grid
      newAchievements: newAchievements.map(ua => ({
        id: ua.id,
        achievement: ua.achievementId,
        earnedAt: ua.earnedAt,
        metadata: ua.metadataData ? JSON.parse(ua.metadataData) : null
      }))
    });

  } catch (error) {
    console.error('Error validating grid answers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get puzzle progress for a specific date
router.get('/progress/:date', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { date } = req.params;
    const user = req.user as User;

    const progress = await prisma.userProgress.findUnique({
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

  } catch (error) {
    console.error('Error fetching puzzle progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-solve puzzle (reveals all answers, no achievements/points)
router.post('/auto-solve', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { puzzleDate } = req.body;
    const user = req.user as User;

    if (!puzzleDate) {
      return res.status(400).json({ error: 'Puzzle date is required' });
    }

    // Get the puzzle
    const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: puzzleDate } });
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
      ? 5 / 60  // 5 minutes converted to hours
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

    // Get or create user progress using upsert to avoid race conditions
    let progress = await prisma.userProgress.upsert({
      where: {
        userId_puzzleDate: {
          userId: user.id,
          puzzleDate
        }
      },
      update: {}, // Don't update anything if it already exists
      create: {
        userId: user.id,
        puzzleDate,
        answersData: '{}',
        gridData: null,
        completedClues: '[]',
        isCompleted: false
      }
    });

    // Parse puzzle data
    const cluesData = JSON.parse(puzzle.cluesData);
    const solutionGrid = JSON.parse(puzzle.gridData);
    
    // Create solution grid using shared function
    const completeSolutionGrid = createSolutionGrid(solutionGrid, cluesData);
    
    // Validate the complete solution grid to get proper validation results
    const validationResult = validateGrid(completeSolutionGrid, solutionGrid, cluesData, []);
    
    // Create cell validation results (all cells should be correct)
    const cellValidation: { [cellKey: string]: boolean } = {};
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

    progress = await prisma.userProgress.update({
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

  } catch (error) {
    console.error('Error auto-solving puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;