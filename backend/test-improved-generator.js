const { ImprovedCrosswordGenerator } = require('./dist/services/puzzle/improvedCrosswordGenerator');

console.log('🧪 Testing improved crossword generator...\n');

try {
  const testDate = '2025-09-09';
  console.log(`📅 Generating puzzle for ${testDate}...`);
  
  const startTime = Date.now();
  const generator = new ImprovedCrosswordGenerator(testDate);
  const puzzle = generator.generate();
  const endTime = Date.now();
  
  console.log(`\n✅ Success! Generated puzzle in ${(endTime - startTime) / 1000}s`);
  console.log(`📊 Grid: ${puzzle.size.rows}x${puzzle.size.cols}`);
  console.log(`📝 Total clues: ${puzzle.clues.length}`);
  
  // Count across and down clues
  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');
  console.log(`   ✨ ${acrossClues.length} across, ${downClues.length} down`);
  
  // Count black squares
  let blackSquareCount = 0;
  let letterCount = 0;
  for (let row of puzzle.grid) {
    for (let cell of row) {
      if (cell.isBlocked) blackSquareCount++;
      if (cell.letter) letterCount++;
    }
  }
  
  const totalCells = puzzle.size.rows * puzzle.size.cols;
  console.log(`\n🔲 Black squares: ${blackSquareCount}/${totalCells} (${(blackSquareCount/totalCells*100).toFixed(1)}%)`);
  console.log(`📝 Letters placed: ${letterCount}/${totalCells - blackSquareCount}`);
  
  // Visual grid representation
  console.log('\n🗺️ Grid preview:');
  for (let r = 0; r < Math.min(10, puzzle.size.rows); r++) {
    let line = '   ';
    for (let c = 0; c < Math.min(15, puzzle.size.cols); c++) {
      const cell = puzzle.grid[r][c];
      if (cell.isBlocked) {
        line += '■ ';
      } else if (cell.letter) {
        line += cell.letter + ' ';
      } else {
        line += '· ';
      }
    }
    console.log(line);
  }
  console.log('   ...');
  
  // Display sample clues
  console.log('\n📋 Sample clues:');
  if (acrossClues.length > 0) {
    console.log('ACROSS:');
    acrossClues.slice(0, 3).forEach(clue => {
      console.log(`   ${clue.number}. ${clue.clue} (${clue.answer})`);
    });
  }
  
  if (downClues.length > 0) {
    console.log('DOWN:');
    downClues.slice(0, 3).forEach(clue => {
      console.log(`   ${clue.number}. ${clue.clue} (${clue.answer})`);
    });
  }
  
  console.log('\n✨ Improved generator test completed!');
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  console.error(error.stack);
}