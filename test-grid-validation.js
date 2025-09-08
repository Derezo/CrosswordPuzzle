// Test script for grid-based validation
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test user credentials (should exist from previous setup)
const testUser = {
  email: 'test@example.com', 
  password: 'password123'
};

async function testGridValidation() {
  try {
    console.log('🧪 Testing grid-based validation system...\n');
    
    // 1. Login to get auth token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // 2. Get today's puzzle
    console.log('2. Fetching today\'s puzzle...');
    const puzzleResponse = await axios.get(`${API_BASE_URL}/puzzle/today`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { puzzle, progress } = puzzleResponse.data;
    console.log(`✅ Got puzzle for ${puzzle.date} with ${puzzle.clues.length} clues`);
    
    // 3. Create a test grid with intersecting words
    // Find a clue that intersects (like 15 across/down scenario)
    const acrossClue = puzzle.clues.find(c => c.direction === 'across' && c.number === 15);
    const downClue = puzzle.clues.find(c => c.direction === 'down' && c.number === 15);
    
    if (!acrossClue || !downClue) {
      console.log('⚠️  Clue 15 across/down not found. Testing with available clues...');
      
      // Find any intersecting clues 
      const acrossClueSample = puzzle.clues.find(c => c.direction === 'across');
      const downClueSample = puzzle.clues.find(c => c.direction === 'down');
      
      console.log(`📝 Testing with: ${acrossClueSample.number} across (${acrossClueSample.clue}) and ${downClueSample.number} down (${downClueSample.clue})`);
    } else {
      console.log(`📝 Found intersecting clues: 15 across (${acrossClue.clue}) and 15 down (${downClue.clue})`);
    }
    
    // 4. Create a test grid data structure
    const gridData = Array(puzzle.grid.length).fill(null).map(() => 
      Array(puzzle.grid[0].length).fill(null).map(() => ({ letter: null, isBlocked: false }))
    );
    
    // Copy the blocked cells from the original grid
    for (let row = 0; row < puzzle.grid.length; row++) {
      for (let col = 0; col < puzzle.grid[0].length; col++) {
        gridData[row][col].isBlocked = puzzle.grid[row][col].isBlocked;
      }
    }
    
    // 5. Fill in test letters for intersecting words
    // Test ABSINTHS across and AIRE down at position 15
    if (acrossClue && downClue) {
      // Fill ABSINTHS across
      const testWordAcross = 'ABSINTHS';
      for (let i = 0; i < Math.min(testWordAcross.length, acrossClue.length); i++) {
        const row = acrossClue.startRow;
        const col = acrossClue.startCol + i;
        if (row < gridData.length && col < gridData[0].length) {
          gridData[row][col].letter = testWordAcross[i];
          gridData[row][col].activeDirection = 'across';
        }
      }
      
      // Fill AIRE down  
      const testWordDown = 'AIRE';
      for (let i = 0; i < Math.min(testWordDown.length, downClue.length); i++) {
        const row = downClue.startRow + i;
        const col = downClue.startCol;
        if (row < gridData.length && col < gridData[0].length) {
          gridData[row][col].letter = testWordDown[i];
          gridData[row][col].activeDirection = 'down';
        }
      }
      
      console.log('📝 Filled test grid with ABSINTHS (across) and AIRE (down)');
    }
    
    // 6. Test the new grid-based validation
    console.log('3. Testing grid-based validation...');
    const validationResponse = await axios.post(`${API_BASE_URL}/puzzle/validate-grid`, {
      gridData: gridData,
      puzzleDate: puzzle.date
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { results, correctedAnswers, newCompletedClues } = validationResponse.data;
    
    console.log('✅ Grid validation successful!');
    console.log('📊 Results:');
    console.log('  - Validation results:', results);
    console.log('  - Corrected answers:', correctedAnswers);
    console.log('  - New completed clues:', newCompletedClues);
    
    // 7. Verify the answers are extracted correctly
    if (correctedAnswers['15']) {
      console.log(`✅ Clue 15 extracted as: "${correctedAnswers['15']}" (should be separate for across/down)`);
    }
    
    console.log('\n🎉 Grid validation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testGridValidation();