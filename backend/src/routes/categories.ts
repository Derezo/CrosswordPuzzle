import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const router = Router();

// GET /api/categories - Get all categories with optional sorting and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      sortBy = 'wordCount', 
      order = 'desc', 
      limit, 
      search,
      activeOnly = 'true'
    } = req.query;

    // Build where clause
    const whereClause: any = {};
    
    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }
    
    if (search && typeof search === 'string') {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Build order by clause
    const orderByClause: any = {};
    if (sortBy === 'wordCount') {
      orderByClause.wordCount = order;
    } else if (sortBy === 'favoritesCount') {
      orderByClause.favoritesCount = order;
    } else if (sortBy === 'name') {
      orderByClause.name = order;
    } else {
      orderByClause.wordCount = 'desc'; // Default
    }

    const categories = await prisma.puzzleCategory.findMany({
      where: whereClause,
      orderBy: orderByClause,
      take: limit ? parseInt(limit as string) : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        wordCount: true,
        favoritesCount: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// GET /api/categories/popular - Get most popular categories (by favorites)
router.get('/popular', async (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const popularCategories = await prisma.puzzleCategory.findMany({
      where: { isActive: true },
      orderBy: [
        { favoritesCount: 'desc' },
        { wordCount: 'desc' }
      ],
      take: parseInt(limit as string),
      select: {
        id: true,
        name: true,
        description: true,
        wordCount: true,
        favoritesCount: true
      }
    });

    res.json({
      success: true,
      data: popularCategories
    });

  } catch (error) {
    console.error('Error fetching popular categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular categories'
    });
  }
});

// GET /api/categories/stats - Get category statistics
router.get('/stats', async (req, res) => {
  try {
    const totalCategories = await prisma.puzzleCategory.count({
      where: { isActive: true }
    });

    const totalWords = await prisma.puzzleCategory.aggregate({
      where: { isActive: true },
      _sum: { wordCount: true }
    });

    const totalFavorites = await prisma.puzzleCategory.aggregate({
      where: { isActive: true },
      _sum: { favoritesCount: true }
    });

    const topCategory = await prisma.puzzleCategory.findFirst({
      where: { isActive: true },
      orderBy: { wordCount: 'desc' },
      select: { name: true, wordCount: true }
    });

    const mostPopular = await prisma.puzzleCategory.findFirst({
      where: { isActive: true },
      orderBy: { favoritesCount: 'desc' },
      select: { name: true, favoritesCount: true }
    });

    res.json({
      success: true,
      data: {
        totalCategories,
        totalWords: totalWords._sum.wordCount || 0,
        totalFavorites: totalFavorites._sum.favoritesCount || 0,
        topCategory,
        mostPopular
      }
    });

  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics'
    });
  }
});

// PUT /api/categories/:id/favorite - Toggle favorite status for authenticated user
router.put('/:id/favorite', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id: categoryId } = req.params;
    const userId = req.user!.id;

    // Check if category exists
    const category = await prisma.puzzleCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { favoriteCategoryId: true }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isCurrentlyFavorite = currentUser.favoriteCategoryId === categoryId;
    const newFavoriteCategoryId = isCurrentlyFavorite ? null : categoryId;

    // Update user's favorite category
    await prisma.user.update({
      where: { id: userId },
      data: { favoriteCategoryId: newFavoriteCategoryId }
    });

    // Update favorites counts for affected categories
    if (isCurrentlyFavorite) {
      // Removing favorite - decrease count (ensure it doesn't go below 0)
      await prisma.puzzleCategory.update({
        where: { id: categoryId },
        data: { 
          favoritesCount: {
            decrement: 1
          }
        }
      });
      // Ensure count doesn't go negative
      await prisma.puzzleCategory.updateMany({
        where: { 
          id: categoryId,
          favoritesCount: { lt: 0 }
        },
        data: { favoritesCount: 0 }
      });
    } else {
      // Adding favorite - increase count for new category
      await prisma.puzzleCategory.update({
        where: { id: categoryId },
        data: { favoritesCount: { increment: 1 } }
      });

      // Decrease count for previous favorite if exists
      if (currentUser.favoriteCategoryId) {
        await prisma.puzzleCategory.update({
          where: { id: currentUser.favoriteCategoryId },
          data: { favoritesCount: { decrement: 1 } }
        });
        // Ensure previous favorite count doesn't go negative
        await prisma.puzzleCategory.updateMany({
          where: { 
            id: currentUser.favoriteCategoryId,
            favoritesCount: { lt: 0 }
          },
          data: { favoritesCount: 0 }
        });
      }
    }

    res.json({
      success: true,
      data: {
        isFavorite: !isCurrentlyFavorite,
        categoryId: newFavoriteCategoryId
      },
      message: isCurrentlyFavorite 
        ? 'Category removed from favorites' 
        : 'Category added to favorites'
    });

  } catch (error) {
    console.error('Error toggling category favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite category'
    });
  }
});

