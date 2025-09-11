import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { categoryValidationSchemas } from '../middleware/validation';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const router = Router();

// CSV file path - use absolute path from project root
const csvPath = path.join(process.cwd(), 'src/data/crossword_dictionary_with_clues.csv');

// Cache for categories to avoid repeated CSV parsing
let categoriesCache: any[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to load and parse categories from CSV
const loadCategoriesFromCSV = () => {
  try {
    if (categoriesCache.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return categoriesCache;
    }

    console.log('🔍 Loading categories from CSV...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { 
      columns: true, 
      skip_empty_lines: true,
      skip_records_with_error: true,  // Skip invalid rows instead of failing
      relax_column_count: true        // Allow rows with different column counts
    });

    // Count words per category
    const categoryStats = new Map<string, { name: string; wordCount: number; words: any[] }>();
    
    records.forEach((record: any) => {
      if (record.categories && record.categories.trim()) {
        const categories = record.categories.split(',').map((cat: string) => cat.trim());
        categories.forEach((categoryName: string) => {
          if (categoryName) {
            const key = categoryName.toLowerCase();
            if (!categoryStats.has(key)) {
              categoryStats.set(key, {
                name: categoryName,
                wordCount: 0,
                words: []
              });
            }
            const stats = categoryStats.get(key)!;
            stats.wordCount++;
            stats.words.push({
              word: record.word,
              clue: record.clue,
              isCommon: record.is_common_english === 'True',
              length: record.word.length
            });
          }
        });
      }
    });

    // Convert to array and create category objects
    const categories = Array.from(categoryStats.entries()).map(([key, stats]) => ({
      id: key,
      name: stats.name.charAt(0).toUpperCase() + stats.name.slice(1),
      description: `${stats.wordCount} crossword words related to ${stats.name}`,
      wordCount: stats.wordCount,
      favoritesCount: Math.floor(Math.random() * 10), // Mock favorites for now
      isActive: stats.wordCount > 5, // Only show categories with more than 5 words
      createdAt: new Date().toISOString()
    }));

    // Sort by word count descending
    categories.sort((a, b) => b.wordCount - a.wordCount);

    categoriesCache = categories;
    cacheTimestamp = Date.now();
    console.log(`✅ Loaded ${categories.length} categories from CSV`);
    
    return categories;
  } catch (error) {
    console.error('❌ Error loading categories from CSV:', error);
    return [];
  }
};

// Helper function to get words for a specific category
const getWordsForCategory = (categoryName: string, limit: number = 100, offset: number = 0) => {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { 
      columns: true, 
      skip_empty_lines: true,
      skip_records_with_error: true,  // Skip invalid rows instead of failing
      relax_column_count: true        // Allow rows with different column counts
    });

    const categoryNameLower = categoryName.toLowerCase();
    const words: any[] = [];
    
    records.forEach((record: any) => {
      if (record.categories && record.categories.trim()) {
        const categories = record.categories.split(',').map((cat: string) => cat.trim().toLowerCase());
        if (categories.includes(categoryNameLower)) {
          words.push({
            word: record.word,
            clue: record.clue,
            isCommon: record.is_common_english === 'True',
            length: record.word.length
          });
        }
      }
    });

    // Sort by word length and then alphabetically
    words.sort((a, b) => {
      if (a.word.length !== b.word.length) {
        return a.word.length - b.word.length;
      }
      return a.word.localeCompare(b.word);
    });

    const totalWords = words.length;
    const paginatedWords = words.slice(offset, offset + limit);
    const hasMore = offset + limit < totalWords;

    return {
      words: paginatedWords,
      totalWords,
      hasMore
    };
  } catch (error) {
    console.error('❌ Error getting words for category:', error);
    return {
      words: [],
      totalWords: 0,
      hasMore: false
    };
  }
};

