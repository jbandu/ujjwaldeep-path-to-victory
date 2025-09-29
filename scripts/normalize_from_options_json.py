#!/usr/bin/env python3
import pandas as pd
import ast
import re

SRC = "questions_kaggle_parsed.csv"
DST = "questions_kaggle_parsed.normalized.csv"

def clean(opt: str) -> str:
  s = (opt or "").strip()
  # strip leading choice letters/symbols like "A.", "(B)", "C )", "- D -"
  s = re.sub(r'^\s*[\(\[\{]?\s*[A-Da-d1-4]\s*[\)\]\}\.\-:]*\s*', '', s)
  # collapse inner whitespace, remove stray leading dots
  s = re.sub(r'\s+', ' ', s).lstrip('. ').strip()
  return s

df = pd.read_csv(SRC)

# Parse options (JSON list of 4)
opts_raw = df["options"].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) else ["","","",""])
df["option_a"] = opts_raw.apply(lambda r: clean(r[0]) if len(r)>0 else "")
df["option_b"] = opts_raw.apply(lambda r: clean(r[1]) if len(r)>1 else "")
df["option_c"] = opts_raw.apply(lambda r: clean(r[2]) if len(r)>2 else "")
df["option_d"] = opts_raw.apply(lambda r: clean(r[3]) if len(r)>3 else "")

# Keep everything, but make sure core columns exist & are strings
df["stem"] = df["stem"].astype(str).str.strip()
for c in ["option_a","option_b","option_c","option_d"]:
  df[c] = df[c].astype(str).str.strip()

# Drop rows with missing stem/options
df = df[(df["stem"]!="") &
        (df["option_a"]!="") & (df["option_b"]!="") &
        (df["option_c"]!="") & (df["option_d"]!="")]

df.to_csv(DST, index=False)
print(f"Wrote {len(df):,} rows → {DST}")

