import { generateNytStyle } from '../services/puzzle/nytStyleGenerator';

function render(puzzle: any) {
  const rows: string[] = [];
  for (const row of puzzle.grid) {
    rows.push(row.map((c: any) => (c.isBlocked ? '█' : c.letter || '?')).join(' '));
  }
  return rows.join('\n');
}

function check(puzzle: any) {
  const size = puzzle.size.rows;
  const grid = puzzle.grid;

  if (size !== 15) throw new Error(`Expected 15x15, got ${size}x${puzzle.size.cols}`);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const a = grid[r][c].isBlocked;
      const b = grid[size - 1 - r][size - 1 - c].isBlocked;
      if (a !== b) throw new Error(`Symmetry violation at (${r},${c})`);
    }
  }
  for (let r = 0; r < size; r++) {
    let run = 0;
    for (let c = 0; c <= size; c++) {
      const blocked = c === size || grid[r][c].isBlocked;
      if (blocked) {
        if (run > 0 && run < 3) throw new Error(`Short across run row ${r} len ${run}`);
        run = 0;
      } else run++;
    }
  }
  for (let c = 0; c < size; c++) {
    let run = 0;
    for (let r = 0; r <= size; r++) {
      const blocked = r === size || grid[r][c].isBlocked;
      if (blocked) {
        if (run > 0 && run < 3) throw new Error(`Short down run col ${c} len ${run}`);
        run = 0;
      } else run++;
    }
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].isBlocked) continue;
      let cs = c, ce = c;
      while (cs > 0 && !grid[r][cs - 1].isBlocked) cs--;
      while (ce < size - 1 && !grid[r][ce + 1].isBlocked) ce++;
      if (ce - cs + 1 < 3) throw new Error(`Cell (${r},${c}) across <3`);
      let rs = r, re = r;
      while (rs > 0 && !grid[rs - 1][c].isBlocked) rs--;
      while (re < size - 1 && !grid[re + 1][c].isBlocked) re++;
      if (re - rs + 1 < 3) throw new Error(`Cell (${r},${c}) down <3`);
    }
  }
  let start: [number, number] | null = null;
  let total = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c].isBlocked) {
        total++;
        if (!start) start = [r, c];
      }
  const seen = Array.from({ length: size }, () => new Array(size).fill(false));
  const stack: Array<[number, number]> = [start!];
  seen[start![0]][start![1]] = true;
  let visited = 0;
  while (stack.length) {
    const [r, c] = stack.pop()!;
    visited++;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      const nr = r + dr,
        nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (grid[nr][nc].isBlocked || seen[nr][nc]) continue;
      seen[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }
  if (visited !== total) throw new Error(`Disconnected white cells ${visited}/${total}`);

  for (const clue of puzzle.clues) {
    if (!clue.answer || clue.answer.length < 3) throw new Error(`Bad clue ${JSON.stringify(clue)}`);
    if (!clue.clue) throw new Error(`Empty clue text for ${clue.answer}`);
    for (let i = 0; i < clue.length; i++) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      if (grid[r][c].letter !== clue.answer[i])
        throw new Error(`Letter mismatch clue ${clue.number}${clue.direction[0]} pos ${i}`);
    }
  }

  return {
    blackCount: grid.flat().filter((c: any) => c.isBlocked).length,
    wordCount: puzzle.clues.length,
    across: puzzle.clues.filter((c: any) => c.direction === 'across').length,
    down: puzzle.clues.filter((c: any) => c.direction === 'down').length,
  };
}

async function main() {
  const dates = process.argv.slice(2);
  const seeds = dates.length ? dates : ['2026-05-12', '2026-05-13', '2026-05-14'];
  for (const seed of seeds) {
    console.log(`\n=== ${seed} ===`);
    const t0 = Date.now();
    const p = generateNytStyle({ seed });
    const ms = Date.now() - t0;
    console.log(render(p));
    const stats = check(p);
    console.log(
      `OK in ${ms}ms. Black=${stats.blackCount} (${((stats.blackCount / 225) * 100).toFixed(
        1,
      )}%), Words=${stats.wordCount} (A=${stats.across}, D=${stats.down})`,
    );
    console.log('Sample clues:');
    for (const c of p.clues.slice(0, 6)) {
      console.log(`  ${c.number}${c.direction[0].toUpperCase()}: ${c.answer} — ${c.clue}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
