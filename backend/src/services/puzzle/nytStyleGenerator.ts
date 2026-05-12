import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { parse } from "csv-parse/sync";

export interface PuzzleCell {
  letter: string;
  number: number | null;
  isBlocked: boolean;
}

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  direction: "across" | "down";
  startRow: number;
  startCol: number;
  length: number;
}

export interface GeneratedPuzzle {
  grid: PuzzleCell[][];
  clues: CrosswordClue[];
  size: { rows: number; cols: number };
}

export interface DictionaryEntry {
  word: string;
  clue: string;
  is_common_english: boolean;
  obscure: boolean;
  categories?: string;
}

interface Slot {
  id: number;
  direction: "across" | "down";
  row: number;
  col: number;
  length: number;
  // For each position 0..length-1, the slot id and offset of the perpendicular slot
  // that crosses this slot at that position (or null if none — should not happen in a fully-checked grid).
  crosses: Array<{ slotId: number; offset: number } | null>;
}

interface ProgressCallback {
  (
    stage: string,
    attempt: number,
    targetWords: number,
    phase: "normal" | "fallback",
  ): void | Promise<void>;
}

export const GRID_SIZE = 15;
export const MIN_WORD_LENGTH = 3;
const MIN_BLACK_SQUARES = 44; // ~19.5%
const MAX_BLACK_SQUARES = 58; // ~25.8%
const MAX_SLOT_LENGTH = 8; // Cap slots at 8; longer entries make fill brittle with our dictionary.
const MIN_SHORT_SLOTS = 32; // Most slots should be 3..5 letters.
const MAX_TEMPLATE_ATTEMPTS = 8000;
const MAX_FILL_BACKTRACKS = 150000;

// ---------------------------------------------------------------------------
// Dictionary
// ---------------------------------------------------------------------------

export class Dictionary {
  public entries: DictionaryEntry[] = [];
  public byWord: Map<string, DictionaryEntry> = new Map();
  // byLengthLetterPos[length][position][letter] -> list of entries
  private byLengthLetterPos: Map<number, Map<number, Map<string, DictionaryEntry[]>>> = new Map();
  private byLength: Map<number, DictionaryEntry[]> = new Map();

  constructor(entries: DictionaryEntry[]) {
    this.entries = entries;
    for (const e of entries) {
      this.byWord.set(e.word, e);
      const len = e.word.length;
      if (!this.byLength.has(len)) this.byLength.set(len, []);
      this.byLength.get(len)!.push(e);
    }
    // Sort each length bucket: common-non-obscure > non-obscure > common-obscure > obscure.
    const rank = (e: DictionaryEntry) =>
      (e.is_common_english ? 2 : 0) + (e.obscure ? 0 : 1);
    for (const list of this.byLength.values()) {
      list.sort((a, b) => rank(b) - rank(a));
    }
    this.buildIndex();
  }

  private buildIndex(): void {
    for (const [len, list] of this.byLength) {
      const posMap = new Map<number, Map<string, DictionaryEntry[]>>();
      for (let pos = 0; pos < len; pos++) {
        posMap.set(pos, new Map());
      }
      for (const entry of list) {
        for (let pos = 0; pos < entry.word.length; pos++) {
          const letterMap = posMap.get(pos)!;
          const ch = entry.word[pos];
          if (!letterMap.has(ch)) letterMap.set(ch, []);
          letterMap.get(ch)!.push(entry);
        }
      }
      this.byLengthLetterPos.set(len, posMap);
    }
  }

  public has(word: string): boolean {
    return this.byWord.has(word);
  }

  public candidatesForLength(len: number): DictionaryEntry[] {
    return this.byLength.get(len) || [];
  }

  // Find dictionary entries of `length` whose letters match `pattern`.
  // `pattern` is an array of length `length` where each cell is either '' (unconstrained)
  // or a single uppercase letter.
  public match(length: number, pattern: string[]): DictionaryEntry[] {
    const posMap = this.byLengthLetterPos.get(length);
    if (!posMap) return [];

    // Find the most-constraining fixed position to seed the candidate list.
    let seedList: DictionaryEntry[] | null = null;
    const constraints: Array<{ pos: number; ch: string }> = [];
    for (let pos = 0; pos < length; pos++) {
      const ch = pattern[pos];
      if (ch) {
        constraints.push({ pos, ch });
        const list = posMap.get(pos)?.get(ch);
        if (!list) return [];
        if (!seedList || list.length < seedList.length) seedList = list;
      }
    }

    if (!seedList) return this.byLength.get(length) || [];

    if (constraints.length === 1) return seedList;

    // Filter the seed list by remaining constraints (in-memory; lists are small).
    return seedList.filter((entry) => {
      for (const { pos, ch } of constraints) {
        if (entry.word[pos] !== ch) return false;
      }
      return true;
    });
  }

