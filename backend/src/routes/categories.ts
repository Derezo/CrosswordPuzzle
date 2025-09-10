import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

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

export default router;