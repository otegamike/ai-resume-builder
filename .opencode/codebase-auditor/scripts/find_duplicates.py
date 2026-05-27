#!/usr/bin/env python3
"""
find_duplicates.py
Detects duplicate and near-duplicate code blocks across a codebase.

Usage:
    python3 scripts/find_duplicates.py [src_root] [--min-lines 5] [--threshold 0.85]

Output: grouped list of files sharing similar blocks.
"""

import os
import sys
import hashlib
import argparse
from pathlib import Path
from collections import defaultdict

EXCLUDE_DIRS = {
    "node_modules", "dist", "build", ".next", "coverage",
    ".git", "__pycache__", ".venv", "venv", "vendor"
}

EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"}


def iter_source_files(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune excluded directories in-place
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fname in filenames:
            if Path(fname).suffix in EXTENSIONS:
                yield os.path.join(dirpath, fname)


def normalize_line(line: str) -> str:
    """Strip whitespace and comments for comparison."""
    line = line.strip()
    # Remove single-line comments
    for comment_prefix in ("//", "#", "--"):
        if comment_prefix in line:
            line = line[: line.index(comment_prefix)].strip()
    return line


def extract_blocks(filepath: str, min_lines: int):
    """Yield (hash, block_text, start_line) for every sliding window."""
    try:
        with open(filepath, encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except OSError:
        return

    normalized = [normalize_line(l) for l in lines]

    for i in range(len(normalized) - min_lines + 1):
        block = normalized[i : i + min_lines]
        # Skip blocks that are mostly empty / comments
        non_empty = [l for l in block if len(l) > 3]
        if len(non_empty) < min_lines * 0.6:
            continue
        block_str = "\n".join(block)
        h = hashlib.md5(block_str.encode()).hexdigest()
        yield h, block_str, i + 1


def find_duplicates(root: str, min_lines: int):
    index: dict[str, list[tuple[str, int, str]]] = defaultdict(list)

    files = list(iter_source_files(root))
    print(f"🔍 Scanning {len(files)} files for duplicate blocks (min {min_lines} lines)...")

    for filepath in files:
        is_test = any(t in filepath for t in [".test.", ".spec.", "__tests__", "test_"])
        for h, block, lineno in extract_blocks(filepath, min_lines):
            index[h].append((filepath, lineno, block, is_test))

    duplicates = {h: locs for h, locs in index.items() if len(locs) >= 2}
    return duplicates


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".", help="Source root to scan")
    parser.add_argument("--min-lines", type=int, default=5, help="Minimum block size")
    args = parser.parse_args()

    duplicates = find_duplicates(args.root, args.min_lines)

    if not duplicates:
        print("✅ No duplicate blocks found.")
        return

    print(f"\n🔴 Found {len(duplicates)} duplicate block(s):\n")

    # Sort by number of occurrences descending
    sorted_dupes = sorted(duplicates.values(), key=len, reverse=True)

    for i, locs in enumerate(sorted_dupes[:30], 1):
        test_count = sum(1 for _, _, _, is_test in locs if is_test)
        prod_locs = [(f, l, b) for f, l, b, is_test in locs if not is_test]

        if len(prod_locs) < 2:
            continue  # Only appears in tests — skip

        print(f"── Duplicate #{i} ({len(prod_locs)} occurrences) ──")
        for filepath, lineno, block in prod_locs:
            rel = os.path.relpath(filepath, args.root)
            print(f"  📄 {rel}:{lineno}")
        # Show a preview of the block
        preview_lines = locs[0][2].split("\n")[:4]
        print("  Preview:")
        for pl in preview_lines:
            print(f"    {pl}")
        print()

    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    total_shown = min(30, len([v for v in sorted_dupes if sum(1 for _,_,_,t in v if not t)>=2]))
    print(f"Showing top {total_shown} duplicate groups. Extract these into shared utils/hooks.")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


if __name__ == "__main__":
    main()