  // Count matches without materializing the list — used for MRV ordering.
  public countMatches(length: number, pattern: string[]): number {
    const posMap = this.byLengthLetterPos.get(length);
    if (!posMap) return 0;

    let seedList: DictionaryEntry[] | null = null;
    const constraints: Array<{ pos: number; ch: string }> = [];
    for (let pos = 0; pos < length; pos++) {
      const ch = pattern[pos];
      if (ch) {
        constraints.push({ pos, ch });
        const list = posMap.get(pos)?.get(ch);
        if (!list) return 0;
        if (!seedList || list.length < seedList.length) seedList = list;
      }
    }

    if (!seedList) return (this.byLength.get(length) || []).length;
    if (constraints.length === 1) return seedList.length;

    let count = 0;
    for (const entry of seedList) {
      let ok = true;
      for (const { pos, ch } of constraints) {
        if (entry.word[pos] !== ch) {
          ok = false;
          break;
        }
      }
      if (ok) count++;
    }
    return count;
  }
}

export function loadDictionaryFromCsv(
  csvPath: string,
  categoryFilters: string[] = [],
  maxWordLength: number = GRID_SIZE,
): Dictionary {
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records: any[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  // Note: We do NOT exclude "obscure" words at load time. The CSV's obscure flag
  // is over-aggressive (~75% flagged), and removing those words leaves too few
  // for the fill solver. Instead, we keep them and rank common words higher
  // during candidate selection.
  const seen = new Map<string, DictionaryEntry>();
  for (const record of records) {
    const word = (record.word || "").toUpperCase();
    if (!word) continue;
    if (word.length < MIN_WORD_LENGTH || word.length > maxWordLength) continue;
    if (!/^[A-Z]+$/.test(word)) continue;
    if (!record.clue) continue;

    if (categoryFilters.length > 0) {
      const cats = (record.categories || "")
        .toLowerCase()
        .split(",")
        .map((c: string) => c.trim());
      const matches = categoryFilters.some((f) => cats.includes(f.toLowerCase()));
      if (!matches) continue;
    }

    const isObscure = record.obscure === "True" || record.obscure === true;
    const isCommon = record.is_common_english === "True";
    const entry: DictionaryEntry = {
      word,
      clue: record.clue,
      is_common_english: isCommon,
      obscure: isObscure,
      categories: record.categories,
    };
    const existing = seen.get(word);
    // Prefer the entry that's most "promotable": common over obscure, non-obscure over obscure.
    if (!existing) {
      seen.set(word, entry);
    } else {
      const upgrade =
        (entry.is_common_english && !existing.is_common_english) ||
        (!entry.obscure && existing.obscure);
      if (upgrade) seen.set(word, entry);
    }
  }
  return new Dictionary(Array.from(seen.values()));
}

// ---------------------------------------------------------------------------
// Template generation: 180-degree symmetric black-square pattern
// ---------------------------------------------------------------------------

export type Template = boolean[][]; // true = black, false = white

function makeRng(seed: string): () => number {
  const hash = crypto.createHash("sha256").update(seed).digest();
  let s0 = hash.readUInt32BE(0) || 1;
  let s1 = hash.readUInt32BE(4) || 2;
  // xorshift-ish
  return () => {
    s0 ^= s0 << 13;
    s0 ^= s0 >>> 17;
    s0 ^= s0 << 5;
    s0 >>>= 0;
    s1 = (s1 * 1664525 + 1013904223) >>> 0;
    return ((s0 ^ s1) >>> 0) / 0x100000000;
  };
}

function symmetricCounterpart(r: number, c: number, size: number): [number, number] {
  return [size - 1 - r, size - 1 - c];
}

// Check all runs of white squares are length >= 3 (or 0).
function allRunsValid(t: Template): boolean {
  const n = t.length;
  for (let r = 0; r < n; r++) {
    let run = 0;
    for (let c = 0; c < n; c++) {
      if (t[r][c]) {
        if (run > 0 && run < MIN_WORD_LENGTH) return false;
        run = 0;
      } else {
        run++;
      }
    }
    if (run > 0 && run < MIN_WORD_LENGTH) return false;
  }
  for (let c = 0; c < n; c++) {
    let run = 0;
    for (let r = 0; r < n; r++) {
      if (t[r][c]) {
        if (run > 0 && run < MIN_WORD_LENGTH) return false;
        run = 0;
      } else {
        run++;
      }
    }
    if (run > 0 && run < MIN_WORD_LENGTH) return false;
  }
  return true;
}

// Every white cell must belong to BOTH an across word of length >=3 AND a down word of length >=3.
function allCellsFullyChecked(t: Template): boolean {
  const n = t.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (t[r][c]) continue;

      // Across run length through (r,c)
      let cs = c, ce = c;
      while (cs > 0 && !t[r][cs - 1]) cs--;
      while (ce < n - 1 && !t[r][ce + 1]) ce++;
      if (ce - cs + 1 < MIN_WORD_LENGTH) return false;

      // Down run length through (r,c)
      let rs = r, re = r;
      while (rs > 0 && !t[rs - 1][c]) rs--;
      while (re < n - 1 && !t[re + 1][c]) re++;
      if (re - rs + 1 < MIN_WORD_LENGTH) return false;
    }
  }
  return true;
}