// GET /api/categories - Get all categories with optional sorting and filtering
router.get('/', categoryValidationSchemas.getCategories, async (req, res) => {
  try {
    const { 
      sortBy = 'wordCount', 
      order = 'desc', 
      limit, 
      search,
      activeOnly = 'true'
    } = req.query;

    let categories = loadCategoriesFromCSV();
    
    // Filter by active status
    if (activeOnly === 'true') {
      categories = categories.filter(cat => cat.isActive);
    }
    
    // Filter by search term
    if (search && typeof search === 'string') {
      categories = categories.filter(cat => 
        cat.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort categories
    categories.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'wordCount') {
        comparison = a.wordCount - b.wordCount;
      } else if (sortBy === 'favoritesCount') {
        comparison = a.favoritesCount - b.favoritesCount;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return order === 'desc' ? -comparison : comparison;
    });

    // Apply limit
    if (limit) {
      categories = categories.slice(0, parseInt(limit as string));
    }

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });

  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// GET /api/categories/popular - Get most popular categories (by word count since we don't have real favorites)
router.get('/popular', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    
    const categories = loadCategoriesFromCSV();
    const popularCategories = categories
      .filter(cat => cat.isActive)
      .sort((a, b) => b.wordCount - a.wordCount) // Sort by word count as proxy for popularity
      .slice(0, parseInt(limit as string))
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        wordCount: cat.wordCount,
        favoritesCount: cat.favoritesCount
      }));

    res.json({
      success: true,
      data: popularCategories
    });

  } catch (error) {
    console.error('❌ Error fetching popular categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular categories'
    });
  }
});

// GET /api/categories/stats - Get category statistics
router.get('/stats', async (req, res) => {
  try {
    const categories = loadCategoriesFromCSV();
    const activeCategories = categories.filter(cat => cat.isActive);
    
    const totalWords = activeCategories.reduce((sum, cat) => sum + cat.wordCount, 0);
    const totalFavorites = activeCategories.reduce((sum, cat) => sum + cat.favoritesCount, 0);
    
    const topCategory = activeCategories.length > 0 ? activeCategories[0] : null;
    const mostPopular = activeCategories.length > 0 
      ? activeCategories.reduce((max, cat) => cat.favoritesCount > max.favoritesCount ? cat : max)
      : null;

    res.json({
      success: true,
      data: {
        totalCategories: activeCategories.length,
        totalWords,
        totalFavorites,
        topCategory: topCategory ? {
          name: topCategory.name,
          wordCount: topCategory.wordCount
        } : null,
        mostPopular: mostPopular ? {
          name: mostPopular.name,
          favoritesCount: mostPopular.favoritesCount
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error fetching category stats:', error);
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

    // Check if category exists in CSV data
    const categories = loadCategoriesFromCSV();
    const category = categories.find(cat => cat.id === categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if user has already favorited this category
    const existingFavorite = await prisma.userFavoriteCategory.findUnique({
      where: {
        userId_categoryId: {
          userId: userId,
          categoryId: categoryId
        }
      }
    });

    let isFavorite = false;
    let message = '';

    if (existingFavorite) {
      // Remove from favorites
      await prisma.userFavoriteCategory.delete({
        where: {
          id: existingFavorite.id
        }
      });
      isFavorite = false;
      message = 'Category removed from favorites';
    } else {
      // Add to favorites
      await prisma.userFavoriteCategory.create({
        data: {
          userId: userId,
          categoryId: categoryId
        }
      });
      isFavorite = true;
      message = 'Category added to favorites';
    }
    
    res.json({
      success: true,
      isFavorite,
      categoryId: isFavorite ? categoryId : null,
      message
    });

  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite status'
    });
  }
});

// GET /api/categories/user/favorites - Get all user's favorite categories
router.get('/user/favorites', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's favorite categories from database
    const userFavorites = await prisma.userFavoriteCategory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Get categories data from CSV
    const categories = loadCategoriesFromCSV();
    
    // Match favorites with category data
    const favoriteCategories = userFavorites
      .map(fav => categories.find(cat => cat.id === fav.categoryId))
      .filter(Boolean); // Remove any null/undefined categories

    res.json({
      success: true,
      data: {
        favoriteCategories,
        favoriteIds: userFavorites.map(fav => fav.categoryId)
      },
      message: 'User favorite categories retrieved'
    });

  } catch (error) {
    console.error('❌ Error fetching user favorite categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite categories'
    });
  }
});

