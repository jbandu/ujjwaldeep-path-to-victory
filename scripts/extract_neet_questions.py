#!/usr/bin/env python3
"""
NEET 2022 PDF Question Extractor (Robust)
- Parses all subjects with one generic extractor
- Keeps line breaks for better option/solution detection
- Optional OCR fallback for image-only pages
- Outputs CSV compatible with your Supabase `questions` schema

Usage:
  pip install pdfplumber pandas
  # (optional OCR) brew install tesseract && pip install pdf2image pytesseract pillow
  python3 extract_neet_questions.py
"""

import os
import re
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

import pdfplumber
import pandas as pd

# Quiet noisy pdfminer logs
logging.getLogger("pdfminer").setLevel(logging.ERROR)

# Optional OCR deps (loaded lazily)
HAVE_OCR = False
try:
    from pdf2image import convert_from_path  # type: ignore
    import pytesseract  # type: ignore
    from PIL import Image  # noqa: F401
    HAVE_OCR = True
except Exception:
    HAVE_OCR = False


# ---------- Regex patterns (generic across subjects) ----------
QUESTION_RE = re.compile(
    r'(?m)^(?P<num>\d{1,3})\.\s*(?P<body>.+?)(?=^\d{1,3}\.\s*|^\s*Sol\.\s*Answer|\Z)',
    re.DOTALL
)

# Options as "(1) foo", "(2) bar", ...
OPTION_PAREN_RE = re.compile(
    r'(?m)^\((?P<i>[1-4])\)\s*(?P<txt>.+?)(?=^\(\d\)|^\s*Sol\.|^\d{1,3}\.\s*|\Z)',
    re.DOTALL
)
# Fallback options as "1. foo", "2. bar", ...
OPTION_DOT_RE = re.compile(
    r'(?m)^(?P<i>[1-4])\.\s*(?P<txt>.+?)(?=^\d\.|^\(\d\)|^\s*Sol\.|^\d{1,3}\.\s*|\Z)',
    re.DOTALL
)

# Solutions like "Sol. Answer (3)" or "Sol. Answer (B)"
ANSWER_RE = re.compile(r'(?mi)\bSol\.\s*Answer\s*\(\s*([1-4A-Da-d])\s*\)')
SOL_START_RE = re.compile(r'(?mi)^\s*Sol\.\b')


def ocr_pdf_to_text(pdf_path: str) -> str:
    """OCR fallback for image-only PDFs (requires Tesseract)."""
    if not HAVE_OCR:
        return ""
    try:
        pages = convert_from_path(pdf_path, dpi=300)
    except Exception as e:
        logging.warning(f"OCR rasterization failed: {e}")
        return ""
    chunks = []
    for img in pages:
        try:
            t = pytesseract.image_to_string(img, lang='eng')
            if t:
                chunks.append(t)
        except Exception as e:
            logging.warning(f"OCR failed on a page: {e}")
    return "\n".join(chunks)


