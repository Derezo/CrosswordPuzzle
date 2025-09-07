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
        validationClass = 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-100';
      } else {
        validationClass = 'bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/40 text-red-100';
      }
    }

    return clsx(
      'p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-purple-400/50 backdrop-blur-sm',
      {
        'bg-gradient-to-br from-purple-500/40 to-blue-500/40 border-purple-400/60 ring-2 ring-purple-400/50 shadow-lg': isFocused,
        'bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-indigo-900/20 border-purple-500/20 text-purple-100': !isFocused && !validationClass,
        'opacity-80 hover:opacity-100': isCompleted,
        [validationClass]: validationClass,
      }
    );
  };

  const ClueList: React.FC<{ title: string; clues: CrosswordClue[] }> = ({ title, clues }) => (
    <div className="mb-4">
      <h3 className="text-lg font-bold mb-2 nebula-text flex items-center gap-2">
        <span>{title === 'Across' ? '➡️' : '⬇️'}</span>
        <span>{title}</span>
      </h3>
      <div className="space-y-1">
        {clues.map((clue) => (
          <div
            key={`${clue.direction}-${clue.number}`}
            className={getClueClasses(clue)}
            onClick={() => onClueClick(clue)}
          >
            <div className="flex items-start gap-3">
              <span className="font-bold text-purple-200 min-w-[2rem] text-sm bg-purple-500/30 px-2 py-1 rounded-md flex-shrink-0">
                {clue.number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="leading-tight text-white text-sm font-medium">
                  {clue.clue}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-purple-200 bg-purple-500/20 px-2 py-0.5 rounded-full">
                    {clue.length} letters
                  </span>
                  {progress.completedClues.includes(clue.number) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                      ✨ Solved
                    </span>
                  )}
                  {validationResults && validationResults[clue.number] === false && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-500 text-white">
                      🔄 Try Again
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
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="space-y-4">
        <ClueList title="Across" clues={acrossClues} />
        <ClueList title="Down" clues={downClues} />
      </div>
    </div>
  );
};