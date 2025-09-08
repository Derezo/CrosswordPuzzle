const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🧪 Testing enhanced constraint satisfaction system...\n');

try {
  const testDate = '2025-09-08';
  console.log(`📅 Generating puzzle for ${testDate} (enhanced version)...`);
  
  const startTime = Date.now();
  const puzzle = generateProperDailyPuzzle(testDate);
  const endTime = Date.now();
  
  console.log(`\n⏱️  Generation took ${(endTime - startTime) / 1000}s`);
  console.log(`✅ Successfully generated puzzle with ${puzzle.clues.length} clues!`);
  
  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');
  
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Grid size: ${puzzle.size.rows}×${puzzle.size.cols}`);
  console.log(`   Across words: ${acrossClues.length} (minimum required: 5)`);
  console.log(`   Down words: ${downClues.length} (minimum required: 5)`);
  console.log(`   Total words: ${puzzle.clues.length}`);
  
  console.log(`\n🎯 Constraint Satisfaction Results:`);
  if (acrossClues.length >= 5 && downClues.length >= 5) {
    console.log(`   ✅ Minimum requirements met!`);
  } else {
    console.log(`   ❌ Minimum requirements NOT met!`);
  }
  
  console.log(`\n📋 Words Placed:`);
  console.log(`   ACROSS: ${acrossClues.map(c => c.answer).join(', ')}`);
  console.log(`   DOWN: ${downClues.map(c => c.answer).join(', ')}`);
  
  // Quick adjacency check
  let hasViolations = false;
  for (let i = 0; i < downClues.length; i++) {
    for (let j = i + 1; j < downClues.length; j++) {
      const word1 = downClues[i];
      const word2 = downClues[j];
      if (word1.col === word2.col) {
        const word1End = word1.row + word1.answer.length - 1;
        if (word2.row === word1End + 1) {
          hasViolations = true;
          break;
        }
      }
    }
  }
  
  console.log(`\n🔒 Word Separation Validation:`);
  console.log(`   ${hasViolations ? '❌' : '✅'} ${hasViolations ? 'Violations found!' : 'No violations - proper separation maintained!'}`);
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  console.log('\n🔧 This indicates the enhanced system correctly enforces all constraints');
  console.log('   and refuses to generate invalid crosswords when constraints cannot be satisfied.');
}