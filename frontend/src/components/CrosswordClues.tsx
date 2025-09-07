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
      'p-4 mb-3 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-purple-400/50 backdrop-blur-sm',
      {
        'bg-gradient-to-br from-purple-500/40 to-blue-500/40 border-purple-400/60 ring-2 ring-purple-400/50 shadow-lg': isFocused,
        'bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-indigo-900/20 border-purple-500/20 text-purple-100': !isFocused && !validationClass,
        'opacity-80 hover:opacity-100': isCompleted,
        [validationClass]: validationClass,
      }
    );
  };

  const ClueList: React.FC<{ title: string; clues: CrosswordClue[] }> = ({ title, clues }) => (
    <div className="mb-6">
      <h3 className="text-xl font-bold mb-4 nebula-text flex items-center gap-2">
        <span>{title === 'Across' ? '➡️' : '⬇️'}</span>
        <span>{title}</span>
      </h3>
      <div className="space-y-2">
        {clues.map((clue) => (
          <div
            key={`${clue.direction}-${clue.number}`}
            className={getClueClasses(clue)}
            onClick={() => onClueClick(clue)}
          >
            <div className="flex items-start gap-4">
              <span className="font-bold text-purple-200 min-w-[2.5rem] text-lg bg-purple-500/30 px-2 py-1 rounded-lg">
                {clue.number}
              </span>
              <div className="flex-1">
                <p className="leading-relaxed text-white font-medium">
                  {clue.clue}
                </p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-purple-200 bg-purple-500/20 px-2 py-1 rounded-full">
                    📏 {clue.length} letters
                  </span>
                  {progress.completedClues.includes(clue.number) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md">
                      ✨ Solved
                    </span>
                  )}
                  {validationResults && validationResults[clue.number] === false && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md">
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
      <div className="sticky top-0 bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-md p-4 mb-6 rounded-xl border border-purple-500/30 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="text-3xl">🧩</span>
          <span>Cosmic Clues</span>
        </h2>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-purple-500/30 px-3 py-2 rounded-full">
            <span className="text-sm text-purple-100 font-medium">Progress:</span>
            <span className="text-lg font-bold text-green-400">{progress.completedClues.length}</span>
            <span className="text-purple-200">/</span>
            <span className="text-lg font-bold text-white">{clues.length}</span>
          </div>
          {progress.isCompleted && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-green-500/30 to-emerald-500/30 px-4 py-2 rounded-full border border-green-400/40">
              <span className="text-xl">🎉</span>
              <span className="text-green-200 font-semibold">Mission Complete!</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-8">
        <ClueList title="Across" clues={acrossClues} />
        <ClueList title="Down" clues={downClues} />
      </div>
    </div>
  );
};