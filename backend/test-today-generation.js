const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

// Test generation for today's date
console.log('🧪 Testing puzzle generation for today (2025-09-08)...\n');

try {
  const testDate = '2025-09-08';
  console.log(`📅 Generating puzzle for ${testDate}`);
  console.log('⏳ Generating with diagnostic output...\n');
  
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
    console.log(`     ${clue.number}. ${clue.answer} (row ${clue.row}, col ${clue.col})`);
  });
  
  console.log('\n   DOWN:');
  downClues.forEach(clue => {
    console.log(`     ${clue.number}. ${clue.answer} (row ${clue.row}, col ${clue.col})`);
  });
  
  console.log('\n📐 Full Grid Preview:');
  for (let row = 0; row < puzzle.size.rows; row++) {
    let line = '';
    let rowNumbers = '';
    for (let col = 0; col < puzzle.size.cols; col++) {
      const cell = puzzle.grid[row][col];
      if (cell.isBlocked) {
        line += '█';
        rowNumbers += ' ';
      } else if (cell.letter) {
        line += cell.letter;
        rowNumbers += cell.number ? cell.number.toString().padStart(2, ' ')[1] : ' ';
      } else {
        line += '·';
        rowNumbers += ' ';
      }
    }
    console.log(`${row.toString().padStart(2, ' ')}: ${line}`);
    if (rowNumbers.trim()) {
      console.log(`    ${rowNumbers}`);
    }
  }
  
  // Diagnostic: Check for word separation violations
  console.log('\n🔍 DIAGNOSTICS - Checking Word Separation:');
  
  // Check for adjacent words in same direction
  const violations = [];
  
  // Check down words for adjacency violations
  for (let i = 0; i < downClues.length; i++) {
    for (let j = i + 1; j < downClues.length; j++) {
      const word1 = downClues[i];
      const word2 = downClues[j];
      
      // Same column check
      if (word1.col === word2.col) {
        const word1End = word1.row + word1.answer.length - 1;
        const word2Start = word2.row;
        
        // Check if word2 starts right after word1 ends (violation)
        if (word2Start === word1End + 1) {
          violations.push({
            type: 'DOWN_ADJACENT',
            word1: `${word1.number}. ${word1.answer} (${word1.row},${word1.col})`,
            word2: `${word2.number}. ${word2.answer} (${word2.row},${word2.col})`,
            issue: `Word2 starts at row ${word2Start}, word1 ends at row ${word1End} - no black square separation`
          });
        }
      }
    }
  }
  
  // Check across words for adjacency violations  
  for (let i = 0; i < acrossClues.length; i++) {
    for (let j = i + 1; j < acrossClues.length; j++) {
      const word1 = acrossClues[i];
      const word2 = acrossClues[j];
      
      // Same row check
      if (word1.row === word2.row) {
        const word1End = word1.col + word1.answer.length - 1;
        const word2Start = word2.col;
        
        // Check if word2 starts right after word1 ends (violation)
        if (word2Start === word1End + 1) {
          violations.push({
            type: 'ACROSS_ADJACENT',
            word1: `${word1.number}. ${word1.answer} (${word1.row},${word1.col})`,
            word2: `${word2.number}. ${word2.answer} (${word2.row},${word2.col})`,
            issue: `Word2 starts at col ${word2Start}, word1 ends at col ${word1End} - no black square separation`
          });
        }
      }
    }
  }
  
  if (violations.length === 0) {
    console.log('   ✅ No word separation violations found!');
  } else {
    console.log(`   ❌ Found ${violations.length} word separation violations:`);
    violations.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.type}:`);
      console.log(`      Word 1: ${v.word1}`);
      console.log(`      Word 2: ${v.word2}`);
      console.log(`      Issue: ${v.issue}`);
    });
  }
  
  console.log('\n✅ Diagnostic completed!');
  
} catch (error) {
  console.error('❌ Error testing puzzle generation:', error);
  console.error(error.stack);
}