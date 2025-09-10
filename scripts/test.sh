#!/bin/bash
# Run all tests

echo "🧪 Running tests..."

echo "🔍 TypeScript type checking (Backend)..."
cd backend
npx tsc --noEmit

echo "🔍 TypeScript type checking (Frontend)..."
cd ../frontend
npx tsc --noEmit

echo "🔍 ESLint (Frontend)..."
pnpm run lint

echo "🧩 Testing puzzle generation..."
cd ../backend
node -e "
const { generateStrictPuzzle } = require('./dist/services/puzzle/strictCrosswordGenerator');
const puzzle = generateStrictPuzzle('2024-01-01');
if (!puzzle || !puzzle.grid || !puzzle.clues) {
  console.error('❌ Puzzle generation test failed');
  process.exit(1);
}
console.log('✅ Puzzle generation test passed');
"

echo "✅ All tests passed!"