function whiteCellsConnected(t: Template): boolean {
  const n = t.length;
  let start: [number, number] | null = null;
  let totalWhite = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!t[r][c]) {
        if (!start) start = [r, c];
        totalWhite++;
      }
    }
  }
  if (!start) return false;

  const seen = Array.from({ length: n }, () => new Array(n).fill(false));
  const stack: Array<[number, number]> = [start];
  seen[start[0]][start[1]] = true;
  let visited = 0;
  while (stack.length) {
    const [r, c] = stack.pop()!;
    visited++;
    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (t[nr][nc]) continue;
      if (seen[nr][nc]) continue;
      seen[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }
  return visited === totalWhite;
}

function countBlack(t: Template): number {
  let n = 0;
  for (const row of t) for (const v of row) if (v) n++;
  return n;
}

// Check whether a tentative cell, plus its symmetric counterpart, can be safely
// added without violating the run-length rule. We don't enforce fully-checked
// here because that's only meaningful on the finished grid.
function tentativePlacementOK(t: Template, r: number, c: number): boolean {
  const n = t.length;
  // Check the affected row and column for short runs.
  const checkRowRuns = (row: number) => {
    let run = 0;
    for (let col = 0; col <= n; col++) {
      const black = col === n || t[row][col];
      if (black) {
        if (run > 0 && run < MIN_WORD_LENGTH) return false;
        run = 0;
      } else run++;
    }
    return true;
  };
  const checkColRuns = (col: number) => {
    let run = 0;
    for (let row = 0; row <= n; row++) {
      const black = row === n || t[row][col];
      if (black) {
        if (run > 0 && run < MIN_WORD_LENGTH) return false;
        run = 0;
      } else run++;
    }
    return true;
  };
  return checkRowRuns(r) && checkColRuns(c);
}

// Try to construct one valid template. Returns null on failure.
function tryBuildTemplate(rng: () => number, size: number): Template | null {
  const t: Template = Array.from({ length: size }, () => new Array(size).fill(false));

  const targetBlack =
    MIN_BLACK_SQUARES + Math.floor(rng() * (MAX_BLACK_SQUARES - MIN_BLACK_SQUARES + 1));

  // Candidate cells: only the "first half" (lexicographically before the center under symmetry).
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const [sr, sc] = symmetricCounterpart(r, c, size);
      if (r < sr || (r === sr && c < sc)) {
        candidates.push([r, c]);
      } else if (r === sr && c === sc) {
        candidates.push([r, c]);
      }
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Phase 1: place black-square pairs as long as the run rule is preserved.
  // We don't enforce the fully-checked rule yet — that's only meaningful on the
  // finished pattern, and intermediate states often legitimately violate it.
  for (const [r, c] of candidates) {
    if (countBlack(t) >= targetBlack) break;
    if (t[r][c]) continue;

    const [sr, sc] = symmetricCounterpart(r, c, size);
    const isCenter = r === sr && c === sc;

    t[r][c] = true;
    if (!isCenter) t[sr][sc] = true;

    // Run-length and slot-cap check on affected rows/cols.
    const runsOk = tentativePlacementOK(t, r, c) && (isCenter || tentativePlacementOK(t, sr, sc));
    if (!runsOk) {
      t[r][c] = false;
      if (!isCenter) t[sr][sc] = false;
      continue;
    }

    // Also enforce the MAX_SLOT_LENGTH cap by checking max run lengths on these rows/cols.
    if (maxRunInRow(t, r) > MAX_SLOT_LENGTH || maxRunInCol(t, c) > MAX_SLOT_LENGTH) {
      // Keep this placement only if it doesn't push us over.
    }
  }

  // Phase 2: break runs that exceed MAX_SLOT_LENGTH by inserting symmetric
  // black-square pairs into the middle of long runs.
  breakLongRuns(t, rng);

  // Final validation.
  if (countBlack(t) < MIN_BLACK_SQUARES) return null;
  if (!allRunsValid(t)) return null;
  if (!allCellsFullyChecked(t)) return null;
  if (!whiteCellsConnected(t)) return null;

  const lens = slotLengths(t);
  if (lens.some((l) => l > MAX_SLOT_LENGTH)) return null;
  const shortCount = lens.filter((l) => l >= 3 && l <= 5).length;
  if (shortCount < MIN_SHORT_SLOTS) return null;

  return t;
}

