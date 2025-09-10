import { prisma } from './src/lib/prisma';
import { generateStrictPuzzle } from './src/services/puzzle/strictCrosswordGenerator';

async function regeneratePuzzle() {
    const date = process.argv[2];
    const force = process.argv[3] === 'true';
    
    try {
        console.log(`🔍 Checking for existing puzzle for ${date}...`);
        
        // Check if puzzle already exists
        const existingPuzzle = await prisma.dailyPuzzle.findUnique({ 
            where: { date } 
        });
        
        if (existingPuzzle && !force) {
            console.log(`❌ Puzzle for ${date} already exists. Use --force to regenerate.`);
            process.exit(1);
        }
        
        if (existingPuzzle && force) {
            console.log(`🗑️  Deleting existing puzzle and related data for ${date}...`);
            
            // Delete related UserProgress records first (no cascade delete configured)
            const deletedProgress = await prisma.userProgress.deleteMany({ 
                where: { puzzleDate: date } 
            });
            console.log(`🗑️  Deleted ${deletedProgress.count} user progress records`);
            
            // Delete related Suggestions (these have cascade delete but let's be explicit)
            const deletedSuggestions = await prisma.suggestion.deleteMany({
                where: { puzzleDate: date }
            });
            console.log(`🗑️  Deleted ${deletedSuggestions.count} suggestion records`);
            
            // Now we can safely delete the puzzle
            await prisma.dailyPuzzle.delete({ where: { date } });
            console.log(`✅ Existing puzzle and all related data deleted`);
        }
        
        console.log(`🧩 Generating new puzzle for ${date}...`);
        
        // Generate the puzzle using strict constraint algorithm
        const puzzleData = generateStrictPuzzle(date);
        
        if (!puzzleData || !puzzleData.grid || !puzzleData.clues) {
            throw new Error('Failed to generate valid puzzle data');
        }
        
        // Save to database
        const savedPuzzle = await prisma.dailyPuzzle.create({
            data: {
                date,
                gridData: JSON.stringify(puzzleData.grid),
                cluesData: JSON.stringify(puzzleData.clues),
                rows: puzzleData.size.rows,
                cols: puzzleData.size.cols
            }
        });
        
        console.log(`✅ Puzzle for ${date} generated and saved successfully!`);
        console.log(`📊 Grid size: ${puzzleData.size.rows}x${puzzleData.size.cols}`);
        console.log(`📝 Total clues: ${puzzleData.clues.length}`);
        console.log(`🆔 Puzzle ID: ${savedPuzzle.id}`);
        
    } catch (error) {
        console.error(`❌ Error generating puzzle for ${date}:`, error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

regeneratePuzzle();
