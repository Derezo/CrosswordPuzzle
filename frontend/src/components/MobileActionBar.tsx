'use client';

import React from 'react';
import clsx from 'clsx';

interface MobileActionBarProps {
  onCheckAnswers: () => void;
  onAutoSolve: () => void;
  canCheckAnswers: boolean;
  autoSolving: boolean;
  hidden?: boolean;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({
  onCheckAnswers,
  onAutoSolve,
  canCheckAnswers,
  autoSolving,
  hidden = false,
}) => {
  if (hidden) return null;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 pb-safe backdrop-blur-md border-t border-purple-500/30"
      style={{
        background:
          'linear-gradient(to top, var(--dark-nebula) 0%, rgba(26, 11, 46, 0.95) 60%, rgba(26, 11, 46, 0) 100%)',
      }}
    >
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={onCheckAnswers}
          disabled={!canCheckAnswers}
          className={clsx(
            'flex-1 aurora-button text-sm py-2.5 px-4',
            !canCheckAnswers && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <span>✨</span>
            <span>Check &amp; Save</span>
          </span>
        </button>

        <button
          onClick={onAutoSolve}
          disabled={autoSolving}
          className="flex-1 stellar-button text-sm py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {autoSolving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
              <span>Revealing...</span>
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🔍</span>
              <span>Auto-Solve</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
