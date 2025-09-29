#!/usr/bin/env python3
"""
Batch-answer MCQs with a local Ollama model.

Features:
- Skips rows that already have a correct_index in [0..3]
- Periodic checkpoints to *.answered.csv (rich file with LLM columns)
- Optional clean export (schema-compatible) via --emit-import-csv
- Simple self-consistency (majority vote across N samples)

Requirements:
  pip install pandas tqdm ollama

Environment:
  export OLLAMA_HOST=http://127.0.0.1:11434
"""

import argparse
import os
import re
from collections import Counter
from typing import Tuple

import pandas as pd
from tqdm import tqdm
import ollama

LETTER_TO_IDX = {"A": 0, "B": 1, "C": 2, "D": 3}
IDX_TO_LETTER = {v: k for k, v in LETTER_TO_IDX.items()}

LETTER_RE = re.compile(r"\b([ABCD])\b", re.IGNORECASE)

def normalize_letter(s: str | None) -> str | None:
    if not s:
        return None
    m = LETTER_RE.search(s.strip())
    if not m:
        return None
    return m.group(1).upper()

def build_prompt(stem: str, a: str, b: str, c: str, d: str) -> str:
    return (
        "You are a careful multiple choice solver. Choose the single best option.\n"
        "Return ONLY the letter A, B, C, or D (optionally followed by a short one-line reason).\n\n"
        f"Question:\n{stem.strip()}\n\n"
        f"A) {a.strip()}\n"
        f"B) {b.strip()}\n"
        f"C) {c.strip()}\n"
        f"D) {d.strip()}\n\n"
        "Answer:"
    )

def ask_once(model: str, prompt: str, temperature: float = 0.1) -> str:
    resp = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": float(temperature)},
    )
    return resp.message.content.strip()

def ask_majority(model: str, prompt: str, temperature: float, k: int) -> Tuple[str | None, str]:
    """
    Returns (letter, raw_joined_text).
    letter can be None if we fail to parse a clear A/B/C/D.
    raw_joined_text is all k replies joined with delimiters.
    """
    votes = []
    raw_parts = []
    for _ in range(max(1, k)):
        out = ask_once(model, prompt, temperature)
        raw_parts.append(out)
        letter = normalize_letter(out)
        if letter:
            votes.append(letter)
    raw_joined = "\n-----\n".join(raw_parts)
    if not votes:
        return None, raw_joined
    counts = Counter(votes)
    letter, _ = counts.most_common(1)[0]
    return letter, raw_joined

