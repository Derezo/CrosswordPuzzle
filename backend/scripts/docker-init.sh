#!/bin/bash

echo "🚀 Initializing Galactic Crossword Backend..."

# Ensure prisma directory exists with correct permissions
mkdir -p /app/prisma
chmod 755 /app/prisma

# Generate Prisma client if not exists
echo "📊 Generating Prisma client..."
npx prisma generate

# Push database schema to create tables
echo "🗄️ Setting up database schema..."
npx prisma db push --accept-data-loss

# Check if categories exist, if not populate them
echo "📚 Checking for existing categories..."
CATEGORY_COUNT=$(npx prisma-client-js -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function count() {
  const count = await prisma.puzzleCategory.count();
  console.log(count);
  await prisma.\$disconnect();
}
count();
" 2>/dev/null || echo "0")

if [ "$CATEGORY_COUNT" -eq "0" ]; then
  echo "🌌 Populating categories from dictionary..."
  npx ts-node src/scripts/populateCategories.ts
else
  echo "✅ Categories already exist ($CATEGORY_COUNT found)"
fi

# Create test user if it doesn't exist
echo "👤 Creating test user..."
npx ts-node -e "
import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@galacticcrossword.com' }
    });
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      await prisma.user.create({
        data: {
          email: 'test@galacticcrossword.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          points: 0
        }
      });
      console.log('✅ Test user created');
    } else {
      console.log('✅ Test user already exists');
    }
  } catch (error) {
    console.error('❌ Error with test user:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createTestUser();
"

echo "🎉 Database initialization complete!"

# Start the development server
echo "🚀 Starting development server..."
exec npm run dev