const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🔲 Testing black square placement for word separation...\n');

try {
  const testDate = '2025-09-08';
  console.log(`📅 Generating puzzle for ${testDate}...`);
  
  const startTime = Date.now();
  const puzzle = generateProperDailyPuzzle(testDate);
  const endTime = Date.now();
  
  console.log(`\n⏱️  Generation took ${(endTime - startTime) / 1000}s`);
  console.log(`✅ Successfully generated puzzle with ${puzzle.clues.length} clues!`);
  
  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');
  
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Grid size: ${puzzle.size.rows}×${puzzle.size.cols}`);
  console.log(`   Across words: ${acrossClues.length}`);
  console.log(`   Down words: ${downClues.length}`);
  console.log(`   Total words: ${puzzle.clues.length}`);
  
  console.log(`\n📋 Words Placed:`);
  console.log(`   ACROSS: ${acrossClues.map(c => `${c.number}.${c.answer}`).join(', ')}`);
  console.log(`   DOWN: ${downClues.map(c => `${c.number}.${c.answer}`).join(', ')}`);
  
  // Check for word separation violations
  let violations = [];
  for (let i = 0; i < downClues.length; i++) {
    for (let j = i + 1; j < downClues.length; j++) {
      const word1 = downClues[i];
      const word2 = downClues[j];
      if (word1.startCol === word2.startCol) {
        const word1End = word1.startRow + word1.length - 1;
        if (word2.startRow === word1End + 1) {
          violations.push(`${word1.number}.${word1.answer} flows into ${word2.number}.${word2.answer}`);
        }
      }
    }
  }
  
  for (let i = 0; i < acrossClues.length; i++) {
    for (let j = i + 1; j < acrossClues.length; j++) {
      const word1 = acrossClues[i];
      const word2 = acrossClues[j];
      if (word1.startRow === word2.startRow) {
        const word1End = word1.startCol + word1.length - 1;
        if (word2.startCol === word1End + 1) {
          violations.push(`${word1.number}.${word1.answer} flows into ${word2.number}.${word2.answer}`);
        }
      }
    }
  }
  
  console.log(`\n🔒 Word Separation Validation:`);
  if (violations.length === 0) {
    console.log(`   ✅ No violations - proper separation maintained!`);
  } else {
    console.log(`   ❌ Found ${violations.length} violations:`);
    violations.forEach(v => console.log(`     - ${v}`));
  }
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
}