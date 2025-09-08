import * as cron from 'node-cron';
import { prisma } from '../../lib/prisma';
import { generateStrictPuzzle } from './strictCrosswordGenerator';

export class PuzzleCronService {
  private static instance: PuzzleCronService;
  private job: any = null;

  private constructor() {}

  public static getInstance(): PuzzleCronService {
    if (!PuzzleCronService.instance) {
      PuzzleCronService.instance = new PuzzleCronService();
    }
    return PuzzleCronService.instance;
  }

  public start(): void {
    // Run every day at 00:01 UTC to generate the new daily puzzle
    this.job = cron.schedule('1 0 * * *', async () => {
      await this.generateTodaysPuzzle();
    }, {
      timezone: 'UTC'
    });

    console.log('📅 Puzzle generation cron job started');
    
    // Generate today's puzzle if it doesn't exist
    this.generateTodaysPuzzle();
  }

  public stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('📅 Puzzle generation cron job stopped');
    }
  }

  private async generateTodaysPuzzle(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Check if puzzle already exists for today
      const existingPuzzle = await prisma.dailyPuzzle.findUnique({ where: { date: today } });
      
      if (existingPuzzle) {
        console.log(`🧩 Puzzle for ${today} already exists`);
        return;
      }

      console.log(`🧩 Generating puzzle for ${today}...`);

      // Generate the puzzle using strict constraint algorithm
      const puzzleData = generateStrictPuzzle(today);

      // Save to database
      await prisma.dailyPuzzle.create({
        data: {
          date: today,
          gridData: JSON.stringify(puzzleData.grid),
          cluesData: JSON.stringify(puzzleData.clues),
          rows: puzzleData.size.rows,
          cols: puzzleData.size.cols
        }
      });
      console.log(`✅ Puzzle for ${today} generated and saved successfully`);

    } catch (error) {
      console.error('❌ Error generating daily puzzle:', error);
    }
  }

  // Method to manually generate puzzle for a specific date (for testing/backfill)
  public async generatePuzzleForDate(date: string): Promise<void> {
    try {
      // Check if puzzle already exists
      const existingPuzzle = await prisma.dailyPuzzle.findUnique({ where: { date } });
      
      if (existingPuzzle) {
        throw new Error(`Puzzle for ${date} already exists`);
      }

      console.log(`🧩 Manually generating puzzle for ${date}...`);

      // Generate the puzzle using strict constraint algorithm
      const puzzleData = generateStrictPuzzle(date);

      // Save to database
      await prisma.dailyPuzzle.create({
        data: {
          date,
          gridData: JSON.stringify(puzzleData.grid),
          cluesData: JSON.stringify(puzzleData.clues),
          rows: puzzleData.size.rows,
          cols: puzzleData.size.cols
        }
      });
      console.log(`✅ Puzzle for ${date} generated and saved successfully`);

    } catch (error) {
      console.error(`❌ Error generating puzzle for ${date}:`, error);
      throw error;
    }
  }

  // Get puzzle for a specific date
  public async getPuzzleForDate(date: string) {
    return await prisma.dailyPuzzle.findUnique({ where: { date } });
  }

  // Get today's puzzle
  public async getTodaysPuzzle() {
    const today = new Date().toISOString().split('T')[0];
    return await this.getPuzzleForDate(today);
  }
}

export default PuzzleCronService.getInstance();