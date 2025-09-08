const { EnhancedCrosswordGenerator } = require('./dist/services/puzzle/enhancedCrosswordGenerator');

console.log('🧪 Testing enhanced crossword generator...\n');

function validatePuzzle(puzzle) {
  const errors = [];
  const warnings = [];
  
  // Count statistics
  let blackSquareCount = 0;
  let letterCount = 0;
  let isolatedCells = 0;
  
  // Check for isolated cells and count squares
  for (let r = 0; r < puzzle.size.rows; r++) {
    for (let c = 0; c < puzzle.size.cols; c++) {
      const cell = puzzle.grid[r][c];
      
      if (cell.isBlocked) {
        blackSquareCount++;
      } else if (cell.letter) {
        letterCount++;
        
        // Check if cell is isolated
        let hasConnection = false;
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < puzzle.size.rows && nc >= 0 && nc < puzzle.size.cols) {
            if (puzzle.grid[nr][nc].letter && !puzzle.grid[nr][nc].isBlocked) {
              hasConnection = true;
              break;
            }
          }
        }
        if (!hasConnection) {
          isolatedCells++;
          errors.push(`Isolated letter at (${r},${c}): ${cell.letter}`);
        }
      }
    }
  }
  
  // Check clue numbering
  const numbersSeen = new Set();
  const numberPositions = new Map();
  
  for (const clue of puzzle.clues) {
    const key = `${clue.number}-${clue.direction}`;
    if (numbersSeen.has(key)) {
      errors.push(`Duplicate clue: ${clue.number} ${clue.direction}`);
    }
    numbersSeen.add(key);
    
    // Track position for each number
    const posKey = `${clue.startRow},${clue.startCol}`;
    if (!numberPositions.has(clue.number)) {
      numberPositions.set(clue.number, posKey);
    } else if (numberPositions.get(clue.number) !== posKey) {
      errors.push(`Number ${clue.number} appears at different positions`);
    }
    
    // Validate word placement
    for (let i = 0; i < clue.answer.length; i++) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      
      if (r >= puzzle.size.rows || c >= puzzle.size.cols) {
        errors.push(`Clue ${clue.number} ${clue.direction} extends beyond grid`);
        break;
      }
      
      const cellLetter = puzzle.grid[r][c].letter;
      const expectedLetter = clue.answer[i];
      
      if (cellLetter !== expectedLetter) {
        errors.push(`Clue ${clue.number} ${clue.direction}: Expected '${expectedLetter}' at (${r},${c}) but found '${cellLetter}'`);
      }
    }
  }
  
  // Calculate statistics
  const totalCells = puzzle.size.rows * puzzle.size.cols;
  const blackPercentage = (blackSquareCount / totalCells) * 100;
  const fillRate = (letterCount / (totalCells - blackSquareCount)) * 100;
  
  // Check thresholds
  if (blackPercentage > 20) {
    warnings.push(`Too many black squares: ${blackPercentage.toFixed(1)}% (max 20%)`);
  }
  
  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      blackSquares: blackSquareCount,
      blackPercentage: blackPercentage.toFixed(1),
      letters: letterCount,
      fillRate: fillRate.toFixed(1),
      totalClues: puzzle.clues.length,
      acrossClues: acrossClues.length,
      downClues: downClues.length,
      isolatedCells
    }
  };
}

async function testGenerator() {
  const testDates = ['2025-09-08', '2025-09-09', '2025-09-10'];
  
  for (const date of testDates) {
    console.log(`\n📅 Testing puzzle for ${date}...`);
    console.log('='.repeat(50));
    
    try {
      const startTime = Date.now();
      const generator = new EnhancedCrosswordGenerator(date);
      const puzzle = generator.generate();
      const endTime = Date.now();
      
      const validation = validatePuzzle(puzzle);
      
      console.log(`⏱️  Generation time: ${(endTime - startTime) / 1000}s`);
      console.log(`📊 Grid: ${puzzle.size.rows}x${puzzle.size.cols}`);
      console.log(`📝 Clues: ${validation.stats.totalClues} total (${validation.stats.acrossClues} across, ${validation.stats.downClues} down)`);
      console.log(`🔲 Black squares: ${validation.stats.blackSquares} (${validation.stats.blackPercentage}%)`);
      console.log(`✏️  Fill rate: ${validation.stats.fillRate}%`);
      
      if (validation.valid) {
        console.log('✅ VALID PUZZLE - No errors found!');
      } else {
        console.log(`❌ INVALID PUZZLE - ${validation.errors.length} errors found:`);
        validation.errors.slice(0, 5).forEach(err => console.log(`   • ${err}`));
        if (validation.errors.length > 5) {
          console.log(`   ... and ${validation.errors.length - 5} more errors`);
        }
      }
      
      if (validation.warnings.length > 0) {
        console.log(`⚠️  Warnings:`);
        validation.warnings.forEach(warn => console.log(`   • ${warn}`));
      }
      
      // Show grid preview
      console.log('\n🗺️  Grid preview (first 10 rows):');
      for (let r = 0; r < Math.min(10, puzzle.size.rows); r++) {
        let line = '   ';
        for (let c = 0; c < puzzle.size.cols; c++) {
          const cell = puzzle.grid[r][c];
          if (cell.isBlocked) {
            line += '■ ';
          } else if (cell.letter) {
            line += cell.letter + ' ';
          } else {
            line += '· ';
          }
        }
        console.log(line);
      }
      
      // Show sample clues
      console.log('\n📋 Sample clues:');
      const acrossClues = puzzle.clues.filter(c => c.direction === 'across').slice(0, 3);
      const downClues = puzzle.clues.filter(c => c.direction === 'down').slice(0, 3);
      
      if (acrossClues.length > 0) {
        console.log('ACROSS:');
        acrossClues.forEach(clue => {
          console.log(`   ${clue.number}. ${clue.clue} (${clue.answer})`);
        });
      }
      
      if (downClues.length > 0) {
        console.log('DOWN:');
        downClues.forEach(clue => {
          console.log(`   ${clue.number}. ${clue.clue} (${clue.answer})`);
        });
      }
      
    } catch (error) {
      console.error('❌ Generation failed:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Enhanced generator testing completed!');
}

testGenerator().catch(console.error);