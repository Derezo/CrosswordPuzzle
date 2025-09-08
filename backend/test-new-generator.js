const { generateDailyPuzzle } = require('./dist/services/puzzle/crosswordGenerator');

console.log('🧪 Testing new crossword generator with dictionary clues...\n');

try {
  const testDate = '2025-09-09';
  console.log(`📅 Generating puzzle for ${testDate}...`);
  
  const startTime = Date.now();
  const puzzle = generateDailyPuzzle(testDate);
  const endTime = Date.now();
  
  console.log(`\n✅ Success! Generated puzzle in ${(endTime - startTime) / 1000}s`);
  console.log(`📊 Grid: ${puzzle.size.rows}x${puzzle.size.cols}`);
  console.log(`📝 Total clues: ${puzzle.clues.length}`);
  
  // Count across and down clues
  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');
  console.log(`   ${acrossClues.length} across, ${downClues.length} down`);
  
  // Count black squares
  let blackSquareCount = 0;
  let letterCount = 0;
  for (let row of puzzle.grid) {
    for (let cell of row) {
      if (cell.isBlocked) blackSquareCount++;
      if (cell.letter) letterCount++;
    }
  }
  
  const totalCells = puzzle.size.rows * puzzle.size.cols;
  console.log(`\n🔲 Black squares: ${blackSquareCount}/${totalCells} (${(blackSquareCount/totalCells*100).toFixed(1)}%)`);
  console.log(`📝 Letters placed: ${letterCount}/${totalCells - blackSquareCount}`);
  
  // Check for symmetry
  console.log('\n🔄 Checking 180° rotational symmetry...');
  let isSymmetric = true;
  for (let r = 0; r < puzzle.size.rows; r++) {
    for (let c = 0; c < puzzle.size.cols; c++) {
      const symR = puzzle.size.rows - 1 - r;
      const symC = puzzle.size.cols - 1 - c;
      if (puzzle.grid[r][c].isBlocked !== puzzle.grid[symR][symC].isBlocked) {
        isSymmetric = false;
        console.log(`   ❌ Asymmetry found at (${r},${c}) vs (${symR},${symC})`);
      }
    }
  }
  if (isSymmetric) {
    console.log('   ✅ Grid has perfect 180° rotational symmetry!');
  }
  
  // Display first few clues
  console.log('\n📋 Sample clues:');
  console.log('ACROSS:');
  acrossClues.slice(0, 3).forEach(clue => {
    console.log(`   ${clue.number}. ${clue.clue} (${clue.answer.length} letters)`);
  });
  console.log('DOWN:');
  downClues.slice(0, 3).forEach(clue => {
    console.log(`   ${clue.number}. ${clue.clue} (${clue.answer.length} letters)`);
  });
  
  // Visual grid representation
  console.log('\n🗺️ Grid preview:');
  for (let r = 0; r < Math.min(5, puzzle.size.rows); r++) {
    let line = '   ';
    for (let c = 0; c < Math.min(15, puzzle.size.cols); c++) {
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
  console.log('   ...');
  
  // Check for numbering consistency
  console.log('\n🔢 Checking numbering consistency...');
  const numberedCells = [];
  for (let r = 0; r < puzzle.size.rows; r++) {
    for (let c = 0; c < puzzle.size.cols; c++) {
      if (puzzle.grid[r][c].number) {
        numberedCells.push({
          number: puzzle.grid[r][c].number,
          row: r,
          col: c
        });
      }
    }
  }
  
  console.log(`   Found ${numberedCells.length} numbered cells`);
  
  // Check that all clues have corresponding numbered cells
  let allCluesHaveNumbers = true;
  for (const clue of puzzle.clues) {
    const cell = puzzle.grid[clue.startRow][clue.startCol];
    if (cell.number !== clue.number) {
      console.log(`   ❌ Clue ${clue.number} ${clue.direction} doesn't match grid cell`);
      allCluesHaveNumbers = false;
    }
  }
  if (allCluesHaveNumbers) {
    console.log('   ✅ All clues have correctly numbered cells!');
  }
  
  // Check for isolated letters (all letters should be part of words)
  console.log('\n🔍 Checking for isolated letters...');
  let hasIsolatedLetters = false;
  for (let r = 0; r < puzzle.size.rows; r++) {
    for (let c = 0; c < puzzle.size.cols; c++) {
      if (puzzle.grid[r][c].letter && !puzzle.grid[r][c].isBlocked) {
        // Check if part of across word
        const hasAcross = (c > 0 && puzzle.grid[r][c-1].letter && !puzzle.grid[r][c-1].isBlocked) ||
                         (c < puzzle.size.cols - 1 && puzzle.grid[r][c+1].letter && !puzzle.grid[r][c+1].isBlocked);
        // Check if part of down word
        const hasDown = (r > 0 && puzzle.grid[r-1][c].letter && !puzzle.grid[r-1][c].isBlocked) ||
                       (r < puzzle.size.rows - 1 && puzzle.grid[r+1][c].letter && !puzzle.grid[r+1][c].isBlocked);
        
        if (!hasAcross && !hasDown) {
          console.log(`   ❌ Isolated letter '${puzzle.grid[r][c].letter}' at (${r},${c})`);
          hasIsolatedLetters = true;
        }
      }
    }
  }
  if (!hasIsolatedLetters) {
    console.log('   ✅ No isolated letters found!');
  }
  
  console.log('\n✨ Puzzle generation test completed!');
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  console.error(error.stack);
}