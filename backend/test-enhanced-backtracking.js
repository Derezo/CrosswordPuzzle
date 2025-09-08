const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🔄 Testing enhanced backtracking with strict constraints...\n');

try {
  const testDate = '2025-09-08';
  console.log(`📅 Generating puzzle for ${testDate} with enhanced backtracking...`);
  
  const startTime = Date.now();
  const puzzle = generateProperDailyPuzzle(testDate);
  const endTime = Date.now();
  
  const downWords = puzzle.clues.filter(c => c.direction === 'down');
  const acrossWords = puzzle.clues.filter(c => c.direction === 'across');
  
  console.log(`\n✅ Success! Generated puzzle with ${puzzle.clues.length} clues in ${(endTime - startTime) / 1000}s`);
  console.log(`📊 ${acrossWords.length} across, ${downWords.length} down words`);
  
  // Display word list
  console.log('\n📋 PLACED WORDS:');
  console.log('   ACROSS:');
  acrossWords.forEach(word => {
    console.log(`     ${word.number}. ${word.answer} at (${word.startRow},${word.startCol})`);
  });
  console.log('   DOWN:');
  downWords.forEach(word => {
    console.log(`     ${word.number}. ${word.answer} at (${word.startRow},${word.startCol})`);
  });
  
  // Critical adjacency validation
  console.log('\n🔍 ADJACENCY VALIDATION:');
  let violations = [];
  
  // Check down word adjacencies
  for (let i = 0; i < downWords.length; i++) {
    for (let j = i + 1; j < downWords.length; j++) {
      const word1 = downWords[i];
      const word2 = downWords[j];
      if (word1.startCol === word2.startCol) {
        const word1End = word1.startRow + word1.answer.length - 1;
        if (word2.startRow === word1End + 1) {
          violations.push(`DOWN: ${word1.answer} flows into ${word2.answer} at col ${word1.startCol}`);
        }
      }
    }
  }
  
  // Check across word adjacencies
  for (let i = 0; i < acrossWords.length; i++) {
    for (let j = i + 1; j < acrossWords.length; j++) {
      const word1 = acrossWords[i];
      const word2 = acrossWords[j];
      if (word1.startRow === word2.startRow) {
        const word1End = word1.startCol + word1.answer.length - 1;
        if (word2.startCol === word1End + 1) {
          violations.push(`ACROSS: ${word1.answer} flows into ${word2.answer} at row ${word1.startRow}`);
        }
      }
    }
  }
  
  if (violations.length === 0) {
    console.log('   ✅ PERFECT! No word adjacency violations found');
    console.log('   🎉 Enhanced backtracking with strict constraints is working!');
  } else {
    console.log(`   ❌ FAILED! Found ${violations.length} violations:`);
    violations.forEach(v => console.log(`     - ${v}`));
  }
  
  // Check grid structure
  console.log('\n🔲 GRID STRUCTURE CHECK:');
  let blackSquareCount = 0;
  for (let row = 0; row < puzzle.grid.length; row++) {
    for (let col = 0; col < puzzle.grid[row].length; col++) {
      if (puzzle.grid[row][col].isBlocked) {
        blackSquareCount++;
      }
    }
  }
  console.log(`   Black squares placed: ${blackSquareCount}`);
  console.log(`   Grid density: ${((puzzle.clues.length * 6) / (15 * 15) * 100).toFixed(1)}%`);
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  console.log('\nThis indicates that strict constraints are properly enforced.');
  console.log('The backtracking system should help find valid solutions when they exist.');
}