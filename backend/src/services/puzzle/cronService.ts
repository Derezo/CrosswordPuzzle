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

  // Generate the puzzle for a given date. Idempotent by default — a duplicate
  // call simply logs and returns. Pass { force: true } to overwrite the
  // existing puzzle (used by ./regenerate-puzzle.sh --force).
  public async generatePuzzleForDate(
    date: string,
    options: { force?: boolean } = {}
  ): Promise<void> {
    try {
      const existingPuzzle = await prisma.dailyPuzzle.findUnique({ where: { date } });

      if (existingPuzzle && !options.force) {
        console.log(`🧩 Puzzle for ${date} already exists (idempotent skip)`);
        return;
      }

      console.log(`🧩 Generating puzzle for ${date}${options.force ? ' (force)' : ''}...`);

      const puzzleData = generateStrictPuzzle(date);

      if (existingPuzzle) {
        await prisma.dailyPuzzle.update({
          where: { date },
          data: {
            gridData: JSON.stringify(puzzleData.grid),
            cluesData: JSON.stringify(puzzleData.clues),
            rows: puzzleData.size.rows,
            cols: puzzleData.size.cols,
          },
        });
      } else {
        await prisma.dailyPuzzle.create({
          data: {
            date,
            gridData: JSON.stringify(puzzleData.grid),
            cluesData: JSON.stringify(puzzleData.clues),
            rows: puzzleData.size.rows,
            cols: puzzleData.size.cols,
          },
        });
      }
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