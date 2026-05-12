'use client';

import React from 'react';

interface PuzzleErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface PuzzleErrorBoundaryState {
  hasError: boolean;
}

/**
 * Class-based error boundary around the crossword grid. React 19 still does
 * not provide a hook-based equivalent, so this small class component is the
 * recommended pattern.
 */
export class PuzzleErrorBoundary extends React.Component<
  PuzzleErrorBoundaryProps,
  PuzzleErrorBoundaryState
> {
  constructor(props: PuzzleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): PuzzleErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Surface the failure in dev tools without leaking stack traces to users.
    console.error('PuzzleErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="cosmic-card p-6 text-center border border-red-500/40"
        >
          <div className="text-4xl mb-3">💥</div>
          <h3 className="text-white text-lg font-bold mb-2">
            Something went wrong loading the grid.
          </h3>
          <p className="text-red-200 text-sm">Refresh to try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PuzzleErrorBoundary;
