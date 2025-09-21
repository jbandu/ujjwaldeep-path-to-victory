#!/usr/bin/env python3
"""
NEET 2022 PDF Question Extractor (full)

Features
- Splits two-column PDFs page-by-page (left→right or right→left)
- Robust block detection by question number
- Parses stem, 4 options, answer index, explanation
- Debug logs and per-question report
- Outputs a CSV ready to import

Deps:
  pip install pdfplumber pandas python-dateutil

Usage:
  python3 extract_neet_questions.py \
    --cols 2 --colpad 12 --colorder lr --debug

Notes:
- Place the Biology/Chemistry/Physics PDFs in the same folder
  (ideally with those words in the filenames so they’re auto-detected).
"""

from __future__ import annotations
import os
import re
import json
import argparse
from datetime import datetime
from typing import List, Tuple, Optional

import pdfplumber
import pandas as pd


# ---------------------- extractor ---------------------- #

class NEETQuestionExtractor:
    def __init__(self, debug: bool = False, failed_path: Optional[str] = None):
        self.debug = debug
        self.failed_path = failed_path
        self.questions: List[dict] = []
        self.report: List[dict] = []  # per-question success/failure
        self.next_id = 1000

        if self.failed_path:
            # truncate any previous run
            open(self.failed_path, "w").close()

    # ---------- logging ---------- #
    def log(self, *msg):
        if self.debug:
            print("[debug]", *msg)

    def dump_failed(self, header: str, text: str):
        if not self.failed_path:
            return
        with open(self.failed_path, "a") as fh:
            fh.write(f"\n=== {header} ===\n{text}\n")

    # ---------- main entry per PDF ---------- #
    def extract_from_pdf(self, pdf_path: str, subject: str, cols: int = 1,
                         colpad: float = 10.0, colorder: str = "lr") -> None:
        """Read & parse one PDF; appends questions+report."""
        print(f"\nProcessing {subject}: {os.path.basename(pdf_path)}")

        full_text = []
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages, start=1):
                    page_text = self.extract_page_text_with_columns(
                        page, cols=cols, colpad=colpad, colorder=colorder
                    )
                    if page_text:
                        full_text.append(page_text)
        except Exception as e:
            print(f"❌ Error opening {pdf_path}: {e}")
            return

        clean = self.clean_text("\n".join(full_text))
        blocks = self.detect_blocks(subject, clean)
        print(f"  • Detected {len(blocks)} candidate blocks")

        parsed = 0
        for (qnum, block_text) in blocks:
            ok = self.parse_block(subject, qnum, block_text)
            parsed += 1 if ok else 0

        print(f"  ✓ Parsed {parsed} questions")

    # ---------- page extraction with column split ---------- #
    def extract_page_text_with_columns(self, page, cols: int = 1,
                                       colpad: float = 10.0,
                                       colorder: str = "lr") -> str:
        """
        Extract text from a page by splitting into vertical columns.
        cols=1 returns the page as-is; cols=2 splits at midline with padding.
        colorder: 'lr' (left->right) or 'rl' (right->left).
        """
        try:
            if cols <= 1:
                return page.extract_text() or ""

            w, h = float(page.width), float(page.height)
            mid = w / 2.0

            left_box = (0, 0, max(0.0, mid - colpad), h)
            right_box = (min(w, mid + colpad), 0, w, h)
            boxes = [left_box, right_box] if colorder == "lr" else [right_box, left_box]

            parts = []
            for bx in boxes:
                with page.crop(bx):
                    txt = page.extract_text() or ""
                    parts.append(txt.strip())

            joined = "\n".join(p for p in parts if p)
            return joined
        except Exception as e:
            self.log(f"[columns] page error: {e}")
            return page.extract_text() or ""

    # ---------- text cleanup ---------- #
    def clean_text(self, text: str) -> str:
        # normalize whitespace
        text = text.replace("\r", "\n")
        # ensure line breaks remain for our regex, but normalize spaces
        text = re.sub(r"[ \t]+", " ", text)
        # normalize fancy dashes/quotes
        text = text.replace("–", "-").replace("—", "-")
        return text

    # ---------- detect blocks by question number ---------- #
    def detect_blocks(self, subject: str, text: str) -> List[Tuple[int, str]]:
        """
        Slice text into blocks that begin with a question number. We keep the
        trailing text up to the next question number or end of document.
        """
        # Allow question numbers anywhere at line starts: e.g. "101." or "101)"
        qpat = re.compile(r"(?m)^\s*(\d{1,3})[.)]\s")

        blocks: List[Tuple[int, str]] = []
        starts = [(m.start(), int(m.group(1))) for m in qpat.finditer(text)]
        for i, (pos, qnum) in enumerate(starts):
            end = starts[i + 1][0] if i + 1 < len(starts) else len(text)
            chunk = text[pos:end].strip()
            blocks.append((qnum, chunk))
        return blocks

    # ---------- parse a single block ---------- #
    def parse_block(self, subject: str, qnum: int, block: str) -> bool:
        """
        Pull out: stem, 4 options, correct_index, explanation.
        Records success/failure in self.report and appends to self.questions on success.
        """
        original = block  # keep for debug dump
        # Remove the leading "101." etc
        block = re.sub(r"^\s*\d{1,3}[.)]\s*", "", block.strip(), flags=re.M)

        # Split out the solution/answer section if present
        sol_idx = self._find_first(block, ["\nSol.", "\nAnswer", "\nAns.", "\nExplanation"])
        body = block if sol_idx is None else block[:sol_idx].strip()
        tail = "" if sol_idx is None else block[sol_idx:].strip()

        # Extract options (handle (1)..(4) or 1. .. 4.)
        options = self._extract_options(body)

        # Stem is whatever is before the first option
        stem = self._extract_stem(body, options)

        correct_idx, explanation = self._extract_answer_and_expl(tail)

        # Validate
        errors = []
        if not stem or len(stem.split()) < 4:
            errors.append("bad/short stem")
        if len(options) != 4 or any(len(o.strip()) == 0 for o in options):
            errors.append(f"options!=4 ({len(options)})")
        if correct_idx not in (0, 1, 2, 3):
            # not fatal, but mark as unknown (0) and note
            self.log(f"[q{qnum}] no answer index detected")

        if errors:
            self.report.append({
                "subject": subject,
                "qnum": qnum,
                "status": "fail",
                "reason": ", ".join(errors),
            })
            self.dump_failed(f"{subject} Q{qnum}", original)
            return False

        # Heuristic chapter/topic classification
        chapter, topic = self.classify(stem, subject)

        self.next_id += 1
        now = datetime.now().isoformat()

        self.questions.append({
            "id": self.next_id,
            "subject": subject,
            "chapter": chapter,
            "topic": topic,
            "stem": stem,
            "options": json.dumps(options, ensure_ascii=False),
            "correct_index": 0 if correct_idx is None else int(correct_idx),
            "explanation": json.dumps({"text": explanation}, ensure_ascii=False),
            "difficulty": 3,
            "language": "English",
            "source": "NEET 2022",
            "status": "active",
            "created_by": None,
            "created_at": now,
            "difficulty_ai": None,
            "bloom_level": "Apply",
            "ai_flags": None,
            "reviewed_by": None,
            "reviewed_at": None,
            "updated_at": now,
            "tags": json.dumps(["neet-2022", subject.lower()])
        })

        self.report.append({
            "subject": subject,
            "qnum": qnum,
            "status": "ok",
            "stem_preview": (stem[:100] + "…") if len(stem) > 100 else stem
        })
        return True

    # ---------- helpers ---------- #
    def _find_first(self, text: str, needles: List[str]) -> Optional[int]:
        idxs = [text.find(n) for n in needles if text.find(n) >= 0]
        return min(idxs) if idxs else None

    def _extract_options(self, body: str) -> List[str]:
        """
        Find (1)…(4) options; fallback to 1.…4.
        We allow options to span multiple lines until the next option marker.
        """
        patterns = [
            r"\(\s*([1-4])\s*\)\s",   # (1)  (2) …
            r"(?m)^\s*([1-4])[.)]\s"  # 1. or 1)
        ]

        for pat in patterns:
            out = ["", "", "", ""]
            matches = list(re.finditer(pat, body))
            if len(matches) >= 2:  # at least 2 to slice segments
                for i, m in enumerate(matches):
                    start = m.end()
                    end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
                    which = int(m.group(1)) - 1
                    out[which] = body[start:end].strip()
                # If all four present, return; else try next pattern
                if all(out):
                    return out
        return []

    def _extract_stem(self, body: str, options: List[str]) -> str:
        """
        Stem is text up to the first option marker, if we can find it.
        Otherwise, heuristically remove options from body.
        """
        if options:
            # Locate the first option marker to split
            # Try (1) or '1.' or '1)'
            m = re.search(r"\(\s*1\s*\)\s|(?m)^\s*1[.)]\s", body)
            if m:
                return body[:m.start()].strip()

        # Fallback: if options are known, try removing them from tail
        stem = body.strip()
        for opt in options:
            stem = stem.replace(opt, "")
        # Remove repeated spaces
        stem = re.sub(r"\s{2,}", " ", stem)
        return stem.strip()

    def _extract_answer_and_expl(self, tail: str) -> Tuple[Optional[int], str]:
        """
        Parse answer index (0-based) and explanation text from the tail section.
        """
        if not tail:
            return None, ""

        # Answer (3) / Answer: (2)
        am = re.search(r"Answer\s*[:(]\s*(\d)\s*\)?", tail, re.I)
        correct = int(am.group(1)) - 1 if am else None

        # Explanation: …
        ex = ""
        em = re.search(r"Explanation\s*:\s*(.*)$", tail, re.I | re.S)
        if em:
            ex = em.group(1).strip()
        else:
            # If no explicit label, grab everything after "Sol." or "Answer"
            m2 = re.search(r"(Sol\.|Answer.*?)(.*)$", tail, re.I | re.S)
            if m2:
                ex = m2.group(2).strip()
        # Normalize whitespace a bit
        ex = re.sub(r"[ \t]+", " ", ex)
        return correct, ex

    def classify(self, stem: str, subject: str) -> Tuple[str, str]:
        """Very light heuristic classification by keywords + subject ranges."""
        s = stem.lower()

        # Physics clusters
        if subject == "Physics":
            if re.search(r"\b(lens|mirror|refraction|reflection|optics)\b", s):
                return "Optics", "Geometrical / Physical Optics"
            if re.search(r"\b(motion|velocity|acceleration|projectile|kinematics)\b", s):
                return "Mechanics", "Kinematics"
            if re.search(r"\b(current|field|magnetic|electric|capacitance|induction)\b", s):
                return "Electromagnetism", "Fields & Circuits"
            if re.search(r"\b(thermo|heat|temperature|entropy)\b", s):
                return "Thermodynamics", "Heat / Laws"
            return "General Physics", "Mixed"

        # Chemistry clusters
        if subject == "Chemistry":
            if re.search(r"\b(hybridization|bond|structure|VSEPR)\b", s):
                return "Chemical Bonding", "Molecular Structure"
            if re.search(r"\b(redox|electro|electrode|cell)\b", s):
                return "Electrochemistry", "Redox / Cells"
            if re.search(r"\b(alkane|alkene|aromatic|carbonyl|ester)\b", s):
                return "Organic", "Hydrocarbons & Derivatives"
            return "General Chemistry", "Mixed"

        # Biology clusters
        if subject == "Biology":
            if re.search(r"\b(dna|gene|rna|inheritance|genetic)\b", s):
                return "Genetics", "Molecular / Inheritance"
            if re.search(r"\b(photosynthesis|leaf|xylem|phloem|stomata)\b", s):
                return "Plant Physiology", "Photosynthesis / Transport"
            if re.search(r"\b(mitosis|meiosis|chromosome|cell)\b", s):
                return "Cell Biology", "Division / Cell Cycle"
            return "General Biology", "Mixed"

        return "General Topics", "Mixed Topics"

    # ---------- finalize ---------- #
    def save_csv(self, out_path: str) -> str:
        if not self.questions:
            print("No questions parsed; CSV not written.")
            return out_path
        df = pd.DataFrame(self.questions)
        df.to_csv(out_path, index=False)
        print(f"\nSaved {len(self.questions)} questions → {out_path}")
        return out_path

    def print_summary(self):
        # by subject
        by_subject = {}
        for q in self.questions:
            by_subject[q["subject"]] = by_subject.get(q["subject"], 0) + 1

        print("\nBreakdown by subject:")
        for k in sorted(by_subject):
            print(f"  {k}: {by_subject[k]}")

        # failures (if any)
        fails = [r for r in self.report if r["status"] == "fail"]
        if fails:
            print(f"\nFailures: {len(fails)} (see --dump-failed for raw blocks)")
            for r in fails[:15]:  # don’t spam; show first 15
                print(f"  - {r['subject']} Q{r['qnum']}: {r['reason']}")
            if len(fails) > 15:
                print(f"  … and {len(fails) - 15} more")


