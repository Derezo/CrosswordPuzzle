"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGrid = validateGrid;
exports.createSolutionGrid = createSolutionGrid;
function validateGrid(userGrid, solutionGrid, cluesData, currentCompletedClues) {
    // PURE GRID-BASED VALIDATION
    // Step 1: Compare user grid with solution grid cell by cell
    const cellValidation = {}; // "row,col": boolean
    const clueResults = {}; // clue validation results
    const solvedClues = {}; // extracted answers for UI
    const newCompletedClues = [];
    // Validate each cell against solution
    for (let row = 0; row < userGrid.length; row++) {
        for (let col = 0; col < userGrid[0].length; col++) {
            const userCell = userGrid[row][col];
            const solutionCell = solutionGrid[row][col];
            if (!solutionCell.isBlocked && userCell && userCell.letter) {
                const cellKey = `${row},${col}`;
                cellValidation[cellKey] = userCell.letter.toUpperCase() === solutionCell.letter.toUpperCase();
            }
        }
    }
    // Step 2: Check clue completion based on cell validation
    for (const clue of cluesData) {
        let allCellsCorrect = true;
        let extractedAnswer = '';
        // Check each cell position for this clue
        for (let i = 0; i < clue.length; i++) {
            const row = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
            const col = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
            const cellKey = `${row},${col}`;
            // Extract letter for UI display
            if (row < userGrid.length && col < userGrid[0].length && userGrid[row][col]) {
                const userCell = userGrid[row][col];
                let letter = '';
                // Get direction-specific letter or fallback
                if (clue.direction === 'across' && userCell.acrossLetter) {
                    letter = userCell.acrossLetter;
                }
                else if (clue.direction === 'down' && userCell.downLetter) {
                    letter = userCell.downLetter;
                }
                else if (userCell.letter) {
                    letter = userCell.letter;
                }
                extractedAnswer += letter.toUpperCase();
            }
            // Check if this cell is incorrect
            if (!cellValidation[cellKey]) {
                allCellsCorrect = false;
            }
        }
        clueResults[clue.number] = allCellsCorrect && extractedAnswer.length === clue.length;
        solvedClues[clue.number.toString()] = extractedAnswer;
        // Track newly completed clues
        if (clueResults[clue.number] && !currentCompletedClues.includes(clue.number)) {
            newCompletedClues.push(clue.number);
        }
    }
    return {
        cellValidation,
        clueResults,
        solvedClues,
        newCompletedClues
    };
}
function createSolutionGrid(solutionGrid, cluesData) {
    // Create a grid with all solution letters filled in
    const resultGrid = solutionGrid.map(row => row.map(cell => ({
        letter: cell.isBlocked ? '' : cell.letter.toUpperCase(),
        acrossLetter: undefined,
        downLetter: undefined,
        lastActiveDirection: undefined
    })));
    // Fill in direction-specific letters based on clues
    for (const clue of cluesData) {
        const answer = clue.answer.toUpperCase();
        for (let i = 0; i < answer.length && i < clue.length; i++) {
            const row = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
            const col = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
            if (row < resultGrid.length && col < resultGrid[0].length) {
                if (clue.direction === 'across') {
                    resultGrid[row][col].acrossLetter = answer[i];
                }
                else {
                    resultGrid[row][col].downLetter = answer[i];
                }
                // Set the display letter and direction
                resultGrid[row][col].letter = answer[i];
                resultGrid[row][col].lastActiveDirection = clue.direction;
            }
        }
    }
    return resultGrid;
}
//# sourceMappingURL=gridValidator.js.map