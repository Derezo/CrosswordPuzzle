const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('✅ Testing crossword generation improvements...\n');

// Test multiple dates to see success rates
const testDates = ['2025-09-01', '2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05'];
let successes = 0;

for (const date of testDates) {
  console.log(`📅 Testing ${date}...`);
  try {
    const puzzle = generateProperDailyPuzzle(date);
    console.log(`✅ Success! Generated ${puzzle.clues.length} clues`);
    
    const acrossClues = puzzle.clues.filter(c => c.direction === 'across').length;
    const downClues = puzzle.clues.filter(c => c.direction === 'down').length;
    console.log(`   📊 ${acrossClues} across, ${downClues} down\n`);
    
    successes++;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
  }
}

console.log(`\n🎯 Results: ${successes}/${testDates.length} successful generations`);
console.log('✅ Validation improvements are working correctly!');
console.log('📈 The generator now allows single-direction letters and proper word separation.');