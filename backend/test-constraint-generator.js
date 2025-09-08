const { ConstraintCrosswordGenerator } = require('./dist/services/puzzle/constraintCrosswordGenerator');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

console.log('🧪 Testing constraint-based crossword generator...\n');

// Load dictionary for validation
function loadDictionary() {
  const csvPath = path.join(__dirname, 'src/data/crossword_dictionary_with_clues.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  const wordSet = new Set();
  records.forEach(record => {
    const word = record.word?.toUpperCase();
    if (word && /^[A-Z]+$/.test(word)) {
      wordSet.add(word);
    }
  });
  
  console.log(`📚 Loaded ${wordSet.size} words for validation\n`);
  return wordSet;
}

function comprehensiveValidation(puzzle, wordSet) {
  const errors = [];
  const warnings = [];
  const allWords = new Map(); // Track all words found in grid
  
  // 1. Validate all horizontal sequences
  console.log('Checking horizontal sequences...');
  for (let r = 0; r < puzzle.size.rows; r++) {
    let word = '';
    let startCol = -1;
    
    for (let c = 0; c <= puzzle.size.cols; c++) {
      const isEnd = c === puzzle.size.cols || puzzle.grid[r][c].isBlocked || !puzzle.grid[r][c].letter;
      
      if (!isEnd) {
        if (word === '') {
          startCol = c;
        }
        word += puzzle.grid[r][c].letter;
      } else if (word.length > 0) {
        if (word.length === 1) {
          errors.push(`Single letter at row ${r}, col ${startCol}: "${word}"`);
        } else if (word.length >= 2) {
          const key = `H-${r}-${startCol}`;
          allWords.set(key, { word, row: r, col: startCol, direction: 'across', length: word.length });
          
          if (!wordSet.has(word)) {
            errors.push(`Invalid horizontal word at row ${r}, col ${startCol}: "${word}" (not in dictionary)`);
          }
        }
        word = '';
        startCol = -1;
      }
    }
  }
  
  // 2. Validate all vertical sequences
  console.log('Checking vertical sequences...');
  for (let c = 0; c < puzzle.size.cols; c++) {
    let word = '';
    let startRow = -1;
    
    for (let r = 0; r <= puzzle.size.rows; r++) {
      const isEnd = r === puzzle.size.rows || puzzle.grid[r][c].isBlocked || !puzzle.grid[r][c].letter;
      
      if (!isEnd) {
        if (word === '') {
          startRow = r;
        }
        word += puzzle.grid[r][c].letter;
      } else if (word.length > 0) {
        if (word.length === 1) {
          errors.push(`Single letter at row ${startRow}, col ${c}: "${word}"`);
        } else if (word.length >= 2) {
          const key = `V-${startRow}-${c}`;
          allWords.set(key, { word, row: startRow, col: c, direction: 'down', length: word.length });
          
          if (!wordSet.has(word)) {
            errors.push(`Invalid vertical word at row ${startRow}, col ${c}: "${word}" (not in dictionary)`);
          }
        }
        word = '';
        startRow = -1;
      }
    }
  }
  
  // 3. Check that all words have clues
  console.log('Checking clues coverage...');
  const clueMap = new Map();
  for (const clue of puzzle.clues) {
    const key = `${clue.direction === 'across' ? 'H' : 'V'}-${clue.startRow}-${clue.startCol}`;
    clueMap.set(key, clue);
  }
  
  for (const [key, wordInfo] of allWords) {
    if (wordInfo.length >= 3) { // Only words of length 3+ should have clues
      if (!clueMap.has(key)) {
        errors.push(`Word "${wordInfo.word}" at (${wordInfo.row},${wordInfo.col}) ${wordInfo.direction} has no clue`);
      } else {
        const clue = clueMap.get(key);
        if (clue.answer !== wordInfo.word) {
          errors.push(`Mismatch: Grid has "${wordInfo.word}" but clue says "${clue.answer}" at (${wordInfo.row},${wordInfo.col})`);
        }
      }
    }
  }
  
  // 4. Check that all clues correspond to actual words in grid
  console.log('Checking clues validity...');
  for (const clue of puzzle.clues) {
    let gridWord = '';
    for (let i = 0; i < clue.length; i++) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      
      if (r >= puzzle.size.rows || c >= puzzle.size.cols) {
        errors.push(`Clue ${clue.number} ${clue.direction} extends beyond grid`);
        break;
      }
      
      if (puzzle.grid[r][c].isBlocked) {
        errors.push(`Clue ${clue.number} ${clue.direction} hits black square at (${r},${c})`);
        break;
      }
      
      gridWord += puzzle.grid[r][c].letter || '?';
    }
    
    if (gridWord !== clue.answer) {
      errors.push(`Clue ${clue.number} ${clue.direction}: Expected "${clue.answer}" but grid has "${gridWord}"`);
    }
  }
  
  // 5. Check numbering consistency
  console.log('Checking numbering...');
  const numberPositions = new Map();
  const numbersUsed = new Set();
  
  for (const clue of puzzle.clues) {
    if (numbersUsed.has(`${clue.number}-${clue.direction}`)) {
      errors.push(`Duplicate clue number: ${clue.number} ${clue.direction}`);
    }
    numbersUsed.add(`${clue.number}-${clue.direction}`);
    
    const posKey = `${clue.startRow},${clue.startCol}`;
    if (!numberPositions.has(clue.number)) {
      numberPositions.set(clue.number, posKey);
    } else if (numberPositions.get(clue.number) !== posKey) {
      errors.push(`Number ${clue.number} appears at different positions`);
    }
    
    // Check grid has correct number
    const gridNumber = puzzle.grid[clue.startRow][clue.startCol].number;
    if (gridNumber !== clue.number) {
      errors.push(`Grid cell (${clue.startRow},${clue.startCol}) has number ${gridNumber} but clue says ${clue.number}`);
    }
  }
  
  // 6. Check for isolated cells
  console.log('Checking connectivity...');
  let isolatedCount = 0;
  for (let r = 0; r < puzzle.size.rows; r++) {
    for (let c = 0; c < puzzle.size.cols; c++) {
      if (puzzle.grid[r][c].letter && !puzzle.grid[r][c].isBlocked) {
        let hasNeighbor = false;
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < puzzle.size.rows && nc >= 0 && nc < puzzle.size.cols) {
            if (puzzle.grid[nr][nc].letter && !puzzle.grid[nr][nc].isBlocked) {
              hasNeighbor = true;
              break;
            }
          }
        }
        if (!hasNeighbor) {
          isolatedCount++;
          errors.push(`Isolated cell at (${r},${c}): "${puzzle.grid[r][c].letter}"`);
        }
      }
    }
  }
  
  // Calculate statistics
  let blackCount = 0;
  let letterCount = 0;
  for (let r = 0; r < puzzle.size.rows; r++) {
    for (let c = 0; c < puzzle.size.cols; c++) {
      if (puzzle.grid[r][c].isBlocked) blackCount++;
      else if (puzzle.grid[r][c].letter) letterCount++;
    }
  }
  
  const totalCells = puzzle.size.rows * puzzle.size.cols;
  const blackPercentage = (blackCount / totalCells) * 100;
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalWords: allWords.size,
      totalClues: puzzle.clues.length,
      acrossClues: puzzle.clues.filter(c => c.direction === 'across').length,
      downClues: puzzle.clues.filter(c => c.direction === 'down').length,
      blackSquares: blackCount,
      blackPercentage: blackPercentage.toFixed(1),
      letterCount,
      isolatedCells: isolatedCount
    }
  };
}

