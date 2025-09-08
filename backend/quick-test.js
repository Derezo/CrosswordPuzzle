const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('⚡ Quick test with simplified constraints...\n');

try {
  // Try multiple dates to get one that completes quickly
  const testDates = ['2025-08-15', '2025-07-20', '2025-06-15'];
  
  for (const testDate of testDates) {
    console.log(`📅 Testing ${testDate}...`);
    
    try {
      const startTime = Date.now();
      const puzzle = generateProperDailyPuzzle(testDate);
      const endTime = Date.now();
      
      const downWords = puzzle.clues.filter(c => c.direction === 'down');
      const acrossWords = puzzle.clues.filter(c => c.direction === 'across');
      
      console.log(`✅ Success! Generated ${puzzle.clues.length} clues in ${(endTime - startTime) / 1000}s`);
      console.log(`   ${acrossWords.length} across, ${downWords.length} down words`);
      
      // Quick adjacency check
      let violations = [];
      
      // Check down word adjacencies
      for (let i = 0; i < downWords.length; i++) {
        for (let j = i + 1; j < downWords.length; j++) {
          const word1 = downWords[i];
          const word2 = downWords[j];
          if (word1.startCol === word2.startCol) {
            const word1End = word1.startRow + word1.answer.length - 1;
            if (word2.startRow === word1End + 1) {
              violations.push(`DOWN: ${word1.answer} → ${word2.answer} at col ${word1.startCol}`);
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
              violations.push(`ACROSS: ${word1.answer} → ${word2.answer} at row ${word1.startRow}`);
            }
          }
        }
      }
      
      if (violations.length === 0) {
        console.log(`   🎉 SUCCESS: No adjacency violations! Word separation is working!`);
      } else {
        console.log(`   ⚠️  Found ${violations.length} violations:`);
        violations.forEach(v => console.log(`     - ${v}`));
      }
      
      // Success - break out
      break;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      continue;
    }
  }
  
} catch (error) {
  console.error('❌ All tests failed:', error.message);
}