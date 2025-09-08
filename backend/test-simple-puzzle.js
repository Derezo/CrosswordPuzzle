const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🔍 Testing simple puzzle generation with grid analysis...\n');

// Let's try a few different dates to get a successful generation
const testDates = ['2025-08-01', '2025-08-15', '2025-07-01'];

for (const testDate of testDates) {
  console.log(`📅 Testing date: ${testDate}`);
  
  try {
    const puzzle = generateProperDailyPuzzle(testDate);
    
    console.log(`✅ Successfully generated puzzle with ${puzzle.clues.length} clues!`);
    
    const downWords = puzzle.clues.filter(c => c.direction === 'down');
    const acrossWords = puzzle.clues.filter(c => c.direction === 'across');
    
    console.log(`   📊 ${acrossWords.length} across, ${downWords.length} down words`);
    
    // Show a compact grid
    console.log('\n📋 GRID (first 12x12 section):');
    console.log('   0123456789AB');
    for (let row = 0; row < Math.min(12, puzzle.grid.length); row++) {
      let rowStr = String(row).padStart(2) + ' ';
      for (let col = 0; col < Math.min(12, puzzle.grid[row].length); col++) {
        const cell = puzzle.grid[row][col];
        if (cell.isBlocked) {
          rowStr += '█';
        } else if (cell.letter) {
          rowStr += cell.letter;
        } else {
          rowStr += '·';
        }
      }
      console.log(rowStr);
    }
    
    // Check for direct adjacencies
    console.log('\n🔍 ADJACENCY CHECK:');
    let violations = [];
    
    // Check down words
    for (let i = 0; i < downWords.length; i++) {
      for (let j = i + 1; j < downWords.length; j++) {
        const word1 = downWords[i];
        const word2 = downWords[j];
        
        if (word1.startCol === word2.startCol) {
          const word1End = word1.startRow + word1.length - 1;
          if (word2.startRow === word1End + 1) {
            violations.push(`DOWN: ${word1.answer} → ${word2.answer} at col ${word1.startCol}`);
          }
        }
      }
    }
    
    // Check across words
    for (let i = 0; i < acrossWords.length; i++) {
      for (let j = i + 1; j < acrossWords.length; j++) {
        const word1 = acrossWords[i];
        const word2 = acrossWords[j];
        
        if (word1.startRow === word2.startRow) {
          const word1End = word1.startCol + word1.length - 1;
          if (word2.startCol === word1End + 1) {
            violations.push(`ACROSS: ${word1.answer} → ${word2.answer} at row ${word1.startRow}`);
          }
        }
      }
    }
    
    if (violations.length === 0) {
      console.log('   ✅ No violations found!');
    } else {
      console.log(`   ❌ Found ${violations.length} violations:`);
      violations.forEach(v => console.log(`     - ${v}`));
    }
    
    // Success! Break out of the loop
    break;
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
}