// After initial placement, find any white run longer than MAX_SLOT_LENGTH and
// try to insert a black square (with its symmetric pair) that breaks it cleanly,
// without creating a short run on either side.
function breakLongRuns(t: Template, rng: () => number): void {
  const n = t.length;
  let safety = 0;
  while (safety++ < 50) {
    // Find longest run in any row or column.
    let target: { kind: "row" | "col"; index: number; start: number; len: number } | null = null;
    for (let r = 0; r < n; r++) {
      let run = 0, runStart = 0;
      for (let c = 0; c <= n; c++) {
        const black = c === n || t[r][c];
        if (black) {
          if (run > MAX_SLOT_LENGTH) {
            if (!target || run > target.len) target = { kind: "row", index: r, start: runStart, len: run };
          }
          run = 0; runStart = c + 1;
        } else run++;
      }
    }
    for (let c = 0; c < n; c++) {
      let run = 0, runStart = 0;
      for (let r = 0; r <= n; r++) {
        const black = r === n || t[r][c];
        if (black) {
          if (run > MAX_SLOT_LENGTH) {
            if (!target || run > target.len) target = { kind: "col", index: c, start: runStart, len: run };
          }
          run = 0; runStart = r + 1;
        } else run++;
      }
    }
    if (!target) return;

    // Try each cut position in the run (preferring middle) that produces two
    // halves each >= MIN_WORD_LENGTH.
    const cuts: number[] = [];
    for (let off = MIN_WORD_LENGTH; off <= target.len - MIN_WORD_LENGTH; off++) {
      cuts.push(off);
    }
    // Sort by distance from middle.
    const mid = target.len / 2;
    cuts.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));

    let placed = false;
    for (const off of cuts) {
      const r = target.kind === "row" ? target.index : target.start + off;
      const c = target.kind === "row" ? target.start + off : target.index;
      const [sr, sc] = symmetricCounterpart(r, c, n);
      const isCenter = r === sr && c === sc;
      if (t[r][c] || (!isCenter && t[sr][sc])) continue;
      t[r][c] = true;
      if (!isCenter) t[sr][sc] = true;
      if (
        tentativePlacementOK(t, r, c) &&
        (isCenter || tentativePlacementOK(t, sr, sc))
      ) {
        placed = true;
        break;
      } else {
        t[r][c] = false;
        if (!isCenter) t[sr][sc] = false;
      }
    }
    if (!placed) return; // Can't break this run cleanly; let the validator reject it.
  }
}

function maxRunInRow(t: Template, r: number): number {
  const n = t.length;
  let best = 0, run = 0;
  for (let c = 0; c <= n; c++) {
    const black = c === n || t[r][c];
    if (black) {
      if (run > best) best = run;
      run = 0;
    } else run++;
  }
  return best;
}
function maxRunInCol(t: Template, c: number): number {
  const n = t.length;
  let best = 0, run = 0;
  for (let r = 0; r <= n; r++) {
    const black = r === n || t[r][c];
    if (black) {
      if (run > best) best = run;
      run = 0;
    } else run++;
  }
  return best;
}

