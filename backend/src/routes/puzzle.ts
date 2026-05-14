import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { puzzleValidationSchemas, commonValidations, handleValidationErrors, joiSchemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/security';
import { prisma } from '../lib/prisma';
import puzzleCronService from '../services/puzzle/cronService';
import achievementService from '../services/achievement/achievementService';
import { validateGrid, createSolutionGrid } from '../services/puzzle/gridValidator';
import { generateStrictPuzzle } from '../services/puzzle/strictCrosswordGenerator';
import { safeJsonParse } from '../utils/json';
import { User } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { CrosswordClue as PuzzleClue } from '../types';

interface PuzzleGridCell {
  letter: string;
  isBlocked: boolean;
  number?: number | null;
  row?: number;
  col?: number;
}

type PuzzleGrid = PuzzleGridCell[][];

interface UserAnswerCell {
  letter?: string;
  // Legacy fields from earlier dual-direction cache. Still read-through for old
  // persisted grids; new writes only use `letter`.
  acrossLetter?: string;
  downLetter?: string;
  lastActiveDirection?: 'across' | 'down';
}

type UserAnswerGrid = UserAnswerCell[][];

function sanitizeGridForPersistence(grid: UserAnswerGrid): UserAnswerGrid {
  return grid.map((row) =>
    row.map((cell) => ({
      letter: cell?.letter ?? '',
    })),
  );
}

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
    const gridData = safeJsonParse<PuzzleGrid>(puzzle.gridData, [], 'puzzle.gridData');
    const cluesData = safeJsonParse<PuzzleClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');

    // Don't send the actual answers in the puzzle data
    const puzzleData = {
      id: puzzle.id,
      date: puzzle.date,
      grid: gridData.map((row: PuzzleGridCell[]) =>
        row.map((cell: PuzzleGridCell) => ({
          letter: null, // Don't send the actual letters
          number: cell.number,
          isBlocked: cell.isBlocked
        }))
      ),
      clues: cluesData.map((clue: PuzzleClue) => ({
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
      answers: safeJsonParse<Record<string, string>>(progress.answersData, {}, 'progress.answersData'),
      gridData: progress.gridData ? safeJsonParse<UserAnswerGrid | null>(progress.gridData, null, 'progress.gridData') : null,
      completedClues: safeJsonParse<number[]>(progress.completedClues, [], 'progress.completedClues'),
      validatedClues: safeJsonParse<Record<number, boolean>>(progress.validatedClues, {}, 'progress.validatedClues'),
      revealedCells: safeJsonParse<Record<string, number>>(progress.revealedCells, {}, 'progress.revealedCells'),
      usedHints: progress.usedHints,
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
router.post('/validate', authenticateToken, puzzleValidationSchemas.validateAnswers, async (req: AuthenticatedRequest, res: Response) => {
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
    const cluesData = safeJsonParse<PuzzleClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');
    const currentAnswers = safeJsonParse<Record<string, string>>(progress.answersData, {}, 'progress.answersData');
    const currentCompletedClues = safeJsonParse<number[]>(progress.completedClues, [], 'progress.completedClues');

    // Validate answers and update progress
    const results: { [key: number]: boolean } = {};
    const newCompletedClues: number[] = [];

    for (const [clueNumberStr, userAnswer] of Object.entries(answers)) {
      const clueNumber = parseInt(clueNumberStr);
      const clue = cluesData.find((c: PuzzleClue) => c.number === clueNumber);

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
    const allCluesCompleted = cluesData.every((clue: PuzzleClue) =>
      currentCompletedClues.includes(clue.number)
    );

    const updateData: {
      answersData: string;
      completedClues: string;
      updatedAt: Date;
      isCompleted?: boolean;
      completedAt?: Date;
      solveTime?: number;
    } = {
      answersData: JSON.stringify(currentAnswers),
      completedClues: JSON.stringify(currentCompletedClues),
      updatedAt: new Date()
    };

    if (allCluesCompleted && !progress.isCompleted) {
      updateData.isCompleted = true;
      updateData.completedAt = new Date();
      const startedAtMs = progress.startedAt?.getTime() ?? new Date().getTime();
      updateData.solveTime = Math.floor((new Date().getTime() - startedAtMs) / 1000);
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
        metadata: ua.metadataData ? safeJsonParse<Record<string, unknown> | null>(ua.metadataData, null, 'userAchievement.metadataData') : null
      }))
    });

  } catch (error) {
    console.error('Error validating answers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pure grid-based validation endpoint
router.post('/validate-grid', authenticateToken, puzzleValidationSchemas.validateGridAnswers, async (req: AuthenticatedRequest, res: Response) => {
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
    const cluesData = safeJsonParse<PuzzleClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');
    const solutionGrid = safeJsonParse<PuzzleGrid>(puzzle.gridData, [], 'puzzle.gridData');
    const currentCompletedClues = safeJsonParse<number[]>(progress.completedClues, [], 'progress.completedClues');

    // Use shared validation logic
    const validationResult = validateGrid(gridData, solutionGrid, cluesData, currentCompletedClues);

    // Update completed clues list
    const allNewCompletedClues = [...currentCompletedClues, ...validationResult.newCompletedClues];

    // Check if puzzle is completed
    const allCluesCompleted = cluesData.every((clue: PuzzleClue) =>
      allNewCompletedClues.includes(clue.number)
    );

    // Merge new validation results into the persisted validatedClues map so
    // the previous Check & Save state (incorrect words highlighted in red) is
    // restored on reload. completedClues stays the union of all green pills.
    const previousValidatedClues = safeJsonParse<Record<string, boolean>>(
      progress.validatedClues,
      {},
      'progress.validatedClues',
    );
    const mergedValidatedClues: Record<string, boolean> = { ...previousValidatedClues };
    for (const [clueNumberStr, isCorrect] of Object.entries(validationResult.clueResults)) {
      mergedValidatedClues[clueNumberStr] = isCorrect;
    }

    // Update progress (store solved clues for UI compatibility and grid state)
    const updateData: {
      answersData: string;
      gridData: string;
      completedClues: string;
      validatedClues: string;
      updatedAt: Date;
      isCompleted?: boolean;
      completedAt?: Date;
      solveTime?: number;
    } = {
      answersData: JSON.stringify(validationResult.solvedClues),
      gridData: JSON.stringify(sanitizeGridForPersistence(gridData)),
      completedClues: JSON.stringify(allNewCompletedClues),
      validatedClues: JSON.stringify(mergedValidatedClues),
      updatedAt: new Date()
    };

    if (allCluesCompleted && !progress.isCompleted) {
      updateData.isCompleted = true;
      updateData.completedAt = new Date();
      const startedAtMs = progress.startedAt?.getTime() ?? new Date().getTime();
      updateData.solveTime = Math.floor((new Date().getTime() - startedAtMs) / 1000);
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
      results: validationResult.clueResults,     // Per-clue validation results from this check
      validatedClues: mergedValidatedClues,      // Persisted union of all checks so far
      cellValidation: validationResult.cellValidation, // Per-cell (kept for back-compat / dev tools)
      newCompletedClues: validationResult.newCompletedClues,
      completedClues: allNewCompletedClues,
      isCompleted: progress.isCompleted,
      solveTime: progress.solveTime,
      solvedClues: validationResult.solvedClues, // Extracted clue answers for UI display only
      validatedGrid: gridData,   // Return the validated grid
      newAchievements: newAchievements.map(ua => ({
        id: ua.id,
        achievement: ua.achievementId,
        earnedAt: ua.earnedAt,
        metadata: ua.metadataData ? safeJsonParse<Record<string, unknown> | null>(ua.metadataData, null, 'userAchievement.metadataData') : null
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
        validatedClues: {},
        revealedCells: {},
        usedHints: false,
        isCompleted: false,
        firstViewedAt: null
      });
    }

    res.json({
      answers: safeJsonParse<Record<string, string>>(progress.answersData, {}, 'progress.answersData'),
      gridData: progress.gridData ? safeJsonParse<UserAnswerGrid | null>(progress.gridData, null, 'progress.gridData') : null,
      completedClues: safeJsonParse<number[]>(progress.completedClues, [], 'progress.completedClues'),
      validatedClues: safeJsonParse<Record<number, boolean>>(progress.validatedClues, {}, 'progress.validatedClues'),
      revealedCells: safeJsonParse<Record<string, number>>(progress.revealedCells, {}, 'progress.revealedCells'),
      usedHints: progress.usedHints,
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

// Reveal one letter from a clue's answer. Each reveal:
//   * locks the revealed cell (frontend treats it as completed-correct so the
//     locked-cell navigation rules apply automatically).
//   * sets UserProgress.usedHints = true — this puzzle is no longer eligible
//     for any achievement awards (mirrors auto-solve).
//   * is rate-limited per puzzle: REVEAL_LETTER_COOLDOWN_SECONDS between
//     reveals, REVEAL_LETTER_DAILY_CAP total reveals.
router.post(
  '/reveal-letter',
  authenticateToken,
  puzzleValidationSchemas.revealLetter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { puzzleDate, clueNumber } = req.body as {
        puzzleDate: string;
        clueNumber: number;
      };
      const user = req.user as User;

      const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: puzzleDate } });
      if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });

      const cluesData = safeJsonParse<PuzzleClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');
      const solutionGrid = safeJsonParse<PuzzleGrid>(puzzle.gridData, [], 'puzzle.gridData');
      const clue = cluesData.find((c) => c.number === clueNumber);
      if (!clue) return res.status(404).json({ error: 'Clue not found' });

      let progress = await prisma.userProgress.upsert({
        where: {
          userId_puzzleDate: { userId: user.id, puzzleDate },
        },
        update: {},
        create: {
          userId: user.id,
          puzzleDate,
          answersData: '{}',
          gridData: null,
          completedClues: '[]',
          isCompleted: false,
        },
      });

      // Cooldown + daily cap.
      const cooldownSeconds = parseInt(process.env.REVEAL_LETTER_COOLDOWN_SECONDS || '60', 10);
      const dailyCap = parseInt(process.env.REVEAL_LETTER_DAILY_CAP || '5', 10);

      if (progress.dailyRevealCount >= dailyCap) {
        return res.status(429).json({
          error: 'REVEAL_LIMIT',
          message: `You've already revealed ${dailyCap} letters on this puzzle.`,
        });
      }
      if (progress.lastRevealAt) {
        const elapsedMs = Date.now() - new Date(progress.lastRevealAt).getTime();
        if (elapsedMs < cooldownSeconds * 1000) {
          const remainingSeconds = Math.ceil((cooldownSeconds * 1000 - elapsedMs) / 1000);
          return res.status(429).json({
            error: 'REVEAL_COOLDOWN',
            message: `Wait ${remainingSeconds}s before another reveal.`,
            remainingSeconds,
          });
        }
      }

      // Find the first cell of this clue that isn't already revealed AND
      // doesn't already have the correct letter typed by the user. If every
      // cell is already correct (the user effectively solved the word), we
      // bail rather than waste a hint.
      const revealedCells = safeJsonParse<Record<string, number>>(
        progress.revealedCells,
        {},
        'progress.revealedCells',
      );
      const userGrid = progress.gridData
        ? safeJsonParse<UserAnswerGrid | null>(progress.gridData, null, 'progress.gridData')
        : null;

      let target: { row: number; col: number; letter: string } | null = null;
      for (let i = 0; i < clue.length; i++) {
        const row = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
        const col = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
        const key = `${row},${col}`;
        if (revealedCells[key] !== undefined) continue;
        const solutionLetter = (solutionGrid[row]?.[col]?.letter || '').toUpperCase();
        if (!solutionLetter) continue;
        const userLetter = (userGrid?.[row]?.[col]?.letter || '').toUpperCase();
        if (userLetter === solutionLetter) continue;
        target = { row, col, letter: solutionLetter };
        break;
      }

      if (!target) {
        return res.status(400).json({
          error: 'NO_CELL_TO_REVEAL',
          message: 'Every cell in this word is already filled correctly or revealed.',
        });
      }

      // Persist: bump usedHints, write the revealed letter into gridData so
      // it's there on reload, and grow the revealedCells map.
      revealedCells[`${target.row},${target.col}`] = clueNumber;
      const baseGrid: UserAnswerGrid =
        userGrid && userGrid.length === solutionGrid.length
          ? userGrid.map((row) => row.map((cell) => ({ letter: cell?.letter ?? '' })))
          : solutionGrid.map((row) => row.map(() => ({ letter: '' })));
      baseGrid[target.row][target.col] = { letter: target.letter };

      progress = await prisma.userProgress.update({
        where: { id: progress.id },
        data: {
          gridData: JSON.stringify(baseGrid),
          revealedCells: JSON.stringify(revealedCells),
          usedHints: true,
          lastRevealAt: new Date(),
          dailyRevealCount: progress.dailyRevealCount + 1,
          updatedAt: new Date(),
        },
      });

      res.json({
        row: target.row,
        col: target.col,
        letter: target.letter,
        clueNumber,
        revealedCells,
        usedHints: true,
        dailyRevealCount: progress.dailyRevealCount,
        dailyCap,
      });
    } catch (error) {
      console.error('Error revealing letter:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Auto-solve puzzle (reveals all answers, no achievements/points)
router.post('/auto-solve', authenticateToken, rateLimiters.puzzleGeneration, async (req: AuthenticatedRequest, res) => {
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
    // 5 minutes (0.083 hours) in dev, default 6 hours in production.
    const cooldownHours = process.env.NODE_ENV === 'development'
      ? 5 / 60
      : parseFloat(process.env.AUTO_SOLVE_COOLDOWN_HOURS || '6');
    
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
    const cluesData = safeJsonParse<PuzzleClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');
    const solutionGrid = safeJsonParse<PuzzleGrid>(puzzle.gridData, [], 'puzzle.gridData');

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

    // Every clue is correct when auto-solving — mark them all in validatedClues
    // so a reload paints every word green via the new cellWordStatus pipeline.
    const autoSolveValidatedClues: Record<string, boolean> = {};
    for (const clue of cluesData) {
      autoSolveValidatedClues[clue.number.toString()] = true;
    }

    // Update progress with auto-solved state (no achievements/points)
    const updateData = {
      answersData: JSON.stringify(validationResult.solvedClues),
      gridData: JSON.stringify(sanitizeGridForPersistence(completeSolutionGrid)),
      completedClues: JSON.stringify(validationResult.newCompletedClues),
      validatedClues: JSON.stringify(autoSolveValidatedClues),
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
      validatedClues: autoSolveValidatedClues,
      isCompleted: true,
      autoSolved: true, // Flag to indicate this was auto-solved
      cellValidation, // Cell-level validation results (legacy; UI now uses word status)
      validatedGrid: completeSolutionGrid, // The complete solution grid
      results: validationResult.clueResults // Per-clue validation results
    });

  } catch (error) {
    console.error('Error auto-solving puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate multi-category puzzle with streaming progress
router.post('/generate-multi-category-stream', (req, res, next) => {
  // Manual validation using Joi for this special SSE endpoint
  const { error } = joiSchemas.multiCategoryGeneration.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
}, async (req, res) => {
  console.log(`🚀 MULTI-CATEGORY STREAMING ENDPOINT CALLED!`);
  try {
    const { categoryNames, token } = req.body;
    console.log(`🔐 Token received: ${token ? 'YES' : 'NO'}`);
    console.log(`📚 Categories: ${categoryNames?.join(', ')}`);

    // Manual token authentication for SSE
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let user: User | null = null;
    try {
      const decoded = verifyToken(token);
      user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!categoryNames || !Array.isArray(categoryNames) || categoryNames.length === 0) {
      return res.status(400).json({ error: 'Category names array is required' });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Track client disconnect so the long-running generator can bail instead
    // of burning CPU writing into a closed socket. The progressCallback below
    // checks this flag; if a deeper abort is later wired into the generator
    // itself, plumb an AbortController through here.
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    const sendUpdate = (
      stage: string,
      progress: number,
      attempt?: number,
      tier?: number,
    ) => {
      if (clientDisconnected || res.writableEnded) return;
      const messages: Record<string, string> = {
        'initialization': `🚀 Combining ${categoryNames.length} categories into one cosmic puzzle...`,
        'loading_dictionary': `📚 Loading words from ${categoryNames.join(', ')}...`,
        'filtering_category': `🔍 Merging ${categoryNames.length} category vocabularies...`,
        'starting_generation': '🧩 Starting multi-category puzzle generation...',
        'attempt_10': '🎯 Placing words from different categories...',
        'attempt_50': '🤔 Balancing category representation...',
        'attempt_100': '😅 This multi-category mix is challenging...',
        'attempt_200': '🙄 The categories are being stubborn about mingling...',
        'word_reduction': `📉 Adjusting word targets (attempt ${attempt || 0})...`,
        'fallback_start': '🔄 Switching to smaller grid for better fit...',
        'retry_tier': `🔧 Retrying with a sparser grid (tier ${tier || '?'})...`,
        'building_grid': '🏗️ Constructing the multi-category grid...',
        'finalizing': '✨ Adding finishing touches...',
        'saving': '💾 Saving your multi-category masterpiece...',
      };

      const message = messages[stage] || `Processing ${stage}...`;
      res.write(`data: ${JSON.stringify({ stage, progress, message, attempt, tier })}\n\n`);
    };

    console.log(`🎯 Generating multi-category puzzle for: ${categoryNames.join(', ')}`);
    sendUpdate('initialization', 5);

    // Generate a unique identifier for this multi-category puzzle
    const today = new Date().toISOString().split('T')[0];
    const categoryId = categoryNames.map(name => name.toLowerCase().replace(/\s+/g, '-')).sort().join('-');
    const categoryDate = `${today}-multi-${categoryId}`;
    
    try {
      sendUpdate('loading_dictionary', 10);
      sendUpdate('filtering_category', 20);
      sendUpdate('starting_generation', 30);

      // Import and create generator with multiple categories
      const StrictCrosswordModule = await import('../services/puzzle/strictCrosswordGenerator');
      const generator = new StrictCrosswordModule.StrictCrosswordGenerator(categoryDate, categoryNames);
      
      console.log(`📡 SSE: Starting multi-category generation`);

      // Progress tracking. Now also handles 'retry_tier' events emitted by the
      // tier ladder in strictCrosswordGenerator.
      let lastProgress = 30;
      let highestTier = 1;
      const progressCallback = async (
        stage: string,
        attempt: number,
        _targetWords: number,
        phase: 'normal' | 'fallback',
        tier?: number,
      ) => {
        if (clientDisconnected) {
          throw new Error('client disconnected');
        }
        if (tier && tier > highestTier) highestTier = tier;

        if (stage === 'retry_tier') {
          // Bump progress a bit so the user sees motion when the ladder advances.
          lastProgress = Math.min(90, lastProgress + 5);
          sendUpdate('retry_tier', lastProgress, attempt, tier);
          return;
        }

        let progress = lastProgress;

        if (phase === 'normal') {
          if (attempt <= 50) {
            progress = 30 + (attempt / 50) * 20;
            if (attempt >= 10) sendUpdate('attempt_10', progress, attempt, tier);
          } else if (attempt <= 100) {
            progress = 50 + ((attempt - 50) / 50) * 15;
            if (attempt === 51) sendUpdate('attempt_50', progress, attempt, tier);
          } else if (attempt <= 200) {
            progress = 65 + ((attempt - 100) / 100) * 10;
            if (attempt === 101) sendUpdate('attempt_100', progress, attempt, tier);
          } else {
            progress = 75 + Math.min(15, (attempt - 200) / 20);
            if (attempt === 201) sendUpdate('attempt_200', progress, attempt, tier);
          }
        } else {
          progress = 80 + Math.min(15, attempt / 10);
          if (attempt === 1) sendUpdate('fallback_start', progress, attempt, tier);
        }

        if (stage === 'word_reduction') {
          sendUpdate('word_reduction', progress, attempt, tier);
        }

        lastProgress = Math.min(95, progress);
      };

      // Generate the puzzle with progress tracking
      const generatedPuzzle = await generator.generateWithCallbackAsync(progressCallback);
      const generatedAtTier = highestTier;

      if (clientDisconnected) {
        // Client left while the generator was still running. Don't persist
        // the puzzle — the user can't see it and we have no way to associate
        // it with their next session. Just clean up the response.
        return;
      }

      sendUpdate('finalizing', 95);
      sendUpdate('saving', 96);
      
      // Create puzzle date with multi-category identifier
      const puzzleDate = new Date().toISOString().split('T')[0] + `-multi-${categoryId}`;
      
      // Check for existing puzzle
      const existingPuzzle = await prisma.dailyPuzzle.findUnique({ 
        where: { date: puzzleDate } 
      });

      if (existingPuzzle) {
        // Delete the old puzzle to replace it
        await prisma.dailyPuzzle.delete({
          where: { date: puzzleDate }
        });
      }

      // Store the new multi-category puzzle
      await prisma.dailyPuzzle.create({
        data: {
          date: puzzleDate,
          gridData: JSON.stringify(generatedPuzzle.grid),
          cluesData: JSON.stringify(generatedPuzzle.clues),
          rows: generatedPuzzle.size.rows,
          cols: generatedPuzzle.size.cols,
          createdAt: new Date()
        }
      });

      sendUpdate('complete', 100);

      res.write(`data: ${JSON.stringify({
        success: true,
        message: `Multi-category puzzle generated with ${categoryNames.length} categories!`,
        puzzleDate,
        wordCount: generatedPuzzle.clues.length,
        categories: categoryNames,
        tier: generatedAtTier,
        relaxedConstraints: generatedAtTier > 1,
      })}\n\n`);

      console.log(`✅ Multi-category puzzle generated successfully (tier ${generatedAtTier})`);

    } catch (generateError) {
      console.error('Error generating multi-category puzzle:', generateError);
      res.write(`data: ${JSON.stringify({ 
        error: true, 
        message: 'Failed to generate multi-category puzzle. The categories might be too restrictive.' 
      })}\n\n`);
    } finally {
      res.end();
    }

  } catch (error) {
    console.error('Error in multi-category stream endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate category-specific puzzle with streaming progress
router.get('/generate-category-stream/:categoryName', async (req, res) => {
  console.log(`🚀 STREAMING ENDPOINT CALLED! Category: ${req.params.categoryName}`);
  try {
    const { categoryName } = req.params;
    const { token } = req.query;
    console.log(`🔐 Token received: ${token ? 'YES' : 'NO'}`);

    // Manual token authentication for SSE (can't use middleware due to EventSource limitations)
    if (!token || typeof token !== 'string') {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Authentication token required' });
    }

    // Verify the token manually
    let user: User;
    try {
      const decoded = verifyToken(token);
      const found = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!found) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      user = found;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!categoryName) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    // Cheeky messages that get progressively more pessimistic
    const progressMessages = [
      { stage: 'initialization', message: '🚀 Warming up the cosmic dictionary engine... This should be easy!' },
      { stage: 'loading_dictionary', message: '📚 Loading galactic word database... Piece of cake!' },
      { stage: 'filtering_category', message: `🔍 Filtering for "${categoryName}" words... Found some gems!` },
      { stage: 'starting_generation', message: '🧩 Starting puzzle generation... Here we go!' },
      { stage: 'attempt_10', message: '🎯 Attempting word placements... Still optimistic!' },
      { stage: 'attempt_50', message: '🤔 Hmm, a few more tries should do it...' },
      { stage: 'attempt_100', message: '😅 Okay, this is taking longer than expected...' },
      { stage: 'attempt_200', message: '🙄 The cosmic forces are being difficult today...' },
      { stage: 'word_reduction', message: '📉 Fine, we\'ll settle for fewer words. Quality over quantity!' },
      { stage: 'attempt_300', message: '😤 Starting to question my life choices as an AI...' },
      { stage: 'attempt_400', message: '🤯 This category is more stubborn than a black hole!' },
      { stage: 'fallback_phase', message: '💸 Deploying emergency fallback protocol... (a.k.a. panic mode)' },
      { stage: 'smaller_grid', message: '🗜️ Maybe a smaller grid will cooperate better...' },
      { stage: 'fallback_attempt_100', message: '🆘 Even the backup plan is struggling... send help!' },
      { stage: 'fallback_attempt_200', message: '☠️ I am becoming one with the void of failed crosswords...' },
      { stage: 'last_resort', message: '🙏 Praying to the gods of word puzzles...' },
      { stage: 'success', message: '🎉 FINALLY! Against all odds, we have a puzzle!' },
      { stage: 'saving', message: '💾 Saving this miraculous creation to the database...' },
      { stage: 'complete', message: '✨ Mission accomplished! Launching your cosmic crossword...' }
    ];

    const sendUpdate = (
      stage: string,
      progress: number,
      attempt?: number,
      tier?: number,
    ) => {
      if (clientDisconnected || res.writableEnded) return;
      const messageObj = progressMessages.find(m => m.stage === stage);
      let message = messageObj?.message || `Working on ${stage}...`;
      if (stage === 'retry_tier') {
        message = `🔧 Retrying with a sparser grid (tier ${tier || '?'})...`;
      }

      if (attempt) {
        message = message.replace(/\.\.\.$/, ` (attempt ${attempt})...`);
      }

      const data = { stage, progress, message, attempt, tier };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    console.log(`🎯 Generating category puzzle for: ${categoryName}`);
    sendUpdate('initialization', 5);

    // Generate a unique date string for this category puzzle
    const categoryDate = `category-${categoryName}-${Date.now()}`;
    
    try {
      sendUpdate('loading_dictionary', 10);
      sendUpdate('filtering_category', 20);
      sendUpdate('starting_generation', 30);

      // Import the generator class to access progress updates
      const StrictCrosswordModule = await import('../services/puzzle/strictCrosswordGenerator');
      const generator = new StrictCrosswordModule.StrictCrosswordGenerator(categoryDate, categoryName);
      
      console.log(`📡 SSE: Starting generation for ${categoryName}`);

      // Set up progress tracking
      let lastProgress = 30;
      let highestTier = 1;
      const progressCallback = async (
        stage: string,
        attempt: number,
        _targetWords: number,
        phase: 'normal' | 'fallback',
        tier?: number,
      ) => {
        if (clientDisconnected) {
          throw new Error('client disconnected');
        }
        if (tier && tier > highestTier) highestTier = tier;

        if (stage === 'retry_tier') {
          lastProgress = Math.min(90, lastProgress + 5);
          sendUpdate('retry_tier', lastProgress, attempt, tier);
          return;
        }

        let progress = lastProgress;

        if (phase === 'normal') {
          if (attempt <= 50) {
            progress = 30 + (attempt / 50) * 20;
            if (attempt >= 10) sendUpdate('attempt_10', progress, attempt, tier);
          } else if (attempt <= 100) {
            progress = 50 + ((attempt - 50) / 50) * 10;
            if (attempt >= 50) sendUpdate('attempt_50', progress, attempt, tier);
          } else if (attempt <= 200) {
            progress = 60 + ((attempt - 100) / 100) * 10;
            if (attempt >= 100) sendUpdate('attempt_100', progress, attempt, tier);
          } else {
            progress = 70 + ((attempt - 200) / 300) * 10;
            if (attempt >= 200) sendUpdate('attempt_200', progress, attempt, tier);
            if (attempt >= 300) sendUpdate('attempt_300', progress, attempt, tier);
            if (attempt >= 400) sendUpdate('attempt_400', progress, attempt, tier);
          }

          if (stage === 'word_reduction') {
            sendUpdate('word_reduction', progress, attempt, tier);
          }
        } else {
          if (stage === 'fallback_start') {
            progress = 80;
            sendUpdate('fallback_phase', progress, attempt, tier);
            sendUpdate('smaller_grid', progress + 2, attempt, tier);
          } else if (stage === 'fallback_generation') {
            progress = 82 + (attempt / 500) * 10;
            if (attempt >= 100) sendUpdate('fallback_attempt_100', progress, attempt, tier);
            if (attempt >= 200) sendUpdate('fallback_attempt_200', progress, attempt, tier);
            if (attempt >= 400) sendUpdate('last_resort', progress, attempt, tier);
          } else if (stage === 'fallback_word_reduction') {
            sendUpdate('fallback_word_reduction', progress, attempt, tier);
          }
        }

        lastProgress = Math.min(progress, 92);
      };

      // Generate the puzzle with async progress callback
      const generatedPuzzle = await generator.generateWithCallbackAsync(progressCallback);
      const generatedAtTier = highestTier;

      if (clientDisconnected) {
        // Client disconnected during generation — skip persistence.
        return;
      }

      sendUpdate('success', 93);

      // Store the puzzle in database
      sendUpdate('saving', 96);
      const puzzleDate = new Date().toISOString().split('T')[0] + `-cat-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Check if this category puzzle already exists for today
      const existingPuzzle = await prisma.dailyPuzzle.findUnique({ 
        where: { date: puzzleDate } 
      });

      if (existingPuzzle) {
        await prisma.dailyPuzzle.delete({ where: { date: puzzleDate } });
      }

      // Create the new puzzle
      const puzzle = await prisma.dailyPuzzle.create({
        data: {
          date: puzzleDate,
          gridData: JSON.stringify(generatedPuzzle.grid),
          cluesData: JSON.stringify(generatedPuzzle.clues),
          rows: generatedPuzzle.size.rows,
          cols: generatedPuzzle.size.cols
        }
      });

      // Create or update user's progress for this puzzle
      await prisma.userProgress.upsert({
        where: {
          userId_puzzleDate: {
            userId: user.id,
            puzzleDate
          }
        },
        update: {
          answersData: '{}',
          completedClues: '[]',
          isCompleted: false
        },
        create: {
          userId: user.id,
          puzzleDate,
          answersData: '{}',
          completedClues: '[]',
          isCompleted: false
        }
      });

      sendUpdate('complete', 100);

      // Send final success message
      res.write(`data: ${JSON.stringify({
        success: true,
        message: `Category puzzle for "${categoryName}" generated successfully!`,
        puzzleDate,
        wordCount: generatedPuzzle.clues.length,
        tier: generatedAtTier,
        relaxedConstraints: generatedAtTier > 1,
      })}\n\n`);

      console.log(`✅ Category puzzle generated successfully for ${categoryName} (tier ${generatedAtTier})`);

    } catch (generateError) {
      console.error('Error generating category puzzle:', generateError);
      res.write(`data: ${JSON.stringify({ 
        error: true, 
        message: 'The cosmic forces have defeated us... This category might not have enough words to create a proper crossword.' 
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Error in generate-category-stream endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate category-specific puzzle (non-streaming fallback)
router.post('/generate-category', authenticateToken, rateLimiters.puzzleGeneration, puzzleValidationSchemas.generateCategoryPuzzle, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryName } = req.body;
    const user = req.user as User;

    if (!categoryName) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    console.log(`🎯 Generating category puzzle for: ${categoryName}`);

    // Generate a unique date string for this category puzzle
    const categoryDate = `category-${categoryName}-${Date.now()}`;
    
    try {
      // Generate the puzzle using the strict generator with category filter
      const generatedPuzzle = generateStrictPuzzle(categoryDate, categoryName);

      // Store the puzzle in database with a special category date format
      const puzzleDate = new Date().toISOString().split('T')[0] + `-cat-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Check if this category puzzle already exists for today
      const existingPuzzle = await prisma.dailyPuzzle.findUnique({ 
        where: { date: puzzleDate } 
      });

      if (existingPuzzle) {
        // Delete existing puzzle to replace with new one
        await prisma.dailyPuzzle.delete({ where: { date: puzzleDate } });
      }

      // Create the new puzzle
      const puzzle = await prisma.dailyPuzzle.create({
        data: {
          date: puzzleDate,
          gridData: JSON.stringify(generatedPuzzle.grid),
          cluesData: JSON.stringify(generatedPuzzle.clues),
          rows: generatedPuzzle.size.rows,
          cols: generatedPuzzle.size.cols
        }
      });

      // Create or update user's progress for this puzzle
      await prisma.userProgress.upsert({
        where: {
          userId_puzzleDate: {
            userId: user.id,
            puzzleDate
          }
        },
        update: {
          answersData: '{}',
          completedClues: '[]',
          isCompleted: false
        },
        create: {
          userId: user.id,
          puzzleDate,
          answersData: '{}',
          completedClues: '[]',
          isCompleted: false
        }
      });

      console.log(`✅ Category puzzle generated successfully for ${categoryName}`);

      res.json({
        success: true,
        message: `Category puzzle for "${categoryName}" generated successfully`,
        puzzleDate,
        wordCount: generatedPuzzle.clues.length
      });

    } catch (generateError) {
      console.error('Error generating category puzzle:', generateError);
      return res.status(500).json({ 
        error: 'Failed to generate puzzle for this category. The category might not have enough words or there might be technical issues.' 
      });
    }

  } catch (error) {
    console.error('Error in generate-category endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific puzzle by date
router.get('/specific/:date', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { date } = req.params;
    const user = req.user as User;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get specific puzzle
    const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date } });

    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found for the specified date' });
    }

    // Get or create user's progress for this puzzle using upsert
    const progress = await prisma.userProgress.upsert({
      where: { 
        userId_puzzleDate: {
          userId: user.id, 
          puzzleDate: date 
        }
      },
      update: {}, // Don't update anything if it already exists
      create: {
        userId: user.id,
        puzzleDate: date,
        answersData: '{}',
        completedClues: '[]',
        isCompleted: false
      }
    });

    // Parse puzzle data
    const gridData = safeJsonParse<PuzzleGrid>(puzzle.gridData, [], 'puzzle.gridData');
    const cluesData = safeJsonParse<PuzzleClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');

    res.json({
      puzzle: {
        date: puzzle.date,
        grid: gridData,
        clues: cluesData,
      },
      progress: {
        answers: safeJsonParse<Record<string, string>>(progress.answersData, {}, 'progress.answersData'),
        gridData: progress.gridData ? safeJsonParse<UserAnswerGrid | null>(progress.gridData, null, 'progress.gridData') : null,
        completedClues: safeJsonParse<number[]>(progress.completedClues, [], 'progress.completedClues'),
        validatedClues: safeJsonParse<Record<number, boolean>>(progress.validatedClues, {}, 'progress.validatedClues'),
        revealedCells: safeJsonParse<Record<string, number>>(progress.revealedCells, {}, 'progress.revealedCells'),
        usedHints: progress.usedHints,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt,
        solveTime: progress.solveTime,
        firstViewedAt: progress.firstViewedAt
      }
    });

  } catch (error) {
    console.error('Error fetching specific puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent category puzzles for dropdown
router.get('/recent-category', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as User;

    // Get recent category puzzles (puzzles with 'cat-' in the date)
    const recentPuzzles = await prisma.dailyPuzzle.findMany({
      where: {
        date: {
          contains: '-cat-'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Transform the data to extract category name and word count
    const puzzleData = await Promise.all(
      recentPuzzles.map(async (puzzle) => {
        // Extract category name from date format: "2024-01-01-cat-technology"
        const categoryMatch = puzzle.date.match(/-cat-(.+)$/);
        const categoryName = categoryMatch ? categoryMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
        
        // Get word count from clues data
        const cluesData = safeJsonParse<PuzzleClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');
        const wordCount = cluesData.length;

        return {
          puzzleDate: puzzle.date,
          categoryName,
          wordCount
        };
      })
    );

    res.json({
      recentPuzzles: puzzleData
    });

  } catch (error) {
    console.error('Error fetching recent category puzzles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple SSE test endpoint
router.get('/test-sse', (req, res) => {
  console.log('🧪 Test SSE endpoint called');
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    const data = {
      message: `Test message ${counter}`,
      progress: counter * 10,
      timestamp: new Date().toISOString()
    };
    
    console.log(`🧪 Sending test data:`, data);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    
    if (counter >= 10) {
      console.log('🧪 Test SSE complete');
      res.write(`data: ${JSON.stringify({ complete: true })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 1000);

  req.on('close', () => {
    console.log('🧪 Test SSE connection closed');
    clearInterval(interval);
  });
});

export default router;