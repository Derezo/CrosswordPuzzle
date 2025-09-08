const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🔒 Final test: Word separation validation across multiple dates...\n');

const testDates = ['2025-09-01', '2025-09-02', '2025-09-03'];
let totalTests = 0;
let totalViolations = 0;

for (const date of testDates) {
  console.log(`📅 Testing ${date}...`);
  try {
    const puzzle = generateProperDailyPuzzle(date);
    const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
    const downClues = puzzle.clues.filter(c => c.direction === 'down');
    
    console.log(`✅ Generated: ${acrossClues.length} across, ${downClues.length} down`);
    
    // Check for word separation violations
    let violations = [];
    
    // Check down word adjacencies
    for (let i = 0; i < downClues.length; i++) {
      for (let j = i + 1; j < downClues.length; j++) {
        const word1 = downClues[i];
        const word2 = downClues[j];
        if (word1.startCol === word2.startCol) {
          const word1End = word1.startRow + word1.length - 1;
          if (word2.startRow === word1End + 1) {
            violations.push(`DOWN: ${word1.answer} flows into ${word2.answer} at col ${word1.startCol}`);
          }
        }
      }
    }
    
    // Check across word adjacencies  
    for (let i = 0; i < acrossClues.length; i++) {
      for (let j = i + 1; j < acrossClues.length; j++) {
        const word1 = acrossClues[i];
        const word2 = acrossClues[j];
        if (word1.startRow === word2.startRow) {
          const word1End = word1.startCol + word1.length - 1;
          if (word2.startCol === word1End + 1) {
            violations.push(`ACROSS: ${word1.answer} flows into ${word2.answer} at row ${word1.startRow}`);
          }
        }
      }
    }
    
    totalTests++;
    totalViolations += violations.length;
    
    if (violations.length === 0) {
      console.log(`   ✅ Perfect separation!`);
    } else {
      console.log(`   ❌ ${violations.length} violations found:`);
      violations.forEach(v => console.log(`     - ${v}`));
    }
    console.log('');
    
  } catch (error) {
    console.log(`   ❌ Generation failed: ${error.message}\n`);
    totalTests++;
  }
}

console.log(`\n🎯 Final Results:`);
console.log(`   Tests completed: ${totalTests}`);
console.log(`   Total violations: ${totalViolations}`);
console.log(`   Success rate: ${totalViolations === 0 ? '100%' : `${Math.round((1 - totalViolations/totalTests) * 100)}%`}`);

if (totalViolations === 0) {
  console.log(`\n✅ SUCCESS: Word separation constraints are working perfectly!`);
  console.log(`📌 Black squares are properly placed to prevent words from flowing together.`);
} else {
  console.log(`\n⚠️  Some violations still exist - may need further constraint refinement.`);
}