function slotLengths(t: Template): number[] {
  const n = t.length;
  const lens: number[] = [];
  for (let r = 0; r < n; r++) {
    let run = 0;
    for (let c = 0; c <= n; c++) {
      const black = c === n || t[r][c];
      if (black) {
        if (run >= MIN_WORD_LENGTH) lens.push(run);
        run = 0;
      } else run++;
    }
  }
  for (let c = 0; c < n; c++) {
    let run = 0;
    for (let r = 0; r <= n; r++) {
      const black = r === n || t[r][c];
      if (black) {
        if (run >= MIN_WORD_LENGTH) lens.push(run);
        run = 0;
      } else run++;
    }
  }
  return lens;
}

export function generateTemplate(seed: string, size: number = GRID_SIZE): Template {
  const rng = makeRng("template:" + seed);
  for (let attempt = 0; attempt < MAX_TEMPLATE_ATTEMPTS; attempt++) {
    const t = tryBuildTemplate(rng, size);
    if (t) return t;
  }
  throw new Error(`Failed to build a valid template after ${MAX_TEMPLATE_ATTEMPTS} attempts`);
}

// ---------------------------------------------------------------------------
// Slot extraction
// ---------------------------------------------------------------------------

export function extractSlots(t: Template): Slot[] {
  const size = t.length;
  const slots: Slot[] = [];
  // First pass: enumerate across slots and remember the slot id for each cell.
  const acrossAt: Array<Array<{ slotId: number; offset: number } | null>> = Array.from(
    { length: size },
    () => new Array(size).fill(null),
  );
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (t[r][c]) {
        c++;
        continue;
      }
      const startC = c;
      while (c < size && !t[r][c]) c++;
      const length = c - startC;
      if (length >= MIN_WORD_LENGTH) {
        const id = slots.length;
        slots.push({
          id,
          direction: "across",
          row: r,
          col: startC,
          length,
          crosses: new Array(length).fill(null),
        });
        for (let i = 0; i < length; i++) {
          acrossAt[r][startC + i] = { slotId: id, offset: i };
        }
      }
    }
  }

  // Second pass: enumerate down slots, wiring up cross references.
  const downAt: Array<Array<{ slotId: number; offset: number } | null>> = Array.from(
    { length: size },
    () => new Array(size).fill(null),
  );
  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      if (t[r][c]) {
        r++;
        continue;
      }
      const startR = r;
      while (r < size && !t[r][c]) r++;
      const length = r - startR;
      if (length >= MIN_WORD_LENGTH) {
        const id = slots.length;
        slots.push({
          id,
          direction: "down",
          row: startR,
          col: c,
          length,
          crosses: new Array(length).fill(null),
        });
        for (let i = 0; i < length; i++) {
          downAt[startR + i][c] = { slotId: id, offset: i };
        }
      }
    }
  }

  // Wire crosses between across and down.
  for (const slot of slots) {
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === "across" ? slot.row : slot.row + i;
      const c = slot.direction === "across" ? slot.col + i : slot.col;
      const other = slot.direction === "across" ? downAt[r][c] : acrossAt[r][c];
      slot.crosses[i] = other;
    }
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Fill solver: backtracking with MRV + commonness preference
// ---------------------------------------------------------------------------

interface FillState {
  slots: Slot[];
  // assignments[slotId] = word or null
  assignments: Array<string | null>;
  // letterGrid[r][c] = letter ('' if unassigned, ' ' if black)
  letterGrid: string[][];
  // usedWords: set of words already placed (avoid duplicates)
  usedWords: Set<string>;
  dict: Dictionary;
  size: number;
  rng: () => number;
  backtracks: number;
  maxBacktracks: number;
  // Set of slot ids that have been assigned.
  assignedSet: Set<number>;
  // Optional wall-clock deadline (ms since epoch). If exceeded, abort the fill.
  deadlineMs?: number;
}

function makeLetterGridFromTemplate(t: Template): string[][] {
  return t.map((row) => row.map((isBlack) => (isBlack ? " " : "")));
}

function slotPattern(state: FillState, slot: Slot): string[] {
  const pattern: string[] = [];
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "across" ? slot.row : slot.row + i;
    const c = slot.direction === "across" ? slot.col + i : slot.col;
    pattern.push(state.letterGrid[r][c] || "");
  }
  return pattern;
}

function placeWord(state: FillState, slot: Slot, word: string): void {
  state.assignments[slot.id] = word;
  state.usedWords.add(word);
  state.assignedSet.add(slot.id);
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "across" ? slot.row : slot.row + i;
    const c = slot.direction === "across" ? slot.col + i : slot.col;
    state.letterGrid[r][c] = word[i];
  }
}

