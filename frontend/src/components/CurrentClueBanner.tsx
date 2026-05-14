'use client';

import React from 'react';
import { CrosswordClue } from '@/types';
import { ChevronLeftIcon, ChevronRightIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface CurrentClueBannerProps {
  clue: CrosswordClue | null;
  onPrev: () => void;
  onNext: () => void;
  onToggleDirection: () => void;
}

export const CurrentClueBanner: React.FC<CurrentClueBannerProps> = ({
  clue,
  onPrev,
  onNext,
  onToggleDirection,
}) => {
  return (
    <div
      className="lg:hidden sticky z-30 mx-2 mt-2"
      style={{ top: 'calc(var(--nav-h, 3rem) + var(--safe-top, 0px))' }}
    >
      <div
        className="cosmic-card px-2 py-2 flex items-center gap-2"
        aria-live="polite"
      >
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous clue"
          className="p-1.5 rounded-lg text-purple-200 hover:bg-purple-500/20 transition-colors shrink-0"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onToggleDirection}
          aria-label={clue ? `Direction ${clue.direction}, tap to switch` : 'Toggle direction'}
          className="flex flex-col items-center justify-center px-2 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/40 transition-colors min-w-[3rem] shrink-0 direction-toggle-pill"
        >
          {clue ? (
            // key={clue.direction} forces this subtree to remount on direction
            // change, replaying the .direction-toggle-flash CSS animation.
            <span
              key={clue.direction}
              className="flex flex-col items-center direction-toggle-flash"
            >
              <span className="text-[0.6rem] uppercase tracking-wide text-purple-200 leading-none flex items-center gap-1">
                <ArrowsRightLeftIcon className="w-2.5 h-2.5" />
                {clue.direction}
              </span>
              <span className="font-bold text-white text-sm leading-tight">{clue.number}</span>
            </span>
          ) : (
            <span className="text-[0.65rem] text-purple-200">⇆</span>
          )}
        </button>

        <p
          className="flex-1 text-sm text-white truncate"
          title={clue?.clue ?? ''}
        >
          {clue ? (
            <>
              {clue.clue}
              <span className="ml-2 text-purple-300 text-xs">({clue.length})</span>
            </>
          ) : (
            <span className="text-purple-300">Tap a cell to start solving</span>
          )}
        </p>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next clue"
          className="p-1.5 rounded-lg text-purple-200 hover:bg-purple-500/20 transition-colors shrink-0"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
