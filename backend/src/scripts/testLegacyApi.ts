// Verify that the legacy strictCrosswordGenerator API (used by cronService.ts
// and routes/puzzle.ts) still works through the new engine.
import {
  StrictCrosswordGenerator,
  generateStrictPuzzle,
} from "../services/puzzle/strictCrosswordGenerator";

async function main() {
  console.log("=== Test 1: generateStrictPuzzle(date) ===");
  const p1 = generateStrictPuzzle("2026-05-12");
  console.log(`  Got ${p1.clues.length} clues on ${p1.size.rows}x${p1.size.cols} grid`);

  console.log("\n=== Test 2: new StrictCrosswordGenerator(date).generate() ===");
  const gen = new StrictCrosswordGenerator("2026-05-12");
  const p2 = gen.generate();
  console.log(`  Got ${p2.clues.length} clues on ${p2.size.rows}x${p2.size.cols} grid`);

  console.log(
    "\n=== Test 3: new StrictCrosswordGenerator(date).generateWithCallbackAsync(cb) ===",
  );
  const gen3 = new StrictCrosswordGenerator("2026-05-12");
  let lastStage = "";
  const p3 = await gen3.generateWithCallbackAsync(async (stage, attempt, target, phase) => {
    if (stage !== lastStage) {
      console.log(`  [${phase}] ${stage} attempt=${attempt} target=${target}`);
      lastStage = stage;
    }
  });
  console.log(`  Got ${p3.clues.length} clues on ${p3.size.rows}x${p3.size.cols} grid`);

  console.log("\n=== Test 4: category filter ===");
  const p4 = generateStrictPuzzle("2026-05-12", "biology");
  console.log(`  Got ${p4.clues.length} clues (with biology category)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