function removeWord(state: FillState, slot: Slot, priorPattern: string[]): void {
  const word = state.assignments[slot.id]!;
  state.assignments[slot.id] = null;
  state.usedWords.delete(word);
  state.assignedSet.delete(slot.id);
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "across" ? slot.row : slot.row + i;
    const c = slot.direction === "across" ? slot.col + i : slot.col;
    state.letterGrid[r][c] = priorPattern[i];
  }
}

// Pick the next slot to fill.
// Strategy:
//   1. If any slot has 0 viable candidates -> return it (forces backtrack).
//   2. Among slots with at least one filled letter, pick the one with fewest
//      candidates (classic MRV — break constraints first).
//   3. If no slot has any filled letters yet (first move), pick the slot with
//      the most crossing slots (most impactful seed) and reasonable bucket size.
function pickNextSlot(state: FillState): { slot: Slot; candidates: DictionaryEntry[] } | null {
  let bestConstrained:
    | { slot: Slot; candidates: DictionaryEntry[]; score: number }
    | null = null;
  let bestSeed:
    | { slot: Slot; candidates: DictionaryEntry[]; score: number }
    | null = null;

  for (const slot of state.slots) {
    if (state.assignedSet.has(slot.id)) continue;
    const pattern = slotPattern(state, slot);
    const hasConstraint = pattern.some((p) => p !== "");
    const candidates = state.dict
      .match(slot.length, pattern)
      .filter((e) => !state.usedWords.has(e.word));

    if (candidates.length === 0) {
      return { slot, candidates: [] };
    }

    if (hasConstraint) {
      // MRV with a longest-slot tiebreaker. Long slots that become heavily
      // constrained should be handled ASAP — otherwise they become dead ends
      // deep in the search tree (e.g. a 15-letter row constrained on all 15 cells
      // late in the fill is almost certainly unfillable).
      // We bias score so longer slots are preferred among small candidate sets.
      const score = candidates.length + Math.max(0, 8 - slot.length) * 2;
      if (
        !bestConstrained ||
        score < bestConstrained.score ||
        (score === bestConstrained.score && slot.length > bestConstrained.slot.length)
      ) {
        bestConstrained = { slot, candidates, score };
      }
    } else {
      // Seed slot: prefer a medium-length (6-8), highly-connected slot.
      const len = slot.length;
      let lengthBonus = 0;
      if (len >= 6 && len <= 8) lengthBonus = 1000;
      else if (len === 5 || len === 9) lengthBonus = 500;
      else if (len >= 10) lengthBonus = -200 * (len - 9);
      const intersections = slot.crosses.filter((x) => x !== null).length;
      const score = lengthBonus + intersections * 100 + Math.min(candidates.length, 1500) * 0.1;
      if (!bestSeed || score > bestSeed.score) {
        bestSeed = { slot, candidates, score };
      }
    }
  }

  if (bestConstrained) return { slot: bestConstrained.slot, candidates: bestConstrained.candidates };
  if (bestSeed) return { slot: bestSeed.slot, candidates: bestSeed.candidates };
  return null;
}

// Score a candidate by how many options it leaves for crossing slots.
// Higher = more downstream options preserved.
function scoreCandidate(state: FillState, slot: Slot, word: string): number {
  let score = 0;
  const entry = state.dict.byWord.get(word);
  // Heavy preference for "good" fill. The dictionary's obscure flag is noisy,
  // so we lean primarily on is_common_english.
  if (entry?.is_common_english) score += 60;
  if (entry?.obscure) score -= 20;

  // Letter-frequency bonus: prefer words rich in common letters; they tend to
  // make crossing slots easier to fill. Cheap heuristic — count vowels.
  let vowels = 0;
  for (let i = 0; i < word.length; i++) {
    if ("AEIOU".indexOf(word[i]) >= 0) vowels++;
  }
  score += Math.min(vowels, 4) * 2;

  for (let i = 0; i < slot.length; i++) {
    const cross = slot.crosses[i];
    if (!cross) continue;
    if (state.assignedSet.has(cross.slotId)) continue;
    const crossSlot = state.slots[cross.slotId];

    const pattern: string[] = [];
    for (let j = 0; j < crossSlot.length; j++) {
      const r = crossSlot.direction === "across" ? crossSlot.row : crossSlot.row + j;
      const c = crossSlot.direction === "across" ? crossSlot.col + j : crossSlot.col;
      if (j === cross.offset) {
        pattern.push(word[i]);
      } else {
        pattern.push(state.letterGrid[r][c] || "");
      }
    }
    const n = state.dict.countMatches(crossSlot.length, pattern);
    if (n === 0) return -Infinity;
    score += Math.log(n + 1) * 3;
  }
  return score;
}

