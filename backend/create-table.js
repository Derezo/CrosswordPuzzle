const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUserFavoriteCategoriesTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_favorite_categories (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, categoryId)
      );
    `;
    console.log('✅ user_favorite_categories table created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUserFavoriteCategoriesTable();