const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🔍 Debugging validation failures...\n');

try {
  const testDate = '2025-09-08';
  console.log(`📅 Generating puzzle for ${testDate} with debugging...`);
  
  const puzzle = generateProperDailyPuzzle(testDate);
  console.log(`✅ Success! Generated ${puzzle.clues.length} clues`);
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  console.log('\nDebugging information shows constraint validation is too strict.');
}