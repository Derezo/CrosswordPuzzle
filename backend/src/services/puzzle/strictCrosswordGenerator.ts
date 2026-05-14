// This file used to host a greedy black-square-after-the-fact generator.
// It now delegates to the NYT-style template + backtracking-fill engine
// in ./nytStyleGenerator. The public API (class name, exports, types) is
// preserved so callers in cronService.ts, routes/puzzle.ts, and the
// regenerate-puzzle.sh script work unchanged.
//
// In addition to delegating, this layer owns the *tier ladder* used for
// graceful degradation when a tight category vocabulary fails strict
// generation: each tier loosens black-square / slot-length / short-slot
// constraints; the last tier runs only for category-filtered puzzles so
// daily puzzles keep their quality bar.

import {
  generateNytStyle,
  generateNytStyleAsync,
  GeneratedPuzzle,
  PuzzleCell,
  CrosswordClue,
  TemplateConstraints,
} from "./nytStyleGenerator";

export type { PuzzleCell, CrosswordClue, GeneratedPuzzle };

export type ProgressCallbackSync = (
  stage: string,
  attempt: number,
  targetWords: number,
  phase: "normal" | "fallback",
  tier?: number,
) => void;

export type ProgressCallbackAsync = (
  stage: string,
  attempt: number,
  targetWords: number,
  phase: "normal" | "fallback",
  tier?: number,
) => Promise<void> | void;

interface Tier {
  tier: number;
  label: string;
  constraints: Partial<TemplateConstraints>;
  maxTemplateAttempts: number;
  fillTimeoutMsPerTemplate: number;
  // Tier 4 (sparse last-resort) only runs for category-filtered puzzles.
  categoryOnly?: boolean;
}

const TIER_LADDER: Tier[] = [
  {
    tier: 1,
    label: "strict",
    constraints: {},
    maxTemplateAttempts: 80,
    fillTimeoutMsPerTemplate: 5000,
  },
  {
    tier: 2,
    label: "looser",
    constraints: { minBlackSquares: 48, maxBlackSquares: 68, minShortSlots: 28, maxSlotLength: 7 },
    maxTemplateAttempts: 60,
    fillTimeoutMsPerTemplate: 4000,
  },
  {
    tier: 3,
    label: "sparse",
    constraints: { minBlackSquares: 56, maxBlackSquares: 84, minShortSlots: 22, maxSlotLength: 6 },
    maxTemplateAttempts: 60,
    fillTimeoutMsPerTemplate: 4000,
  },
  {
    tier: 4,
    label: "category-fallback",
    constraints: { minBlackSquares: 64, maxBlackSquares: 100, minShortSlots: 16, maxSlotLength: 6 },
    maxTemplateAttempts: 40,
    fillTimeoutMsPerTemplate: 4000,
    categoryOnly: true,
  },
];

// Cap total wall-clock time across all tiers so a runaway category can't pin
// the worker. SSE requests are expected to be much faster than this.
const TOTAL_GENERATION_BUDGET_MS = 60_000;

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

  private applicableTiers(): Tier[] {
    const isCategory = this.categoryFilters.length > 0;
    return TIER_LADDER.filter((t) => !t.categoryOnly || isCategory);
  }

  public generate(): GeneratedPuzzle {
    const tiers = this.applicableTiers();
    const start = Date.now();
    let lastErr: Error | null = null;

    for (const tier of tiers) {
      if (Date.now() - start > TOTAL_GENERATION_BUDGET_MS) break;
      try {
        return generateNytStyle({
          seed: this.seed,
          categoryFilters: this.categoryFilters,
          templateConstraints: tier.constraints,
          maxTemplateAttempts: tier.maxTemplateAttempts,
          fillTimeoutMsPerTemplate: tier.fillTimeoutMsPerTemplate,
          tier: tier.tier,
        });
      } catch (err) {
        lastErr = err as Error;
        console.warn(
          `⚠️  Generation tier ${tier.tier} (${tier.label}) failed${this.categoryFilters.length ? ` for categories [${this.categoryFilters.join(", ")}]` : ""}: ${(err as Error).message}`,
        );
      }
    }
    throw lastErr ?? new Error("Failed to generate puzzle across all tiers");
  }

  public generateWithCallback(progressCallback?: ProgressCallbackSync): GeneratedPuzzle {
    const tiers = this.applicableTiers();
    const start = Date.now();
    let lastErr: Error | null = null;

    for (const tier of tiers) {
      if (Date.now() - start > TOTAL_GENERATION_BUDGET_MS) break;
      if (progressCallback && tier.tier > 1) {
        progressCallback("retry_tier", 0, 0, "fallback", tier.tier);
      }
      try {
        return generateNytStyle({
          seed: this.seed,
          categoryFilters: this.categoryFilters,
          templateConstraints: tier.constraints,
          maxTemplateAttempts: tier.maxTemplateAttempts,
          fillTimeoutMsPerTemplate: tier.fillTimeoutMsPerTemplate,
          tier: tier.tier,
          progress: progressCallback,
        });
      } catch (err) {
        lastErr = err as Error;
        console.warn(
          `⚠️  Generation tier ${tier.tier} (${tier.label}) failed: ${(err as Error).message}`,
        );
      }
    }
    throw lastErr ?? new Error("Failed to generate puzzle across all tiers");
  }

  public async generateWithCallbackAsync(
    progressCallback?: ProgressCallbackAsync,
  ): Promise<GeneratedPuzzle> {
    const tiers = this.applicableTiers();
    const start = Date.now();
    let lastErr: Error | null = null;

    for (const tier of tiers) {
      if (Date.now() - start > TOTAL_GENERATION_BUDGET_MS) break;
      if (progressCallback && tier.tier > 1) {
        const r = progressCallback("retry_tier", 0, 0, "fallback", tier.tier);
        if (r && typeof (r as Promise<void>).then === "function") await r;
      }
      try {
        return await generateNytStyleAsync({
          seed: this.seed,
          categoryFilters: this.categoryFilters,
          templateConstraints: tier.constraints,
          maxTemplateAttempts: tier.maxTemplateAttempts,
          fillTimeoutMsPerTemplate: tier.fillTimeoutMsPerTemplate,
          tier: tier.tier,
          progress: progressCallback,
        });
      } catch (err) {
        lastErr = err as Error;
        console.warn(
          `⚠️  Generation tier ${tier.tier} (${tier.label}) failed: ${(err as Error).message}`,
        );
      }
    }
    throw lastErr ?? new Error("Failed to generate puzzle across all tiers");
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
