#!/usr/bin/env python3
"""
Crossword dictionary improvement script.

Uses Claude Code (via subagents) to systematically improve the dictionary by:
1. Fixing bad/confusing clues with clear, direct crossword-style clues
2. Fixing contradictory entries (common_english=True AND obscure=True)
3. Fixing missing obscure field values

Run from project root:
    python3 scripts/improve_dictionary.py [--batch-size N] [--max-batches N] [--dry-run]
"""

import csv
import sys
import os
import json
import argparse
import shutil
import subprocess
import time
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional

CSV_PATH = Path(__file__).parent.parent / "backend/src/data/crossword_dictionary_with_clues.csv"
BACKUP_PATH = CSV_PATH.with_suffix(".csv.backup")
PROGRESS_PATH = Path(__file__).parent / "improve_dictionary_progress.json"

BAD_PATTERNS = [
    "but not", "not a ", "not quite", "rearrange", "what am i",
    "what is ", "anagram", "cryptic clue", "not in a ", "not found",
    "not of ", "isn't a", "it's not", "doesn't", "wouldn't",
    "rearranging", "arranged", "unscramble",
]

class DictEntry(NamedTuple):
    row_index: int
    word: str
    clue: str
    is_technical_word: str
    is_common_english: str
    is_plural: str
    categories: str
    obscure: str

def load_csv() -> List[DictEntry]:
    entries = []
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            word = (row.get('word') or '').strip()
            if not word or not word.isalpha() or len(word) < 3 or len(word) > 15:
                continue
            entries.append(DictEntry(
                row_index=i,
                word=word,
                clue=(row.get('clue') or '').strip(),
                is_technical_word=(row.get('is_technical_word') or '').strip(),
                is_common_english=(row.get('is_common_english') or '').strip(),
                is_plural=(row.get('is_plural') or '').strip(),
                categories=(row.get('categories') or '').strip(),
                obscure=(row.get('obscure') or '').strip(),
            ))
    return entries

def is_bad_clue(clue: str) -> bool:
    clue_lower = clue.lower()
    return any(p in clue_lower for p in BAD_PATTERNS)

def find_entries_needing_improvement(entries: List[DictEntry]) -> Dict:
    """Categorize entries that need improvement."""
    bad_clues = []
    contradictory = []
    missing_obscure = []

    for e in entries:
        is_common = e.is_common_english == 'True'
        is_obscure = e.obscure == 'True'
        no_obscure = e.obscure == ''

        if is_bad_clue(e.clue):
            bad_clues.append(e)

        if is_common and is_obscure:
            contradictory.append(e)

        if no_obscure and e.clue:
            missing_obscure.append(e)

    return {
        'bad_clues': bad_clues,
        'contradictory': contradictory,
        'missing_obscure': missing_obscure,
    }

def build_improvement_prompt(batch: List[DictEntry], task: str) -> str:
    """Build a Claude prompt for a batch of entries."""

    entries_json = []
    for e in batch:
        entries_json.append({
            "word": e.word,
            "current_clue": e.clue,
            "categories": e.categories,
            "is_plural": e.is_plural,
            "is_technical": e.is_technical_word,
            "is_common_english": e.is_common_english,
            "current_obscure": e.obscure,
        })

    entries_str = json.dumps(entries_json, indent=2)

    if task == 'bad_clues':
        return f"""You are improving crossword puzzle clues. For each entry below, rewrite the clue to be a high-quality crossword clue.

CROSSWORD CLUE RULES:
- Be concise and direct (ideally under 80 characters)
- No negations ("not a", "but not", "not quite", "doesn't")
- No anagram/wordplay instructions ("rearrange", "unscramble")
- No rhetorical questions ("What am I?", "What is...")
- Give a real definition, synonym, or clever but fair hint
- For a plural word, the clue can use a plural context
- For technical words, keep the clue accessible to general audience
- Standard crossword style: "One who [verbs]", "Type of [noun]", "[Adjective] [noun]", etc.

ENTRIES TO IMPROVE:
{entries_str}

Respond with ONLY a JSON array in this exact format (no markdown, no explanation):
[
  {{"word": "WORD1", "new_clue": "The improved clue here"}},
  {{"word": "WORD2", "new_clue": "The improved clue here"}}
]

Include ALL entries. If a clue is already good, you may return it unchanged."""

    elif task == 'contradictory':
        return f"""You are auditing a crossword puzzle word list. Each entry is marked as BOTH "common English" AND "obscure" which is contradictory.

For each word, determine:
1. Is this actually a common English word a typical adult would know? (new_obscure = "False")
2. Is it actually obscure/specialized/rare? (new_obscure = "True")
3. Also improve the clue if it's poor quality

CRITERIA for common (obscure=False):
- Words most educated adults would recognize
- Common nouns, verbs, adjectives in everyday use
- Proper nouns of widely-known places, people, events
- Technical terms that have entered common vocabulary (email, protein, etc.)

CRITERIA for obscure (obscure=True):
- Highly specialized terminology
- Archaic or rarely-used words
- Extremely obscure proper nouns
- Scientific/medical jargon most people wouldn't know

ENTRIES TO AUDIT:
{entries_str}

Respond with ONLY a JSON array (no markdown, no explanation):
[
  {{"word": "WORD1", "new_clue": "Improved clue or original if fine", "new_obscure": "False"}},
  {{"word": "WORD2", "new_clue": "Improved clue or original if fine", "new_obscure": "True"}}
]

Include ALL entries."""

    elif task == 'missing_obscure':
        return f"""You are auditing a crossword puzzle word list. Each entry is missing the "obscure" field.

For each word, determine:
1. Is this a common English word (new_obscure = "False") or obscure (new_obscure = "True")?
2. Also improve the clue if it seems poor quality

ENTRIES TO AUDIT:
{entries_str}

Respond with ONLY a JSON array (no markdown, no explanation):
[
  {{"word": "WORD1", "new_clue": "Clue (improved or original)", "new_obscure": "False"}},
  {{"word": "WORD2", "new_clue": "Clue (improved or original)", "new_obscure": "True"}}
]

Include ALL entries."""

