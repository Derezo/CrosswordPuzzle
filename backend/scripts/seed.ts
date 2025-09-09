import { prisma } from '../src/lib/prisma';

const achievements = [
  {
    name: "First Puzzle",
    description: "Complete your first crossword puzzle",
    points: 10,
    conditionType: "puzzle_completed",
    conditionData: JSON.stringify({ count: 1 }),
    icon: "🎯",
    isActive: true
  },
  {
    name: "Speed Demon",
    description: "Complete a puzzle in under 5 minutes",
    points: 25,
    conditionType: "solve_time",
    conditionData: JSON.stringify({ maxTime: 300 }),
    icon: "⚡",
    isActive: true
  },
  {
    name: "Daily Solver",
    description: "Complete 7 puzzles in a row",
    points: 50,
    conditionType: "consecutive_days",
    conditionData: JSON.stringify({ days: 7 }),
    icon: "📅",
    isActive: true
  },
  {
    name: "Perfect Week",
    description: "Complete every puzzle in a week without mistakes",
    points: 100,
    conditionType: "perfect_week",
    conditionData: JSON.stringify({ mistakes: 0 }),
    icon: "💯",
    isActive: true
  },
  {
    name: "Night Owl",
    description: "Complete a puzzle between 10 PM and 2 AM",
    points: 15,
    conditionType: "time_range",
    conditionData: JSON.stringify({ startHour: 22, endHour: 2 }),
    icon: "🌙",
    isActive: true
  },
  {
    name: "Early Bird",
    description: "Complete a puzzle between 5 AM and 8 AM",
    points: 15,
    conditionType: "time_range",
    conditionData: JSON.stringify({ startHour: 5, endHour: 8 }),
    icon: "🌅",
    isActive: true
  },
  {
    name: "Puzzle Master",
    description: "Complete 50 puzzles total",
    points: 200,
    conditionType: "puzzle_completed",
    conditionData: JSON.stringify({ count: 50 }),
    icon: "👑",
    isActive: true
  },
  {
    name: "Lightning Fast",
    description: "Complete a puzzle in under 2 minutes",
    points: 75,
    conditionType: "solve_time",
    conditionData: JSON.stringify({ maxTime: 120 }),
    icon: "⚡⚡",
    isActive: true
  },
  {
    name: "Marathon Runner",
    description: "Complete 30 consecutive days of puzzles",
    points: 300,
    conditionType: "consecutive_days",
    conditionData: JSON.stringify({ days: 30 }),
    icon: "🏃‍♂️",
    isActive: true
  },
  {
    name: "Perfectionist",
    description: "Complete 10 puzzles without any incorrect answers",
    points: 150,
    conditionType: "perfect_puzzles",
    conditionData: JSON.stringify({ count: 10 }),
    icon: "✨",
    isActive: true
  }
];

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing achievements (optional - only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️  Clearing existing achievements (development mode)...');
      await prisma.userAchievement.deleteMany();
      await prisma.achievement.deleteMany();
    }

    // Create achievements
    console.log('📊 Creating achievements...');
    let createdCount = 0;
    
    for (const achievement of achievements) {
      try {
        const existing = await prisma.achievement.findUnique({
          where: { name: achievement.name }
        });

        if (!existing) {
          await prisma.achievement.create({
            data: achievement
          });
          createdCount++;
          console.log(`  ✅ Created: ${achievement.name}`);
        } else {
          console.log(`  ⏭️  Skipped: ${achievement.name} (already exists)`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to create ${achievement.name}:`, error);
      }
    }

    console.log(`\n📈 Database seeding completed!`);
    console.log(`   Created ${createdCount} new achievements`);
    console.log(`   Total achievements: ${achievements.length}`);

    // Verify the seeding
    const totalAchievements = await prisma.achievement.count();
    console.log(`   Database contains ${totalAchievements} achievements total`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seed();
}

export { seed };