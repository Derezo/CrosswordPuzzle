const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

// Test the proper generator with full dictionary
console.log('🧪 Testing the improved proper crossword generator with full dictionary...\n');

try {
  const testDate = '2025-01-15';
  console.log(`📅 Generating puzzle for ${testDate}`);
  console.log('⏳ Using full dictionary - this may take longer...\n');
  
  const startTime = Date.now();
  const puzzle = generateProperDailyPuzzle(testDate);
  const endTime = Date.now();
  
  console.log(`\n⏱️  Generation took ${(endTime - startTime) / 1000}s`);
  
  console.log('\n📊 Generated Puzzle Stats:');
  console.log(`   Grid size: ${puzzle.size.rows}×${puzzle.size.cols}`);
  console.log(`   Total clues: ${puzzle.clues.length}`);
  
  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');
  
  console.log(`   Across words: ${acrossClues.length}`);
  console.log(`   Down words: ${downClues.length}`);
  
  console.log('\n📋 Word List:');
  console.log('   ACROSS:');
  acrossClues.forEach(clue => {
    console.log(`     ${clue.number}. ${clue.answer} (${clue.clue})`);
  });
  
  console.log('\n   DOWN:');
  downClues.forEach(clue => {
    console.log(`     ${clue.number}. ${clue.answer} (${clue.clue})`);
  });
  
  console.log('\n📐 Grid Preview:');
  for (let row = 0; row < Math.min(15, puzzle.size.rows); row++) {
    let line = '';
    for (let col = 0; col < Math.min(15, puzzle.size.cols); col++) {
      const cell = puzzle.grid[row][col];
      if (cell.isBlocked) {
        line += '█';
      } else if (cell.letter) {
        line += cell.letter;
      } else {
        line += '·';
      }
    }
    console.log(`   ${line}`);
  }
  
  console.log('\n✅ Proper generator test completed successfully!');
  
} catch (error) {
  console.error('❌ Error testing proper generator:', error);
  console.error(error.stack);
}