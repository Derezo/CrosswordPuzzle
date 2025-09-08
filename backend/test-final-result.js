const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🧪 Testing final result after separation fix...\n');

try {
  const testDate = '2025-09-08';
  const puzzle = generateProperDailyPuzzle(testDate);
  
  console.log(`✅ Generated puzzle with ${puzzle.clues.length} clues`);
  console.log(`   Grid size: ${puzzle.size.rows}×${puzzle.size.cols}`);
  
  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');
  
  console.log(`   Across words: ${acrossClues.length}`);
  console.log(`   Down words: ${downClues.length}`);
  
  console.log('\n📋 Words placed:');
  console.log('ACROSS:');
  acrossClues.forEach(clue => {
    console.log(`  ${clue.number}. ${clue.answer} at (${clue.row},${clue.col})`);
  });
  
  console.log('DOWN:');
  downClues.forEach(clue => {
    console.log(`  ${clue.number}. ${clue.answer} at (${clue.row},${clue.col})`);
  });

  // Check for adjacency violations again
  console.log('\n🔍 Final validation:');
  let hasViolations = false;
  
  // Check down words for adjacency
  for (let i = 0; i < downClues.length; i++) {
    for (let j = i + 1; j < downClues.length; j++) {
      const word1 = downClues[i];
      const word2 = downClues[j];
      
      if (word1.col === word2.col) {
        const word1End = word1.row + word1.answer.length - 1;
        const word2Start = word2.row;
        
        if (word2Start === word1End + 1) {
          console.log(`❌ VIOLATION: "${word1.answer}" and "${word2.answer}" are adjacent in column ${word1.col}`);
          hasViolations = true;
        }
      }
    }
  }
  
  // Check across words for adjacency
  for (let i = 0; i < acrossClues.length; i++) {
    for (let j = i + 1; j < acrossClues.length; j++) {
      const word1 = acrossClues[i];
      const word2 = acrossClues[j];
      
      if (word1.row === word2.row) {
        const word1End = word1.col + word1.answer.length - 1;
        const word2Start = word2.col;
        
        if (word2Start === word1End + 1) {
          console.log(`❌ VIOLATION: "${word1.answer}" and "${word2.answer}" are adjacent in row ${word1.row}`);
          hasViolations = true;
        }
      }
    }
  }
  
  if (!hasViolations) {
    console.log('✅ No word separation violations found!');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}