async function testGenerator() {
  const wordSet = loadDictionary();
  const testDates = ['2025-09-08', '2025-09-09', '2025-09-10'];
  
  for (const date of testDates) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 Testing puzzle for ${date}`);
    console.log('='.repeat(60));
    
    try {
      const startTime = Date.now();
      const generator = new ConstraintCrosswordGenerator(date);
      const puzzle = generator.generate();
      const endTime = Date.now();
      
      console.log(`\n⏱️  Generation time: ${(endTime - startTime) / 1000}s\n`);
      
      const validation = comprehensiveValidation(puzzle, wordSet);
      
      console.log('📊 Statistics:');
      console.log(`   Grid: ${puzzle.size.rows}x${puzzle.size.cols}`);
      console.log(`   Words in grid: ${validation.stats.totalWords}`);
      console.log(`   Clues: ${validation.stats.totalClues} (${validation.stats.acrossClues} across, ${validation.stats.downClues} down)`);
      console.log(`   Black squares: ${validation.stats.blackSquares} (${validation.stats.blackPercentage}%)`);
      console.log(`   Letters: ${validation.stats.letterCount}`);
      
      if (validation.valid) {
        console.log('\n✅ PUZZLE IS VALID - All constraints satisfied!');
      } else {
        console.log(`\n❌ PUZZLE IS INVALID - ${validation.errors.length} constraint violations:`);
        validation.errors.slice(0, 10).forEach(err => console.log(`   • ${err}`));
        if (validation.errors.length > 10) {
          console.log(`   ... and ${validation.errors.length - 10} more errors`);
        }
      }
      
      // Show grid preview
      console.log('\n🗺️  Grid preview:');
      for (let r = 0; r < Math.min(8, puzzle.size.rows); r++) {
        let line = '   ';
        for (let c = 0; c < puzzle.size.cols; c++) {
          const cell = puzzle.grid[r][c];
          if (cell.isBlocked) {
            line += '■ ';
          } else if (cell.letter) {
            if (cell.number) {
              // Show numbers in superscript style
              line += cell.letter + ' ';
            } else {
              line += cell.letter.toLowerCase() + ' ';
            }
          } else {
            line += '· ';
          }
        }
        console.log(line);
      }
      console.log('   ...');
      
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
      console.error(error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Constraint generator testing completed!');
}

testGenerator().catch(console.error);