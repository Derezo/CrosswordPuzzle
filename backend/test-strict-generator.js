const { StrictCrosswordGenerator } = require('./dist/services/puzzle/strictCrosswordGenerator');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

console.log('🧪 Testing strict crossword generator with full validation...\n');

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
  
  return wordSet;
}

function strictValidation(puzzle, wordSet) {
  const errors = [];
  let totalWords = 0;
  let invalidWords = [];
  
  console.log('🔍 Performing strict validation...\n');
  
  // Check ALL horizontal sequences
  for (let r = 0; r < puzzle.size.rows; r++) {
    let word = '';
    let startCol = -1;
    
    for (let c = 0; c <= puzzle.size.cols; c++) {
      const isEnd = c === puzzle.size.cols || puzzle.grid[r][c].isBlocked || !puzzle.grid[r][c].letter;
      
      if (!isEnd) {
        if (word === '') startCol = c;
        word += puzzle.grid[r][c].letter;
      } else if (word.length > 0) {
        if (word.length === 1) {
          errors.push(`❌ Single letter at (${r},${startCol}): "${word}"`);
        } else if (word.length >= 2) {
          totalWords++;
          if (!wordSet.has(word)) {
            invalidWords.push({word, pos: `row ${r}, col ${startCol}`, dir: 'across'});
            errors.push(`❌ Invalid word across at (${r},${startCol}): "${word}"`);
          }
        }
        word = '';
      }
    }
  }
  
  // Check ALL vertical sequences  
  for (let c = 0; c < puzzle.size.cols; c++) {
    let word = '';
    let startRow = -1;
    
    for (let r = 0; r <= puzzle.size.rows; r++) {
      const isEnd = r === puzzle.size.rows || puzzle.grid[r][c].isBlocked || !puzzle.grid[r][c].letter;
      
      if (!isEnd) {
        if (word === '') startRow = r;
        word += puzzle.grid[r][c].letter;
      } else if (word.length > 0) {
        if (word.length === 1) {
          errors.push(`❌ Single letter at (${startRow},${c}): "${word}"`);
        } else if (word.length >= 2) {
          totalWords++;
          if (!wordSet.has(word)) {
            invalidWords.push({word, pos: `row ${startRow}, col ${c}`, dir: 'down'});
            errors.push(`❌ Invalid word down at (${startRow},${c}): "${word}"`);
          }
        }
        word = '';
      }
    }
  }
  
  // Check clue coverage
  const clueWords = new Set();
  puzzle.clues.forEach(clue => {
    clueWords.add(clue.answer);
  });
  
  return {
    valid: errors.length === 0,
    errors,
    invalidWords,
    totalWords,
    clueCount: puzzle.clues.length
  };
}

async function testGenerator() {
  const wordSet = loadDictionary();
  console.log(`📚 Dictionary loaded: ${wordSet.size} valid words\n`);
  
  const testDate = '2025-09-08';
  
  console.log('='.repeat(60));
  console.log(`📅 Generating puzzle for ${testDate}`);
  console.log('='.repeat(60) + '\n');
  
  try {
    const startTime = Date.now();
    const generator = new StrictCrosswordGenerator(testDate);
    const puzzle = generator.generate();
    const endTime = Date.now();
    
    console.log(`\n⏱️  Generation completed in ${(endTime - startTime) / 1000}s\n`);
    
    const validation = strictValidation(puzzle, wordSet);
    
    console.log('📊 Puzzle Statistics:');
    console.log(`   • Grid size: ${puzzle.size.rows}x${puzzle.size.cols}`);
    console.log(`   • Total words in grid: ${validation.totalWords}`);
    console.log(`   • Clues provided: ${validation.clueCount}`);
    console.log(`   • Across clues: ${puzzle.clues.filter(c => c.direction === 'across').length}`);
    console.log(`   • Down clues: ${puzzle.clues.filter(c => c.direction === 'down').length}`);
    
    // Count black squares
    let blackCount = 0;
    let letterCount = 0;
    for (let r = 0; r < puzzle.size.rows; r++) {
      for (let c = 0; c < puzzle.size.cols; c++) {
        if (puzzle.grid[r][c].isBlocked) blackCount++;
        else if (puzzle.grid[r][c].letter) letterCount++;
      }
    }
    console.log(`   • Black squares: ${blackCount} (${(blackCount/225*100).toFixed(1)}%)`);
    console.log(`   • Letters: ${letterCount}`);
    
    console.log('\n' + '='.repeat(60));
    if (validation.valid) {
      console.log('✅ PUZZLE IS COMPLETELY VALID!');
      console.log('   All letter sequences form valid dictionary words');
      console.log('   No isolated letters or invalid combinations');
    } else {
      console.log(`❌ PUZZLE HAS ${validation.errors.length} VIOLATIONS`);
      
      if (validation.invalidWords.length > 0) {
        console.log('\n🚫 Invalid words found:');
        validation.invalidWords.slice(0, 5).forEach(({word, pos, dir}) => {
          console.log(`   • "${word}" (${dir}) at ${pos}`);
        });
        if (validation.invalidWords.length > 5) {
          console.log(`   ... and ${validation.invalidWords.length - 5} more`);
        }
      }
    }
    console.log('='.repeat(60));
    
    // Show grid
    console.log('\n🗺️  Puzzle Grid:');
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
    if (puzzle.size.rows > 10) console.log('   ...');
    
    // Show sample clues
    console.log('\n📋 Sample Clues:');
    const acrossClues = puzzle.clues.filter(c => c.direction === 'across').slice(0, 3);
    const downClues = puzzle.clues.filter(c => c.direction === 'down').slice(0, 3);
    
    console.log('ACROSS:');
    acrossClues.forEach(clue => {
      console.log(`   ${clue.number}. ${clue.clue} (${clue.answer})`);
    });
    
    console.log('DOWN:');
    downClues.forEach(clue => {
      console.log(`   ${clue.number}. ${clue.clue} (${clue.answer})`);
    });
    
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
  }
  
  console.log('\n✨ Test completed!');
}

testGenerator().catch(console.error);