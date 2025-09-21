#!/usr/bin/env python3
"""
Parse Kaggle CSV with columns: eng, Subject
- Splits 'eng' into STEM + 4 options (A/B/C/D) using tolerant regex
- Emits questions_kaggle_parsed.csv ready for import into public.questions
"""

import csv, json, re, sys
from datetime import datetime
from pathlib import Path

IN_CSV  = sys.argv[1] if len(sys.argv) > 1 else "subjects-questions.csv"
OUT_CSV = sys.argv[2] if len(sys.argv) > 2 else "questions_kaggle_parsed.csv"

# Tolerant pattern:
#  - Captures everything up to A as the stem (group 1)
#  - Then A, B, C, D text (groups 2..5)
#  - Accepts formats like "A.", "A )", "A)", "A :" etc., case-insensitive
#  - Works across newlines
PATTERN = re.compile(
    r"""^\s*
        (?P<stem>.+?)
        \s*(?:\r?\n|\s)+
        A[\.\)\:\s]\s*(?P<a>.+?)
        \s*(?:\r?\n|\s)+
        B[\.\)\:\s]\s*(?P<b>.+?)
        \s*(?:\r?\n|\s)+
        C[\.\)\:\s]\s*(?P<c>.+?)
        \s*(?:\r?\n|\s)+
        D[\.\)\:\s]\s*(?P<d>.+?)\s*$
    """,
    flags=re.IGNORECASE | re.DOTALL | re.VERBOSE,
)

def normalize_spaces(s: str) -> str:
    # Collapse internal whitespace/newlines, keep punctuation spacing sane
    return re.sub(r"\s+", " ", s.strip())

def parse_eng(text: str):
    m = PATTERN.match(text or "")
    if not m:
        return None
    stem = normalize_spaces(m.group("stem"))
    a = normalize_spaces(m.group("a"))
    b = normalize_spaces(m.group("b"))
    c = normalize_spaces(m.group("c"))
    d = normalize_spaces(m.group("d"))
    return stem, [a, b, c, d]

def main():
    src = Path(IN_CSV)
    if not src.exists():
        print(f"Input not found: {src}")
        sys.exit(1)

    now_iso = datetime.now().isoformat(timespec="seconds")
    total = ok = bad = 0
    failures = []

    with open(IN_CSV, newline="", encoding="utf-8") as f_in, \
         open(OUT_CSV, "w", newline="", encoding="utf-8") as f_out:

        reader = csv.DictReader(f_in)
        # Expect at least 'eng' and 'Subject'
        if "eng" not in reader.fieldnames or "Subject" not in reader.fieldnames:
            print(f"CSV must contain headers: eng, Subject — found: {reader.fieldnames}")
            sys.exit(1)

        writer = csv.DictWriter(f_out, fieldnames=[
            "subject","chapter","topic","stem","options","correct_index","explanation",
            "difficulty","language","source","status","created_by","created_at",
            "difficulty_ai","bloom_level","ai_flags","reviewed_by","reviewed_at",
            "updated_at","tags"
        ])
        writer.writeheader()

        for i, row in enumerate(reader, start=2):  # 2 = first data row
            total += 1
            subject = (row.get("Subject") or "General").strip() or "General"
            eng = row.get("eng") or ""

            parsed = parse_eng(eng)
            if not parsed:
                bad += 1
                preview = normalize_spaces(eng)[:180]
                failures.append((i, subject, preview))
                continue

            stem, options_list = parsed
            writer.writerow({
                "subject": subject,
                "chapter": "General Topics",
                "topic": "Mixed Topics",
                "stem": stem,
                "options": json.dumps(options_list, ensure_ascii=False),
                "correct_index": "",  # unknown in Kaggle file; leave blank or 0 if your schema requires
                "explanation": json.dumps({"text": ""}, ensure_ascii=False),
                "difficulty": 3,
                "language": "English",
                "source": "Kaggle import",
                "status": "active",
                "created_by": "",
                "created_at": now_iso,
                "difficulty_ai": "",
                "bloom_level": "Apply",
                "ai_flags": "",
                "reviewed_by": "",
                "reviewed_at": "",
                "updated_at": now_iso,
                "tags": json.dumps(["kaggle", subject.lower()], ensure_ascii=False),
            })
            ok += 1

    # Report
    print(f"Parsed {ok}/{total} rows → {OUT_CSV}")
    if bad:
        print(f"\nFailed to parse {bad} rows (showing up to 15):")
        for (ln, subj, prev) in failures[:15]:
            print(f"  line {ln} [{subj}]: {prev}")

if __name__ == "__main__":
    main()

