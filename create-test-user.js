const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcryptjs.hash('testpass123', 10);
    const user = await prisma.user.create({
      data: {
        id: 'cmfdjm82b0000mn4npgx38i8x',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User'
      }
    });
    console.log('✅ Test user created:', user.email);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();