# ---------------------- main ---------------------- #

def find_pdfs(paths: List[str]) -> dict:
    """
    Return a mapping {Subject: filepath}. If `paths` provided, use them and
    infer subjects from filename. Otherwise scan cwd.
    """
    res = {}

    def subject_of(name: str) -> Optional[str]:
        low = name.lower()
        if "biology" in low or "bio" in low:
            return "Biology"
        if "chemistry" in low or "chem" in low:
            return "Chemistry"
        if "physics" in low or "phy" in low:
            return "Physics"
        return None

    if paths:
        for p in paths:
            s = subject_of(os.path.basename(p))
            if s:
                res[s] = p
    else:
        for f in os.listdir("."):
            if f.lower().endswith(".pdf"):
                s = subject_of(f)
                if s:
                    res[s] = f
    return res


def main():
    ap = argparse.ArgumentParser(description="NEET PDF → CSV extractor")
    ap.add_argument("pdfs", nargs="*", help="Optional explicit PDF paths")
    ap.add_argument("-o", "--out", default="neet_2022_questions_complete.csv", help="Output CSV")
    ap.add_argument("--cols", type=int, default=1, help="Columns per page (1 or 2)")
    ap.add_argument("--colpad", type=float, default=10.0, help="Padding (pts) around split")
    ap.add_argument("--colorder", choices=["lr", "rl"], default="lr", help="Left→Right or Right→Left")
    ap.add_argument("--debug", action="store_true", help="Verbose debug logs")
    ap.add_argument("--dump-failed", default=None, help="Write failed blocks to this file")
    args = ap.parse_args()

    pdf_map = find_pdfs(args.pdfs)
    if not pdf_map:
        print("No PDFs found. Put Biology/Chemistry/Physics PDFs here or pass paths explicitly.")
        return

    print("Scanning for NEET PDFs…")
    for s, p in pdf_map.items():
        print(f"  {s}: {p}")

    extractor = NEETQuestionExtractor(debug=args.debug, failed_path=args.dump_failed)

    for subject, path in pdf_map.items():
        extractor.extract_from_pdf(
            path, subject,
            cols=args.cols, colpad=args.colpad, colorder=args.colorder
        )

    extractor.save_csv(args.out)
    extractor.print_summary()


if __name__ == "__main__":
    main()

