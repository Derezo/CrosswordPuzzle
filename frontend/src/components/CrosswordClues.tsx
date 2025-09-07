'use client';

import React from 'react';
import { CrosswordClue, UserProgress } from '@/types';
import clsx from 'clsx';

interface CrosswordCluesProps {
  clues: CrosswordClue[];
  progress: UserProgress;
  focusedClue?: CrosswordClue | null;
  onClueClick: (clue: CrosswordClue) => void;
  validationResults?: { [clueNumber: number]: boolean };
}

export const CrosswordClues: React.FC<CrosswordCluesProps> = ({
  clues,
  progress,
  focusedClue,
  onClueClick,
  validationResults,
}) => {
  const acrossClues = clues.filter(clue => clue.direction === 'across').sort((a, b) => a.number - b.number);
  const downClues = clues.filter(clue => clue.direction === 'down').sort((a, b) => a.number - b.number);

  const getClueClasses = (clue: CrosswordClue) => {
    const isCompleted = progress.completedClues.includes(clue.number);
    const isFocused = focusedClue?.number === clue.number && focusedClue?.direction === clue.direction;
    let validationClass = '';
    
    if (validationResults && validationResults[clue.number] !== undefined) {
      if (validationResults[clue.number]) {
        validationClass = 'bg-green-100 border-green-300';
      } else {
        validationClass = 'bg-red-100 border-red-300';
      }
    }

    return clsx(
      'p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md',
      {
        'bg-blue-100 border-blue-300 ring-2 ring-blue-500': isFocused,
        'bg-gray-50 border-gray-200': !isFocused && !validationClass,
        'opacity-60': isCompleted,
        [validationClass]: validationClass,
      }
    );
  };

  const ClueList: React.FC<{ title: string; clues: CrosswordClue[] }> = ({ title, clues }) => (
    <div className="mb-6">
      <h3 className="text-lg font-bold mb-3 text-gray-800">{title}</h3>
      <div className="space-y-2">
        {clues.map((clue) => (
          <div
            key={`${clue.direction}-${clue.number}`}
            className={getClueClasses(clue)}
            onClick={() => onClueClick(clue)}
          >
            <div className="flex items-start gap-3">
              <span className="font-bold text-gray-600 min-w-[2rem]">
                {clue.number}
              </span>
              <div className="flex-1">
                <p className="text-gray-800 leading-relaxed">
                  {clue.clue}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {clue.length} letters
                  </span>
                  {progress.completedClues.includes(clue.number) && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Completed
                    </span>
                  )}
                  {validationResults && validationResults[clue.number] === false && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      ✗ Incorrect
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Clues</h2>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>Completed: {progress.completedClues.length}/{clues.length}</span>
          {progress.isCompleted && (
            <span className="text-green-600 font-medium">✓ Puzzle Solved!</span>
          )}
        </div>
      </div>
      
      <ClueList title="Across" clues={acrossClues} />
      <ClueList title="Down" clues={downClues} />
    </div>
  );
};