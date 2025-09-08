const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🧪 Testing improved puzzle generation...');
console.log('=======================================');

try {
  const testDate = '2025-01-01'; // Use a test date
  console.log(`Generating puzzle for ${testDate}...`);
  
  const puzzle = generateProperDailyPuzzle(testDate);
  
  console.log('\n📊 Puzzle Statistics:');
  console.log(`Grid size: ${puzzle.size.rows}x${puzzle.size.cols}`);
  console.log(`Number of clues: ${puzzle.clues.length}`);
  console.log(`Across clues: ${puzzle.clues.filter(c => c.direction === 'across').length}`);
  console.log(`Down clues: ${puzzle.clues.filter(c => c.direction === 'down').length}`);
  
  // Validate the puzzle structure
  console.log('\n🔍 Validation:');
  
  // Check for black squares
  let blackSquares = 0;
  let totalSquares = puzzle.size.rows * puzzle.size.cols;
  
  for (let row = 0; row < puzzle.size.rows; row++) {
    for (let col = 0; col < puzzle.size.cols; col++) {
      if (puzzle.grid[row][col].isBlocked) {
        blackSquares++;
      }
    }
  }
  
  console.log(`Black squares: ${blackSquares}/${totalSquares} (${((blackSquares/totalSquares)*100).toFixed(1)}%)`);
  
  // Display a sample of the grid
  console.log('\n🎯 Sample Grid (first 8x8):');
  for (let row = 0; row < Math.min(8, puzzle.size.rows); row++) {
    let line = '';
    for (let col = 0; col < Math.min(8, puzzle.size.cols); col++) {
      const cell = puzzle.grid[row][col];
      if (cell.isBlocked) {
        line += '██ ';
      } else if (cell.letter) {
        line += cell.letter + '  ';
      } else {
        line += '__ ';
      }
    }
    console.log(line);
  }
  
  console.log('\n✅ Puzzle generation completed successfully!');
  
} catch (error) {
  console.error('❌ Error during puzzle generation:', error.message);
  console.error('Stack trace:', error.stack);
}