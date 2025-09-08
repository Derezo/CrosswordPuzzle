"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PuzzleCronService = void 0;
const cron = __importStar(require("node-cron"));
const prisma_1 = require("../../lib/prisma");
const properGenerator_1 = require("./properGenerator");
class PuzzleCronService {
    constructor() {
        this.job = null;
    }
    static getInstance() {
        if (!PuzzleCronService.instance) {
            PuzzleCronService.instance = new PuzzleCronService();
        }
        return PuzzleCronService.instance;
    }
    start() {
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
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            console.log('📅 Puzzle generation cron job stopped');
        }
    }
    async generateTodaysPuzzle() {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            // Check if puzzle already exists for today
            const existingPuzzle = await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date: today } });
            if (existingPuzzle) {
                console.log(`🧩 Puzzle for ${today} already exists`);
                return;
            }
            console.log(`🧩 Generating puzzle for ${today}...`);
            // Generate the puzzle using proper algorithm
            const puzzleData = (0, properGenerator_1.generateProperDailyPuzzle)(today);
            // Save to database
            await prisma_1.prisma.dailyPuzzle.create({
                data: {
                    date: today,
                    gridData: JSON.stringify(puzzleData.grid),
                    cluesData: JSON.stringify(puzzleData.clues),
                    rows: puzzleData.size.rows,
                    cols: puzzleData.size.cols
                }
            });
            console.log(`✅ Puzzle for ${today} generated and saved successfully`);
        }
        catch (error) {
            console.error('❌ Error generating daily puzzle:', error);
        }
    }
    // Method to manually generate puzzle for a specific date (for testing/backfill)
    async generatePuzzleForDate(date) {
        try {
            // Check if puzzle already exists
            const existingPuzzle = await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date } });
            if (existingPuzzle) {
                throw new Error(`Puzzle for ${date} already exists`);
            }
            console.log(`🧩 Manually generating puzzle for ${date}...`);
            // Generate the puzzle using proper algorithm
            const puzzleData = (0, properGenerator_1.generateProperDailyPuzzle)(date);
            // Save to database
            await prisma_1.prisma.dailyPuzzle.create({
                data: {
                    date,
                    gridData: JSON.stringify(puzzleData.grid),
                    cluesData: JSON.stringify(puzzleData.clues),
                    rows: puzzleData.size.rows,
                    cols: puzzleData.size.cols
                }
            });
            console.log(`✅ Puzzle for ${date} generated and saved successfully`);
        }
        catch (error) {
            console.error(`❌ Error generating puzzle for ${date}:`, error);
            throw error;
        }
    }
    // Get puzzle for a specific date
    async getPuzzleForDate(date) {
        return await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date } });
    }
    // Get today's puzzle
    async getTodaysPuzzle() {
        const today = new Date().toISOString().split('T')[0];
        return await this.getPuzzleForDate(today);
    }
}
exports.PuzzleCronService = PuzzleCronService;
exports.default = PuzzleCronService.getInstance();
//# sourceMappingURL=cronService.js.map