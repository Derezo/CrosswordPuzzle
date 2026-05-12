// This file used to host a greedy black-square-after-the-fact generator.
// It now delegates to the NYT-style template + backtracking-fill engine
// in ./nytStyleGenerator. The public API (class name, exports, types) is
// preserved so callers in cronService.ts, routes/puzzle.ts, and the
// regenerate-puzzle.sh script work unchanged.

import {
  generateNytStyle,
  generateNytStyleAsync,
  GeneratedPuzzle,
  PuzzleCell,
  CrosswordClue,
} from "./nytStyleGenerator";

export type { PuzzleCell, CrosswordClue, GeneratedPuzzle };

export class StrictCrosswordGenerator {
  private seed: string;
  private categoryFilters: string[];

  constructor(seed: string, categoryFilter?: string | string[]) {
    this.seed = seed;
    if (categoryFilter) {
      this.categoryFilters = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
    } else {
      this.categoryFilters = [];
    }
  }

  public generate(): GeneratedPuzzle {
    return generateNytStyle({
      seed: this.seed,
      categoryFilters: this.categoryFilters,
    });
  }

  public generateWithCallback(
    progressCallback?: (
      stage: string,
      attempt: number,
      targetWords: number,
      phase: "normal" | "fallback",
    ) => void,
  ): GeneratedPuzzle {
    return generateNytStyle({
      seed: this.seed,
      categoryFilters: this.categoryFilters,
      progress: progressCallback,
    });
  }

  public async generateWithCallbackAsync(
    progressCallback?: (
      stage: string,
      attempt: number,
      targetWords: number,
      phase: "normal" | "fallback",
    ) => Promise<void> | void,
  ): Promise<GeneratedPuzzle> {
    return generateNytStyleAsync({
      seed: this.seed,
      categoryFilters: this.categoryFilters,
      progress: progressCallback,
    });
  }
}

export function generateStrictPuzzle(
  date: string,
  categoryFilter?: string,
): GeneratedPuzzle {
  const generator = new StrictCrosswordGenerator(date + nowStamp(), categoryFilter);
  return generator.generate();
}

function nowStamp(): string {
  const now = new Date();
  const pad = (n: number, width = 2) => n.toString().padStart(width, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3)
  );
}