def clean_text_keep_lines(text: str) -> str:
    """Normalize but KEEP line breaks for structure-aware parsing."""
    # Normalize dashes/quotes
    text = (text or "").replace("–", "-").replace("’", "'").replace("“", '"').replace("”", '"')
    # Collapse excessive spaces but keep newlines
    text = re.sub(r'[ \t]+', ' ', text)
    # Avoid huge blank sections
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract textual content from a PDF with structure; OCR fallback if needed."""
    texts: List[str] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Tune tolerances to keep columns in order more consistently
                t = page.extract_text(x_tolerance=1.5, y_tolerance=2.0) or ""
                texts.append(t)
    except Exception as e:
        logging.error(f"Error reading {pdf_path}: {e}")
        texts = []

    full_text = "\n".join(texts).strip()
    if len(full_text) < 200 and HAVE_OCR:
        # probably a scanned PDF
        logging.info("Falling back to OCR (document looks image-only or too sparse).")
        full_text = ocr_pdf_to_text(pdf_path)

    return clean_text_keep_lines(full_text)


def subject_from_filename(fn: str) -> Optional[str]:
    low = fn.lower()
    if "bio" in low:
        return "Biology"
    if "chem" in low:
        return "Chemistry"
    if "phy" in low:
        return "Physics"
    return None


def classify_question(stem: str):
    """Heuristic chapter/topic classifier (same flavor you used)."""
    s = stem.lower()
    # Physics
    if any(w in s for w in ['magnetic', 'electric', 'field', 'flux', 'induction']):
        return "Electromagnetic Theory", "Electric and Magnetic Fields"
    elif any(w in s for w in ['lens', 'mirror', 'refraction', 'reflection', 'light']):
        return "Optics", "Geometrical Optics"
    elif any(w in s for w in ['motion', 'velocity', 'acceleration', 'kinematics']):
        return "Mechanics", "Kinematics"
    elif any(w in s for w in ['thermodynamics', 'heat', 'temperature', 'gas']):
        return "Thermodynamics", "Heat and Temperature"
    elif any(w in s for w in ['wave', 'frequency', 'wavelength', 'oscillation']):
        return "Waves", "Wave Motion"
    # Chemistry
    elif any(w in s for w in ['bond', 'molecular', 'hybridization', 'structure']):
        return "Chemical Bonding", "Molecular Structure"
    elif any(w in s for w in ['solution', 'molality', 'molarity', 'concentration']):
        return "Solutions", "Concentration"
    elif any(w in s for w in ['electrode', 'electrochemical', 'oxidation', 'reduction']):
        return "Electrochemistry", "Redox Reactions"
    elif any(w in s for w in ['polymer', 'monomer', 'polymerization']):
        return "Polymers", "Types and Properties"
    elif any(w in s for w in ['organic', 'hydrocarbon', 'alkane', 'alkene']):
        return "Organic Chemistry", "Hydrocarbons"
    # Biology
    elif any(w in s for w in ['gene', 'dna', 'rna', 'genetic', 'inheritance']):
        return "Genetics", "Molecular Genetics"
    elif any(w in s for w in ['cell', 'mitosis', 'meiosis', 'chromosome']):
        return "Cell Biology", "Cell Division"
    elif any(w in s for w in ['plant', 'flower', 'leaf', 'photosynthesis']):
        return "Plant Biology", "Plant Physiology"
    elif any(w in s for w in ['evolution', 'species', 'natural selection']):
        return "Evolution", "Natural Selection"
    elif any(w in s for w in ['ecosystem', 'biodiversity', 'conservation']):
        return "Ecology", "Environmental Biology"
    return "General Topics", "Mixed Topics"


def parse_question_block(block: str):
    """Return (stem, options[4], correct_index, explanation) or None if incomplete."""
    # Collect options via both patterns
    options = [None, None, None, None]  # type: ignore
    # Parenthesized style first
    for m in OPTION_PAREN_RE.finditer(block):
        idx = int(m.group("i")) - 1
        txt = re.sub(r'\s+', ' ', (m.group("txt") or "")).strip()
        if 0 <= idx < 4:
            options[idx] = txt

    # Fallback "1. " style
    for m in OPTION_DOT_RE.finditer(block):
        idx = int(m.group("i")) - 1
        txt = re.sub(r'\s+', ' ', (m.group("txt") or "")).strip()
        if 0 <= idx < 4 and not options[idx]:
            options[idx] = txt

    if any(o is None for o in options):
        return None

    # Stem is everything before first option marker
    first_opt_pos = None
    m1 = re.search(r'(?m)^\(\s*1\s*\)', block)
    m2 = re.search(r'(?m)^\s*1\.\s*', block)
    candidates = [m.start() for m in [m1, m2] if m]
    if candidates:
        first_opt_pos = min(candidates)
    stem = block[:first_opt_pos].strip() if first_opt_pos is not None else block.strip()
    stem = re.sub(r'\s+', ' ', stem)

    # Correct answer
    correct_index = 0
    ans_m = ANSWER_RE.search(block)
    if ans_m:
        ans = ans_m.group(1)
        if ans.upper() in "ABCD":
            correct_index = ord(ans.upper()) - ord('A')
        else:
            try:
                correct_index = max(0, min(3, int(ans) - 1))
            except Exception:
                correct_index = 0

    # Explanation (from "Sol." onward, if present)
    explanation = ""
    sol = SOL_START_RE.search(block)
    if sol:
        explanation = re.sub(r'\s+', ' ', block[sol.start():]).strip()

    return stem, [o for o in options if o is not None], correct_index, explanation


def extract_all_questions(text: str) -> List[Dict]:
    out: List[Dict] = []
    for q_match in QUESTION_RE.finditer(text):
        qnum = int(q_match.group("num"))
        body = q_match.group("body")
        parsed = parse_question_block(body)
        if not parsed:
            continue
        stem, options, correct_index, explanation = parsed
        out.append({
            "question_number": qnum,
            "stem": stem,
            "options": options,
            "correct_index": correct_index,
            "explanation": explanation
        })
    return out


def to_supabase_row(subject: str, q: Dict, qid: int) -> Dict:
    chapter, topic = classify_question(q["stem"])
    now = datetime.now().isoformat()
    return {
        "id": qid,
        "subject": subject,
        "chapter": chapter,
        "topic": topic,
        "stem": q["stem"],
        "options": json.dumps(q["options"], ensure_ascii=False),
        "correct_index": q["correct_index"],
        "explanation": json.dumps({"text": q["explanation"]}, ensure_ascii=False),
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
    }


def main():
    print("Scanning current folder for NEET PDFs…")
    pdfs = {}  # subject -> filename
    for fn in os.listdir("."):
        if not fn.lower().endswith(".pdf"):
            continue
        subj = subject_from_filename(fn)
        if subj:
            pdfs[subj] = fn

    if not pdfs:
        print("No matching PDFs found (expect names containing 'physics'/'chemistry'/'biology').")
        return

    all_rows = []
    qid = 500  # start id (adjust if you want)

    for subject, pdf_path in pdfs.items():
        print(f"\nProcessing {subject}: {pdf_path}")
        raw = extract_text_from_pdf(pdf_path)
        if not raw:
            print(f"  ! No text extracted from {pdf_path}")
            continue
        text = clean_text_keep_lines(raw)
        questions = extract_all_questions(text)
        print(f"  ✓ Parsed {len(questions)} questions")

        for q in questions:
            qid += 1
            all_rows.append(to_supabase_row(subject, q, qid))

    if not all_rows:
        print("\nNo questions parsed. Try enabling OCR (install Tesseract) or share a sample page to refine regex.")
        return

    out_file = "neet_2022_questions_complete.csv"
    df = pd.DataFrame(all_rows)
    df.to_csv(out_file, index=False)
    print(f"\nSaved {len(all_rows)} questions → {out_file}")

    # Breakdown
    by_subject = {}
    for r in all_rows:
        by_subject[r["subject"]] = by_subject.get(r["subject"], 0) + 1

    print("\nBreakdown by subject:")
    for s, n in by_subject.items():
        print(f"  {s}: {n}")


if __name__ == "__main__":
    main()

