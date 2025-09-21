#!/usr/bin/env python3
"""
Fill multiple-choice answers using a LOCAL LLM via Ollama.

- Input CSV must have at least:
    stem            : question text
    options         : JSON array of 4 strings (choices)
  (Optionally already has: correct_index, explanation)

- Output CSV defaults to <input>.answered.csv. Existing correct_index values are left untouched unless --overwrite is used.

Examples:
  python fill_answers_with_ollama.py questions.csv
  python fill_answers_with_ollama.py questions.csv --model mistral --self-consistency 3 --write-explanations
  python fill_answers_with_ollama.py questions.csv --start 0 --end 2000 --checkpoint-every 200
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd
from tqdm import tqdm
import ollama

LETTER_TO_IDX = {"A": 0, "B": 1, "C": 2, "D": 3}
IDX_TO_LETTER = {v: k for k, v in LETTER_TO_IDX.items()}


PROMPT_TEMPLATE = """You are a careful exam solver. Choose the single best answer.

Question:
{stem}

Options:
A. {a}
B. {b}
C. {c}
D. {d}

Rules:
- Think briefly.
- Return ONLY one letter: A, B, C, or D.
"""

PROMPT_WITH_EXPLANATION = """You are a careful exam solver. Choose the single best answer and justify briefly.

Question:
{stem}

Options:
A. {a}
B. {b}
C. {c}
D. {d}

Return JSON exactly like:
{{"answer":"A","why":"one or two concise sentences"}}
"""

def ask_once(model: str, prompt: str, temperature: float) -> str:
    """Call Ollama once and return raw text."""
    resp = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": temperature},
    )
    return (resp.get("message", {}) or {}).get("content", "").strip()


def parse_letter(text: str) -> str:
    """
    Extract A/B/C/D robustly from model output.
    Accepts: 'A', 'Answer: B', 'I think (C)', 'Option D is correct', etc.
    """
    # JSON case from explanation mode
    try:
        j = json.loads(text)
        if isinstance(j, dict) and "answer" in j:
            cand = j["answer"].strip().upper()
            if cand in LETTER_TO_IDX:
                return cand
    except Exception:
        pass

    # General patterns
    m = re.search(r"\b([ABCD])\b", text.upper())
    if m:
        return m.group(1)

    # Sometimes models write "Option A" or similar
    m = re.search(r"\bOPTION\s*([ABCD])\b", text.upper())
    if m:
        return m.group(1)

    # Last resort: look for words like "(a)" or "choice c"
    m = re.search(r"\b(?:CHOICE|ANSWER)\s*([ABCD])\b", text.upper())
    if m:
        return m.group(1)

    return ""


def ask_majority(model: str, prompt: str, temperature: float, k: int) -> (str, str):
    """
    Query the model k times and take majority vote on letter.
    Returns (letter, raw_concat_text)
    """
    votes = []
    raws = []
    for _ in range(k):
        out = ask_once(model, prompt, temperature)
        raws.append(out)
        letter = parse_letter(out)
        if letter:
            votes.append(letter)
    if votes:
        letter = Counter(votes).most_common(1)[0][0]
    else:
        letter = ""
    return letter, "\n---\n".join(raws)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_csv", type=Path, help="Input CSV with columns: stem, options (JSON array of 4 strings)")
    ap.add_argument("--output", type=Path, help="Output CSV (default: <input>.answered.csv)")
    ap.add_argument("--model", default="mistral", help="Ollama model name (e.g., mistral, llama3:8b)")
    ap.add_argument("--temperature", type=float, default=0.1, help="Sampling temperature")
    ap.add_argument("--self-consistency", type=int, default=1, help="Ask k times and majority vote")
    ap.add_argument("--start", type=int, default=0, help="Start row (inclusive)")
    ap.add_argument("--end", type=int, default=None, help="End row (exclusive)")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing correct_index values")
    ap.add_argument("--write-explanations", action="store_true", help="Also write explanation JSON (key: text)")
    ap.add_argument("--checkpoint-every", type=int, default=500, help="Save interim CSV every N rows")
    args = ap.parse_args()

    src = args.input_csv
    out = args.output or src.with_suffix(".answered.csv")

    df = pd.read_csv(src)
    required_cols = {"stem", "options"}
    missing = required_cols - set(df.columns)
    if missing:
        raise SystemExit(f"Missing required columns: {missing}")

    # Prepare output columns
    if "correct_index" not in df.columns:
        df["correct_index"] = pd.NA
    if args.write_explanations and "explanation" not in df.columns:
        df["explanation"] = ""

    start = max(0, args.start)
    end = len(df) if args.end is None else min(args.end, len(df))

    print(f"Model: {args.model}")
    print(f"Rows: {start}..{end} of {len(df)}")
    print(f"Self-consistency: {args.self_consistency}  |  Temperature: {args.temperature}")
    print(f"Writing explanations: {args.write_explanations}")
    print(f"Output: {out}")

    processed = 0
    for i in tqdm(range(start, end), total=end - start, desc="Answering"):
        row = df.iloc[i]

        # Skip if already answered and not overwriting
        if not args.overwrite and pd.notna(row.get("correct_index")):
            continue

        # Load options JSON safely
        try:
            options = row["options"]
            if isinstance(options, str):
                options = json.loads(options)
            assert isinstance(options, (list, tuple)) and len(options) == 4
        except Exception:
            # Can't answer if options are malformed
            continue

        stem = str(row["stem"]).strip()
        a, b, c, d = [str(x).strip() for x in options]

        if args.write_explanations:
            prompt = PROMPT_WITH_EXPLANATION.format(stem=stem, a=a, b=b, c=c, d=d)
            letter, raw = ask_majority(args.model, prompt, args.temperature, args.self_consistency)
            # Try to pull "why" if JSON, else keep raw as explanation
            exp_text = ""
            try:
                j = json.loads(raw.split("\n---\n")[0])
                if isinstance(j, dict) and "why" in j:
                    exp_text = j["why"]
            except Exception:
                exp_text = raw
            df.at[i, "explanation"] = json.dumps({"text": str(exp_text)[:2000]})
        else:
            prompt = PROMPT_TEMPLATE.format(stem=stem, a=a, b=b, c=c, d=d)
            letter, _ = ask_majority(args.model, prompt, args.temperature, args.self_consistency)

        if letter in LETTER_TO_IDX:
            df.at[i, "correct_index"] = LETTER_TO_IDX[letter]
        else:
            # Leave as NaN if the model failed to decide
            pass

        processed += 1
        if processed and args.checkpoint_every and (processed % args.checkpoint_every == 0):
            df.to_csv(out, index=False)

    df.to_csv(out, index=False)
    print(f"Done. Wrote: {out}")
    answered = df["correct_index"].notna().sum()
    print(f"Answered rows: {answered} / {len(df)}")


if __name__ == "__main__":
    main()