// GET /api/categories/user/favorite - Get user's favorite category (backwards compatibility)
router.get('/user/favorite', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    
    // First check new favorites system
    const userFavorites = await prisma.userFavoriteCategory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    let favoriteCategory = null;

    if (userFavorites.length > 0) {
      // Use the most recent favorite from new system
      const categories = loadCategoriesFromCSV();
      favoriteCategory = categories.find(cat => cat.id === userFavorites[0].categoryId);
    } else if (user.favoriteCategoryId) {
      // Fall back to old single favorite system
      const categories = loadCategoriesFromCSV();
      favoriteCategory = categories.find(cat => cat.id === user.favoriteCategoryId);
    }

    res.json({
      success: true,
      data: {
        favoriteCategory: favoriteCategory || null
      },
      message: 'User favorite category retrieved'
    });

  } catch (error) {
    console.error('❌ Error fetching user favorite category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite category'
    });
  }
});

// GET /api/categories/:id/words - Get all words for a specific category
router.get('/:id/words', categoryValidationSchemas.getCategoryWords, async (req, res) => {
  try {
    const { id: categoryId } = req.params;
    const { limit = '100', offset = '0' } = req.query;

    // Check if category exists
    const categories = loadCategoriesFromCSV();
    const category = categories.find(cat => cat.id === categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    const result = getWordsForCategory(categoryId, limitNum, offsetNum);

    res.json({
      success: true,
      data: {
        category: category.name,
        totalWords: result.totalWords,
        words: result.words,
        pagination: {
          offset: offsetNum,
          limit: limitNum,
          hasMore: result.hasMore
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching category words:', error);
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
    const { limit = '50', offset = '0' } = req.query;

    // Check if category exists
    const categories = loadCategoriesFromCSV();
    const category = categories.find(cat => cat.id === categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    // Search for puzzles containing words from this category
    const categoryNameLower = categoryId.toLowerCase();
    const puzzles = await prisma.dailyPuzzle.findMany({
      where: {
        OR: [
          {
            date: {
              contains: `-cat-${categoryNameLower}`
            }
          },
          {
            date: {
              contains: `-multi-${categoryNameLower}-`
            }
          }
        ]
      },
      select: {
        id: true,
        date: true,
        cluesData: true,
        rows: true,
        cols: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offsetNum,
      take: limitNum
    });

    // Parse clues to get counts
    const puzzleData = puzzles.map(puzzle => {
      let acrossCount = 0;
      let downCount = 0;
      
      try {
        const clues = JSON.parse(puzzle.cluesData as string);
        if (clues.across) acrossCount = Object.keys(clues.across).length;
        if (clues.down) downCount = Object.keys(clues.down).length;
      } catch (error) {
        console.warn('Failed to parse clues for puzzle:', puzzle.id);
      }

      return {
        id: puzzle.id,
        date: puzzle.date,
        acrossCount,
        downCount,
        totalClues: acrossCount + downCount,
        size: `${puzzle.rows}×${puzzle.cols}`
      };
    });

    const totalPuzzles = await prisma.dailyPuzzle.count({
      where: {
        OR: [
          {
            date: {
              contains: `-cat-${categoryNameLower}`
            }
          },
          {
            date: {
              contains: `-multi-${categoryNameLower}-`
            }
          }
        ]
      }
    });

    res.json({
      success: true,
      data: {
        category: category.name,
        totalPuzzles,
        puzzles: puzzleData,
        pagination: {
          offset: offsetNum,
          limit: limitNum,
          hasMore: offsetNum + limitNum < totalPuzzles
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching category puzzles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category puzzles'
    });
  }
});

export default router;