def short_explanation_from_raw(raw: str) -> str:
    """
    Try to extract a short explanation line after the letter.
    If none, return the first ~200 chars as a fallback.
    """
    # Look for lines like "C because ..." or "Answer: B - ..."
    for line in raw.splitlines():
        line_s = line.strip()
        m = LETTER_RE.search(line_s)
        if m:
            tail = line_s[m.end():].strip(" .:-")
            if tail:
                return tail[:200]
    return raw.strip()[:200]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="source CSV (must contain stem, option_a..d)")
    ap.add_argument("--out", help="output answered CSV (rich). Default: <src>.answered.csv")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=None)
    ap.add_argument("--model", default="mistral")
    ap.add_argument("--temperature", type=float, default=0.1)
    ap.add_argument("--self-consistency", type=int, default=1, help="samples per question")
    ap.add_argument("--checkpoint-every", type=int, default=50, help="write checkpoint every N rows")
    ap.add_argument("--emit-import-csv", action="store_true",
                    help="also write a clean CSV with only import columns (schema-compatible)")
    ap.add_argument("--import-cols", nargs="*", default=None,
                    help="columns to keep in the import CSV (default: auto-detect common schema)")
    args = ap.parse_args()

    # Load
    df = pd.read_csv(args.src)
    n = len(df)

    # Default out paths
    out_rich = args.out or f"{os.path.splitext(args.src)[0]}.answered.csv"
    out_clean = f"{os.path.splitext(args.src)[0]}.import.csv" if args.emit_import_csv else None

    # Determine slice
    start = max(0, args.start)
    end = n if args.end is None else min(args.end, n)

    # Ensure required columns
    required = ["stem", "option_a", "option_b", "option_c", "option_d"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise SystemExit(f"Missing required columns: {missing}")

    # Ensure output columns exist
    for col in ["llm_answer_letter", "llm_raw", "llm_explanation"]:
        if col not in df.columns:
            df[col] = ""

    if "correct_index" not in df.columns:
        df["correct_index"] = -1  # sentinel for unanswered

    print(f"Model: {args.model}")
    print(f"Rows: {start}..{end} of {n}")
    print(f"Self-consistency: {args.self_consistency}  |  Temperature: {args.temperature}")
    print(f"Checkpoint every: {args.checkpoint_every}")
    print(f"Rich output: {out_rich}")
    if out_clean:
        print(f"Import output: {out_clean}")

    # Prepare import columns (if requested)
    default_import_cols = [
        # adjust to YOUR table schema
        "id", "subject", "chapter", "topic", "stem",
        "options", "correct_index", "explanation",
        "difficulty", "language", "source", "status",
        "created_by", "created_at", "difficulty_ai", "bloom_level",
        "ai_flags", "reviewed_by", "reviewed_at", "updated_at", "tags"
    ]
    import_cols = args.import_cols or [c for c in default_import_cols if c in df.columns]

    processed = 0
    answered_now = 0
    skipped = 0
    failed = 0

    for i in tqdm(range(start, end), desc="Answering"):
        row = df.iloc[i]

        # Skip already answered
        if str(row.get("correct_index", -1)).isdigit():
            ci = int(row.get("correct_index", -1))
            if 0 <= ci <= 3:
                skipped += 1
                continue

        stem = str(row["stem"])
        a = str(row["option_a"])
        b = str(row["option_b"])
        c = str(row["option_c"])
        d = str(row["option_d"])

        prompt = build_prompt(stem, a, b, c, d)
        try:
            letter, raw = ask_majority(args.model, prompt, args.temperature, args.self_consistency)
            if letter is None:
                failed += 1
                # keep raw for debugging
                df.at[i, "llm_raw"] = raw
                df.at[i, "llm_answer_letter"] = ""
                df.at[i, "llm_explanation"] = ""
                df.at[i, "correct_index"] = -1
            else:
                idx = LETTER_TO_IDX[letter]
                df.at[i, "correct_index"] = idx
                df.at[i, "llm_answer_letter"] = letter
                df.at[i, "llm_raw"] = raw
                df.at[i, "llm_explanation"] = short_explanation_from_raw(raw)
                answered_now += 1
        except KeyboardInterrupt:
            print("\nInterrupted. Writing checkpoint…")
            df.to_csv(out_rich, index=False)
            if out_clean:
                df[import_cols].to_csv(out_clean, index=False)
            raise
        except Exception as e:
            failed += 1
            df.at[i, "llm_raw"] = f"ERROR: {e}"
            df.at[i, "llm_answer_letter"] = ""
            df.at[i, "llm_explanation"] = ""
            df.at[i, "correct_index"] = -1

        processed += 1

        # Periodic checkpoint
        if processed % max(1, args.checkpoint_every) == 0:
            df.to_csv(out_rich, index=False)
            if out_clean:
                df[import_cols].to_csv(out_clean, index=False)

    # Final write
    df.to_csv(out_rich, index=False)
    if out_clean:
        df[import_cols].to_csv(out_clean, index=False)

    print("\nDone.")
    print(f"Processed: {processed}")
    print(f"Answered this run: {answered_now}")
    print(f"Skipped (already answered): {skipped}")
    print(f"Failed to parse: {failed}")
    if out_clean:
        print(f"Import file written: {out_clean}")
    print(f"Rich file written:   {out_rich}")
    print("Tip: re-run later with --start at the next unprocessed row.")
    
if __name__ == "__main__":
    main()