// GET /api/categories/user/favorite - Get current user's favorite category
router.get('/user/favorite', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favoriteCategory: {
          select: {
            id: true,
            name: true,
            description: true,
            wordCount: true,
            favoritesCount: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        favoriteCategory: user.favoriteCategory
      }
    });

  } catch (error) {
    console.error('Error fetching user favorite category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite category'
    });
  }
});

// GET /api/categories/:id/words - Get all words for a specific category
router.get('/:id/words', async (req, res) => {
  try {
    const { id: categoryId } = req.params;
    const { limit = '100', offset = '0' } = req.query;

    // Check if category exists
    const category = await prisma.puzzleCategory.findUnique({
      where: { id: categoryId },
      select: { name: true, wordCount: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Load words from CSV
    const csvPath = path.join(__dirname, '../../src/data/crossword_dictionary_with_clues.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });

    // Filter words for this category
    const categoryWords = records
      .filter((record: any) => {
        if (!record.categories) return false;
        const categories = record.categories.toLowerCase().split(',').map((cat: string) => cat.trim());
        return categories.includes(category.name.toLowerCase());
      })
      .filter((record: any) => {
        const word = record.word?.toUpperCase();
        return word && 
               word.length >= 3 && 
               word.length <= 15 &&
               /^[A-Z]+$/.test(word) &&
               record.clue &&
               record.obscure !== "True" &&
               record.obscure !== true;
      })
      .map((record: any) => ({
        word: record.word.toUpperCase(),
        clue: record.clue,
        isCommon: record.is_common_english === "True",
        length: record.word.length
      }))
      .sort((a: any, b: any) => {
        // Sort by commonality first, then alphabetically
        if (a.isCommon && !b.isCommon) return -1;
        if (!a.isCommon && b.isCommon) return 1;
        return a.word.localeCompare(b.word);
      });

    // Apply pagination
    const startIndex = parseInt(offset as string);
    const limitNum = parseInt(limit as string);
    const paginatedWords = categoryWords.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        category: category.name,
        totalWords: categoryWords.length,
        words: paginatedWords,
        pagination: {
          offset: startIndex,
          limit: limitNum,
          hasMore: startIndex + limitNum < categoryWords.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching category words:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category words'
    });
  }
});

// GET /api/categories/:id/puzzles - Get all puzzles for a specific category
router.get('/:id/puzzles', async (req, res) => {
  try {
    const { id: categoryId } = req.params;

    // Check if category exists
    const category = await prisma.puzzleCategory.findUnique({
      where: { id: categoryId },
      select: { name: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Find puzzles that contain this category name in their date
    // Category puzzles have dates like: "2025-09-10-cat-categoryname" or "2025-09-10-multi-category1-category2"
    const categoryNameLower = category.name.toLowerCase().replace(/\s+/g, '-');
    
    const puzzles = await prisma.dailyPuzzle.findMany({
      where: {
        OR: [
          { date: { contains: `-cat-${categoryNameLower}` } },
          { date: { contains: `-multi-${categoryNameLower}-` } },
          { date: { contains: `-${categoryNameLower}-` } },
          { date: { endsWith: `-${categoryNameLower}` } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: {
        date: true,
        rows: true,
        cols: true,
        cluesData: true,
        createdAt: true
      }
    });

    // Process puzzles to count clues
    const processedPuzzles = puzzles.map(puzzle => {
      let acrossCount = 0;
      let downCount = 0;
      
      try {
        const clues = JSON.parse(puzzle.cluesData);
        acrossCount = clues.filter((clue: any) => clue.direction === 'across').length;
        downCount = clues.filter((clue: any) => clue.direction === 'down').length;
      } catch (error) {
        console.error('Error parsing clues for puzzle:', puzzle.date);
      }

      return {
        date: puzzle.date,
        size: `${puzzle.rows}x${puzzle.cols}`,
        acrossClues: acrossCount,
        downClues: downCount,
        totalClues: acrossCount + downCount,
        createdAt: puzzle.createdAt,
        displayName: puzzle.date.includes('-multi-') ? 'Multi-Category' : 'Category Puzzle'
      };
    });

    res.json({
      success: true,
      data: {
        category: category.name,
        puzzles: processedPuzzles
      }
    });

  } catch (error) {
    console.error('Error fetching category puzzles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category puzzles'
    });
  }
});

export default router;