function fillRecursive(state: FillState, onProgress?: (n: number) => void): boolean {
  if (state.deadlineMs && Date.now() > state.deadlineMs) return false;
  if (state.assignedSet.size === state.slots.length) return true;

  const pick = pickNextSlot(state);
  if (!pick) return true;
  const { slot, candidates } = pick;
  if (candidates.length === 0) return false;

  const isSeed = state.assignedSet.size === 0;
  // Score every candidate — limiting the head caused the search to give up
  // before exhausting viable branches. Scoring is cheap vs. recursion.
  const scored = candidates
    .map((e) => ({ entry: e, score: scoreCandidate(state, slot, e.word) }))
    .filter((x) => x.score > -Infinity);

  if (scored.length === 0) return false;
  const usable = scored;

  // Light jitter to vary results across daily seeds without overriding the strong
  // preferences for common words. The seed slot gets a touch more jitter so we
  // explore varied starting words across days.
  const jitterMag = isSeed ? 8 : 1.5;
  const jittered = usable
    .map((x) => ({ ...x, score: x.score + state.rng() * jitterMag }))
    .sort((a, b) => b.score - a.score);

  for (const { entry } of jittered) {
    const prior = slotPattern(state, slot);
    placeWord(state, slot, entry.word);

    if (onProgress && state.assignedSet.size % 5 === 0) onProgress(state.assignedSet.size);

    if (fillRecursive(state, onProgress)) return true;

    removeWord(state, slot, prior);
    state.backtracks++;
    if (state.backtracks > state.maxBacktracks) return false;
  }

  return false;
}

export function fillTemplate(
  template: Template,
  dict: Dictionary,
  seed: string,
  maxBacktracks: number = MAX_FILL_BACKTRACKS,
  onProgress?: (placed: number) => void,
  debug: boolean = false,
  deadlineMs?: number,
): { letterGrid: string[][]; slots: Slot[]; assignments: string[] } | null {
  const slots = extractSlots(template);
  const letterGrid = makeLetterGridFromTemplate(template);
  const state: FillState = {
    slots,
    assignments: new Array(slots.length).fill(null),
    letterGrid,
    usedWords: new Set(),
    dict,
    size: template.length,
    rng: makeRng("fill:" + seed),
    backtracks: 0,
    maxBacktracks,
    assignedSet: new Set(),
    deadlineMs,
  };
  void debug;

  const ok = fillRecursive(state, onProgress);
  if (!ok) return null;
  return {
    letterGrid: state.letterGrid,
    slots,
    assignments: state.assignments as string[],
  };
}

// ---------------------------------------------------------------------------
// Public puzzle assembly
// ---------------------------------------------------------------------------

function buildPuzzleFromFill(
  template: Template,
  letterGrid: string[][],
  slots: Slot[],
  assignments: string[],
  dict: Dictionary,
): GeneratedPuzzle {
  const size = template.length;
  const grid: PuzzleCell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: PuzzleCell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        letter: template[r][c] ? "" : letterGrid[r][c],
        number: null,
        isBlocked: template[r][c],
      });
    }
    grid.push(row);
  }

  // Assign clue numbers in row-major order at any cell that starts an across or down word.
  let number = 1;
  const startNumber = new Map<string, number>(); // "r,c,direction" -> number
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c]) continue;
      const startsAcross =
        (c === 0 || template[r][c - 1]) && c + 1 < size && !template[r][c + 1];
      const startsDown =
        (r === 0 || template[r - 1][c]) && r + 1 < size && !template[r + 1][c];
      if (startsAcross || startsDown) {
        grid[r][c].number = number;
        if (startsAcross) startNumber.set(`${r},${c},across`, number);
        if (startsDown) startNumber.set(`${r},${c},down`, number);
        number++;
      }
    }
  }

  const clues: CrosswordClue[] = [];
  for (const slot of slots) {
    const answer = assignments[slot.id];
    const entry = dict.byWord.get(answer);
    const clueText = entry?.clue || answer;
    const num = startNumber.get(`${slot.row},${slot.col},${slot.direction}`) || 0;
    clues.push({
      number: num,
      clue: clueText,
      answer,
      direction: slot.direction,
      startRow: slot.row,
      startCol: slot.col,
      length: slot.length,
    });
  }

  clues.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    return a.direction === "across" ? -1 : 1;
  });

  return {
    grid,
    clues,
    size: { rows: size, cols: size },
  };
}