def call_claude_for_improvements(prompt: str) -> List[Dict]:
    """Use Claude Code subprocess to get improvements."""
    # Write prompt to temp file
    tmp_prompt = Path("/tmp/dict_improve_prompt.txt")
    tmp_prompt.write_text(prompt)

    # Call claude with a structured output request
    result = subprocess.run(
        ["claude", "--print", "--output-format", "text", "-p", prompt],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=str(CSV_PATH.parent.parent.parent),
    )

    if result.returncode != 0:
        print(f"  WARNING: Claude call failed: {result.stderr[:200]}", file=sys.stderr)
        return []

    output = result.stdout.strip()

    # Extract JSON from output
    # Find the first [ and last ]
    start = output.find('[')
    end = output.rfind(']')

    if start == -1 or end == -1:
        print(f"  WARNING: No JSON array found in output", file=sys.stderr)
        print(f"  Output preview: {output[:200]}", file=sys.stderr)
        return []

    json_str = output[start:end+1]

    try:
        improvements = json.loads(json_str)
        return improvements
    except json.JSONDecodeError as e:
        print(f"  WARNING: JSON parse error: {e}", file=sys.stderr)
        print(f"  JSON preview: {json_str[:300]}", file=sys.stderr)
        return []

def load_progress() -> dict:
    if PROGRESS_PATH.exists():
        with open(PROGRESS_PATH) as f:
            return json.load(f)
    return {"processed_words": [], "improvements": {}}

def save_progress(progress: dict):
    with open(PROGRESS_PATH, 'w') as f:
        json.dump(progress, f, indent=2)

def apply_improvements_to_csv(improvements: Dict):
    """
    improvements: dict mapping word -> {new_clue, new_obscure (optional)}
    """
    # Read all rows
    rows = []
    fieldnames = None

    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(dict(row))

    # Apply improvements
    updated = 0
    for row in rows:
        word = (row.get('word') or '').strip()
        if word in improvements:
            imp = improvements[word]
            if 'new_clue' in imp and imp['new_clue']:
                row['clue'] = imp['new_clue']
            if 'new_obscure' in imp and imp['new_obscure'] in ('True', 'False'):
                row['obscure'] = imp['new_obscure']
            updated += 1

    # Write back
    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return updated

