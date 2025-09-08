const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🔍 Deep debugging grid structure and word placement...\n');

try {
  const testDate = '2025-09-08';
  console.log(`📅 Generating puzzle for ${testDate} with full grid analysis...`);
  
  const puzzle = generateProperDailyPuzzle(testDate);
  
  console.log(`✅ Generated puzzle with ${puzzle.clues.length} clues`);
  
  // Display the grid
  console.log('\n📋 PUZZLE GRID:');
  console.log('   ', Array.from({length: 15}, (_, i) => String(i).padStart(2)).join(''));
  
  for (let row = 0; row < puzzle.grid.length; row++) {
    let rowStr = String(row).padStart(2) + ' ';
    for (let col = 0; col < puzzle.grid[row].length; col++) {
      const cell = puzzle.grid[row][col];
      if (cell.isBlocked) {
        rowStr += '██';
      } else if (cell.letter) {
        rowStr += cell.letter + ' ';
      } else {
        rowStr += '··';
      }
    }
    console.log(rowStr);
  }
  
  // Analyze word placements
  console.log('\n📊 WORD ANALYSIS:');
  const downWords = puzzle.clues.filter(c => c.direction === 'down');
  const acrossWords = puzzle.clues.filter(c => c.direction === 'across');
  
  console.log('\n⬇️  DOWN WORDS:');
  downWords.forEach(word => {
    const endRow = word.startRow + word.length - 1;
    console.log(`   ${word.number}. ${word.answer} at col ${word.startCol}, rows ${word.startRow}-${endRow}`);
  });
  
  console.log('\n➡️  ACROSS WORDS:');
  acrossWords.forEach(word => {
    const endCol = word.startCol + word.length - 1;
    console.log(`   ${word.number}. ${word.answer} at row ${word.startRow}, cols ${word.startCol}-${endCol}`);
  });
  
  // Check for adjacency violations
  console.log('\n🔍 CHECKING FOR ADJACENCY VIOLATIONS:');
  
  let violations = [];
  
  // Check down words for adjacency
  for (let i = 0; i < downWords.length; i++) {
    for (let j = i + 1; j < downWords.length; j++) {
      const word1 = downWords[i];
      const word2 = downWords[j];
      
      if (word1.startCol === word2.startCol) { // same column
        const word1End = word1.startRow + word1.length - 1;
        const word2Start = word2.startRow;
        const word1Start = word1.startRow;
        const word2End = word2.startRow + word2.length - 1;
        
        // Check if words are adjacent (no gap between them)
        if (word2Start === word1End + 1 || word1Start === word2End + 1) {
          violations.push({
            type: 'DOWN ADJACENT',
            word1: `${word1.number}. ${word1.answer} (${word1.startRow}-${word1End})`,
            word2: `${word2.number}. ${word2.answer} (${word2Start}-${word2End})`,
            column: word1.startCol
          });
        }
      }
    }
  }
  
  // Check across words for adjacency  
  for (let i = 0; i < acrossWords.length; i++) {
    for (let j = i + 1; j < acrossWords.length; j++) {
      const word1 = acrossWords[i];
      const word2 = acrossWords[j];
      
      if (word1.startRow === word2.startRow) { // same row
        const word1End = word1.startCol + word1.length - 1;
        const word2Start = word2.startCol;
        const word1Start = word1.startCol;
        const word2End = word2.startCol + word2.length - 1;
        
        // Check if words are adjacent (no gap between them)
        if (word2Start === word1End + 1 || word1Start === word2End + 1) {
          violations.push({
            type: 'ACROSS ADJACENT',
            word1: `${word1.number}. ${word1.answer} (${word1.startCol}-${word1End})`,
            word2: `${word2.number}. ${word2.answer} (${word2Start}-${word2End})`,
            row: word1.startRow
          });
        }
      }
    }
  }
  
  if (violations.length === 0) {
    console.log('   ✅ No adjacency violations found!');
  } else {
    console.log(`   ❌ Found ${violations.length} violations:`);
    violations.forEach(v => {
      if (v.type === 'DOWN ADJACENT') {
        console.log(`     - ${v.type}: ${v.word1} flows into ${v.word2} at column ${v.column}`);
      } else {
        console.log(`     - ${v.type}: ${v.word1} flows into ${v.word2} at row ${v.row}`);
      }
    });
  }
  
  // Check specific grid positions for black squares between adjacent cells
  console.log('\n🔲 BLACK SQUARE ANALYSIS:');
  let blackSquareCount = 0;
  for (let row = 0; row < puzzle.grid.length; row++) {
    for (let col = 0; col < puzzle.grid[row].length; col++) {
      if (puzzle.grid[row][col].isBlocked) {
        blackSquareCount++;
      }
    }
  }
  console.log(`   Total black squares: ${blackSquareCount}`);
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
}