import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { suggestionValidationSchemas, commonValidations } from '../middleware/validation';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';

const router = Router();

// Submit a new suggestion
router.post('/submit', authenticateToken, suggestionValidationSchemas.submitSuggestion, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      puzzleDate, 
      clueNumber, 
      originalClue, 
      originalAnswer, 
      suggestedClue, 
      suggestedAnswer,
      comments
    } = req.body;
    const user = req.user as User;

    if (!suggestedClue && !suggestedAnswer && !comments) {
      return res.status(400).json({ 
        error: 'At least one suggestion (clue, answer, or comments) is required' 
      });
    }

    // Check if puzzle exists and get the puzzle ID
    const puzzle = await prisma.dailyPuzzle.findUnique({ 
      where: { date: puzzleDate } 
    });
    
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    // Create the suggestion
    const suggestion = await prisma.suggestion.create({
      data: {
        userId: user.id,
        puzzleId: puzzle.id,
        puzzleDate,
        clueNumber: parseInt(clueNumber),
        originalClue,
        originalAnswer: originalAnswer.toUpperCase(),
        suggestedClue: suggestedClue || null,
        suggestedAnswer: suggestedAnswer ? suggestedAnswer.toUpperCase() : null,
        comments: comments || null,
        status: 'pending'
      }
    });

    res.json({
      message: 'Suggestion submitted successfully',
      suggestion: {
        id: suggestion.id,
        clueNumber: suggestion.clueNumber,
        status: suggestion.status,
        createdAt: suggestion.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's suggestions
router.get('/my-suggestions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as User;
    
    const suggestions = await prisma.suggestion.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      suggestions: suggestions.map(s => ({
        id: s.id,
        puzzleId: s.puzzleId,
        puzzleDate: s.puzzleDate,
        clueNumber: s.clueNumber,
        originalClue: s.originalClue,
        originalAnswer: s.originalAnswer,
        suggestedClue: s.suggestedClue,
        suggestedAnswer: s.suggestedAnswer,
        comments: s.comments,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all suggestions (admin endpoint - would need role-based auth in production)
router.get('/all', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const suggestions = await prisma.suggestion.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        puzzle: {
          select: {
            id: true,
            date: true,
            rows: true,
            cols: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.suggestion.count({
      where: whereClause
    });

    res.json({
      suggestions: suggestions.map(s => ({
        id: s.id,
        puzzleId: s.puzzleId,
        puzzleDate: s.puzzleDate,
        clueNumber: s.clueNumber,
        originalClue: s.originalClue,
        originalAnswer: s.originalAnswer,
        suggestedClue: s.suggestedClue,
        suggestedAnswer: s.suggestedAnswer,
        comments: s.comments,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        user: s.user,
        puzzle: s.puzzle
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

  } catch (error) {
    console.error('Error fetching all suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;