def main():
    parser = argparse.ArgumentParser(description='Improve crossword dictionary using Claude')
    parser.add_argument('--batch-size', type=int, default=25,
                        help='Number of entries per Claude call (default: 25)')
    parser.add_argument('--max-batches', type=int, default=0,
                        help='Maximum batches to process (0 = unlimited)')
    parser.add_argument('--task', choices=['bad_clues', 'contradictory', 'missing_obscure', 'all'],
                        default='all', help='Which type of improvement to make')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without modifying the CSV')
    parser.add_argument('--resume', action='store_true',
                        help='Resume from previous progress')
    parser.add_argument('--stats', action='store_true',
                        help='Show statistics only, no processing')
    args = parser.parse_args()

    print(f"Loading dictionary from {CSV_PATH}...")
    entries = load_csv()
    print(f"Loaded {len(entries)} valid entries")

    needs = find_entries_needing_improvement(entries)

    print(f"\n=== IMPROVEMENT OPPORTUNITIES ===")
    print(f"Bad/confusing clues:        {len(needs['bad_clues']):,}")
    print(f"Contradictory (comm+obsc):  {len(needs['contradictory']):,}")
    print(f"Missing obscure field:      {len(needs['missing_obscure']):,}")

    # Show which entries are used by puzzle generator
    active = [e for e in entries if e.is_common_english == 'True' and e.obscure == 'False']
    print(f"\nCurrently active in puzzle:  {len(active):,}")
    active_bad = [e for e in active if is_bad_clue(e.clue)]
    print(f"  Active with bad clues:     {len(active_bad):,}")
    print(f"\nPotential active after fix:  ~{len(needs['contradictory']) + len(active):,}")

    if args.stats:
        return

    if args.dry_run:
        print(f"\n=== DRY RUN MODE (no changes will be made) ===")
        print(f"\nSample bad clues to fix:")
        for e in needs['bad_clues'][:5]:
            print(f"  {e.word}: {e.clue[:80]}")
        print(f"\nSample contradictory entries to audit:")
        for e in needs['contradictory'][:5]:
            print(f"  {e.word}: {e.clue[:70]}")
        return

    # Backup the CSV first
    if not BACKUP_PATH.exists():
        print(f"\nCreating backup at {BACKUP_PATH}...")
        shutil.copy2(CSV_PATH, BACKUP_PATH)
        print("Backup created.")
    else:
        print(f"\nBackup already exists at {BACKUP_PATH}")

    # Load progress
    progress = load_progress() if args.resume else {"processed_words": [], "improvements": {}}
    processed_set = set(progress["processed_words"])
    all_improvements = progress["improvements"]

    # Determine task order
    if args.task == 'all':
        task_order = ['bad_clues', 'contradictory', 'missing_obscure']
    else:
        task_order = [args.task]

    total_batches = 0
    total_improved = 0

    for task in task_order:
        task_entries = needs[task]
        # Skip already processed
        unprocessed = [e for e in task_entries if e.word not in processed_set]

        if not unprocessed:
            print(f"\n[{task}] All entries already processed, skipping.")
            continue

        print(f"\n=== TASK: {task.upper().replace('_', ' ')} ===")
        print(f"Entries to process: {len(unprocessed):,}")

        # Process in batches
        batch_count = 0
        for i in range(0, len(unprocessed), args.batch_size):
            if args.max_batches > 0 and total_batches >= args.max_batches:
                print(f"\nReached max-batches limit ({args.max_batches}), stopping.")
                break

            batch = unprocessed[i:i + args.batch_size]
            batch_num = i // args.batch_size + 1
            total_batches_for_task = (len(unprocessed) + args.batch_size - 1) // args.batch_size

            print(f"\n  Batch {batch_num}/{total_batches_for_task}: {len(batch)} entries "
                  f"(words: {batch[0].word}...{batch[-1].word})")

            prompt = build_improvement_prompt(batch, task)

            print(f"  Calling Claude Code...")
            improvements_list = call_claude_for_improvements(prompt)

            if not improvements_list:
                print(f"  WARNING: No improvements returned for this batch, skipping.")
                # Mark as processed anyway to avoid infinite loops
                for e in batch:
                    processed_set.add(e.word)
                    progress["processed_words"].append(e.word)
                save_progress(progress)
                continue

            # Collect improvements
            batch_improved = 0
            for imp in improvements_list:
                word = imp.get('word', '').strip()
                if not word:
                    continue

                improvement = {}
                if 'new_clue' in imp and imp['new_clue']:
                    improvement['new_clue'] = imp['new_clue']
                if 'new_obscure' in imp and imp['new_obscure'] in ('True', 'False'):
                    improvement['new_obscure'] = imp['new_obscure']

                if improvement:
                    all_improvements[word] = improvement
                    batch_improved += 1

            print(f"  Improvements received: {batch_improved}/{len(batch)}")
            total_improved += batch_improved

            # Mark batch as processed
            for e in batch:
                processed_set.add(e.word)
                progress["processed_words"].append(e.word)

            progress["improvements"] = all_improvements
            save_progress(progress)

            # Apply improvements incrementally to CSV
            if all_improvements:
                updated = apply_improvements_to_csv(all_improvements)
                print(f"  Applied {updated} total improvements to CSV so far")

            batch_count += 1
            total_batches += 1

            # Small delay between batches to be respectful
            if i + args.batch_size < len(unprocessed):
                time.sleep(0.5)

        print(f"\n[{task}] Complete. Processed {batch_count} batches.")

    print(f"\n=== SUMMARY ===")
    print(f"Total batches processed: {total_batches}")
    print(f"Total entries improved:  {total_improved}")
    print(f"Progress saved to:       {PROGRESS_PATH}")

    # Final stats
    print("\nReloading to show final stats...")
    final_entries = load_csv()
    final_active = [e for e in final_entries if e.is_common_english == 'True' and e.obscure == 'False']
    print(f"Active puzzle words now: {len(final_active):,}")

    print("\nDone! The dictionary has been improved.")
    print(f"Original backup preserved at: {BACKUP_PATH}")


if __name__ == '__main__':
    main()
