const { generateProperDailyPuzzle } = require('./dist/services/puzzle/properGenerator');

console.log('🔍 Testing adjacency fix for today\'s date...\n');

const testDate = '2025-09-08';
console.log(`📅 Testing puzzle generation for ${testDate} with current fixes...`);

try {
  const puzzle = generateProperDailyPuzzle(testDate);
  
  console.log(`✅ Successfully generated puzzle with ${puzzle.clues.length} clues!`);
  
  const downWords = puzzle.clues.filter(c => c.direction === 'down');
  const acrossWords = puzzle.clues.filter(c => c.direction === 'across');
  
  console.log(`📊 ${acrossWords.length} across words, ${downWords.length} down words`);
  
  console.log('\n📋 DOWN WORDS:');
  downWords.forEach(word => {
    const endRow = word.startRow + word.answer.length - 1;
    console.log(`   ${word.number}. ${word.answer} at col ${word.startCol}, rows ${word.startRow}-${endRow}`);
  });
  
  console.log('\n➡️  ACROSS WORDS:');
  acrossWords.forEach(word => {
    const endCol = word.startCol + word.answer.length - 1;  
    console.log(`   ${word.number}. ${word.answer} at row ${word.startRow}, cols ${word.startCol}-${endCol}`);
  });
  
  // Critical adjacency test
  console.log('\n🚨 CRITICAL ADJACENCY TEST:');
  let adjacencyViolations = [];
  
  // Check for down word adjacencies (the main issue you reported)
  for (let i = 0; i < downWords.length; i++) {
    for (let j = i + 1; j < downWords.length; j++) {
      const word1 = downWords[i];
      const word2 = downWords[j];
      
      // Same column check
      if (word1.startCol === word2.startCol) {
        const word1End = word1.startRow + word1.answer.length - 1;
        const word2Start = word2.startRow;
        
        // Check if word2 starts immediately after word1 ends (adjacent)
        if (word2Start === word1End + 1) {
          adjacencyViolations.push({
            type: 'DOWN ADJACENT',
            word1: `${word1.number}. ${word1.answer}`,
            word2: `${word2.number}. ${word2.answer}`,
            col: word1.startCol,
            details: `${word1.answer} ends at row ${word1End}, ${word2.answer} starts at row ${word2Start}`
          });
        }
      }
    }
  }
  
  // Check for across word adjacencies  
  for (let i = 0; i < acrossWords.length; i++) {
    for (let j = i + 1; j < acrossWords.length; j++) {
      const word1 = acrossWords[i];
      const word2 = acrossWords[j];
      
      // Same row check
      if (word1.startRow === word2.startRow) {
        const word1End = word1.startCol + word1.answer.length - 1;
        const word2Start = word2.startCol;
        
        // Check if word2 starts immediately after word1 ends (adjacent)  
        if (word2Start === word1End + 1) {
          adjacencyViolations.push({
            type: 'ACROSS ADJACENT',
            word1: `${word1.number}. ${word1.answer}`,
            word2: `${word2.number}. ${word2.answer}`,
            row: word1.startRow,
            details: `${word1.answer} ends at col ${word1End}, ${word2.answer} starts at col ${word2Start}`
          });
        }
      }
    }
  }
  
  if (adjacencyViolations.length === 0) {
    console.log('   ✅ SUCCESS: No adjacency violations found!');
    console.log('   🎉 Black square separation is working correctly!');
  } else {
    console.log(`   ❌ FAILURE: Found ${adjacencyViolations.length} adjacency violations:`);
    adjacencyViolations.forEach((v, index) => {
      console.log(`     ${index + 1}. ${v.type}: ${v.word1} flows into ${v.word2}`);
      console.log(`        ${v.details}`);
      if (v.col !== undefined) console.log(`        Column: ${v.col}`);
      if (v.row !== undefined) console.log(`        Row: ${v.row}`);
    });
    
    console.log('\n🔧 This indicates the validation fixes need further adjustment.');
  }
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  console.log('\nThis could indicate constraint issues preventing successful generation.');
}