export interface GenerateOptions {
  seed: string;
  categoryFilters?: string[];
  dictionaryCsvPath?: string;
  maxTemplateAttempts?: number;
  maxFillBacktracksPerTemplate?: number;
  // Wall-clock budget per template fill (ms). When exceeded, abandon that
  // template and try the next. Default is 12 seconds.
  fillTimeoutMsPerTemplate?: number;
  progress?: ProgressCallback;
  async?: boolean;
}

const DEFAULT_CSV_PATH = path.join(
  __dirname,
  "../../../src/data/crossword_dictionary_with_clues.csv",
);

export function generateNytStyle(opts: GenerateOptions): GeneratedPuzzle {
  const csvPath = opts.dictionaryCsvPath || DEFAULT_CSV_PATH;
  const dict = loadDictionaryFromCsv(csvPath, opts.categoryFilters || [], GRID_SIZE);
  console.log(
    `📚 Loaded ${dict.entries.length} words${
      opts.categoryFilters?.length ? ` for categories: ${opts.categoryFilters.join(", ")}` : ""
    }`,
  );

  const maxTemplateAttempts = opts.maxTemplateAttempts ?? 80;
  const maxBack = opts.maxFillBacktracksPerTemplate ?? MAX_FILL_BACKTRACKS;
  const fillTimeoutMs = opts.fillTimeoutMsPerTemplate ?? 5000;

  for (let attempt = 0; attempt < maxTemplateAttempts; attempt++) {
    const tplSeed = `${opts.seed}|tpl|${attempt}`;
    const template = generateTemplate(tplSeed);
    const fillSeed = `${opts.seed}|fill|${attempt}`;

    if (opts.progress) {
      const cb = opts.progress("generation", attempt + 1, extractSlots(template).length, "normal");
      void cb;
    }

    const deadline = Date.now() + fillTimeoutMs;
    const result = fillTemplate(template, dict, fillSeed, maxBack, undefined, false, deadline);
    if (result) {
      console.log(
        `✅ Generated 15x15 puzzle on template attempt ${attempt + 1} (${result.slots.length} words)`,
      );
      return buildPuzzleFromFill(template, result.letterGrid, result.slots, result.assignments, dict);
    }
  }

  throw new Error(
    `Failed to generate NYT-style puzzle after ${maxTemplateAttempts} template attempts`,
  );
}

export async function generateNytStyleAsync(opts: GenerateOptions): Promise<GeneratedPuzzle> {
  const csvPath = opts.dictionaryCsvPath || DEFAULT_CSV_PATH;
  const dict = loadDictionaryFromCsv(csvPath, opts.categoryFilters || [], GRID_SIZE);
  console.log(
    `📚 Loaded ${dict.entries.length} words${
      opts.categoryFilters?.length ? ` for categories: ${opts.categoryFilters.join(", ")}` : ""
    }`,
  );

  const maxTemplateAttempts = opts.maxTemplateAttempts ?? 80;
  const maxBack = opts.maxFillBacktracksPerTemplate ?? MAX_FILL_BACKTRACKS;
  const fillTimeoutMs = opts.fillTimeoutMsPerTemplate ?? 5000;

  for (let attempt = 0; attempt < maxTemplateAttempts; attempt++) {
    if (attempt % 2 === 0) await new Promise((res) => setImmediate(res));

    const tplSeed = `${opts.seed}|tpl|${attempt}`;
    const template = generateTemplate(tplSeed);
    const slotsPreview = extractSlots(template);

    if (opts.progress) {
      const res = opts.progress("generation", attempt + 1, slotsPreview.length, "normal");
      if (res && typeof (res as Promise<void>).then === "function") await res;
    }

    const fillSeed = `${opts.seed}|fill|${attempt}`;
    const deadline = Date.now() + fillTimeoutMs;
    const result = fillTemplate(template, dict, fillSeed, maxBack, undefined, false, deadline);
    if (result) {
      console.log(
        `✅ Generated 15x15 puzzle on template attempt ${attempt + 1} (${result.slots.length} words)`,
      );
      return buildPuzzleFromFill(template, result.letterGrid, result.slots, result.assignments, dict);
    }
  }

  throw new Error(
    `Failed to generate NYT-style puzzle after ${maxTemplateAttempts} template attempts`,
  );
}
