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
  onFeedbackClick?: (clue: CrosswordClue) => void;
}

export const CrosswordClues: React.FC<CrosswordCluesProps> = ({
  clues,
  progress,
  focusedClue,
  onClueClick,
  validationResults,
  onFeedbackClick,
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
      'p-2 mb-1 rounded-lg border cursor-pointer backdrop-blur-sm relative',
      {
        'bg-gradient-to-br from-purple-500/40 to-blue-500/40 border-purple-400/60 ring-2 ring-purple-400/50 shadow-lg': isFocused,
        'bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-indigo-900/20 border-purple-500/20 text-purple-100': !isFocused && !validationClass,
        'opacity-90': isCompleted,
        [validationClass]: validationClass,
      }
    );
  };

  const ClueList: React.FC<{ title: string; clues: CrosswordClue[] }> = ({ title, clues }) => (
    <div className="mb-3">
      <h3 className="text-md font-bold mb-2 nebula-text flex items-center gap-2">
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
            <div className="flex items-center gap-2 relative">
              <span className="font-bold text-purple-200 min-w-[1.5rem] text-sm bg-purple-500/30 px-1.5 py-0.5 rounded flex-shrink-0">
                {clue.number}
              </span>
              <p className="leading-tight text-white text-sm font-medium flex-1 min-w-0 truncate" title={clue.clue}>
                {clue.clue}
              </p>
              {progress.completedClues.includes(clue.number) && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFeedbackClick?.(clue);
                    }}
                    className="text-blue-300 hover:text-blue-200 text-xs p-1 rounded hover:bg-blue-500/20 transition-colors flex-shrink-0"
                    title="Provide feedback"
                  >
                    💭
                  </button>
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </span>
                </>
              )}
              {validationResults && validationResults[clue.number] === false && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  ✗
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-h-[60vh] lg:max-h-full overflow-y-auto custom-scrollbar overscroll-contain">
      <div className="space-y-3">
        <ClueList title="Across" clues={acrossClues} />
        <ClueList title="Down" clues={downClues} />
      </div>
    </div>
  );
};