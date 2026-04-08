#!/usr/bin/env python3
"""
Scan frontend source for likely user-facing hardcoded strings.

Outputs JSON + CSV (reports/). Heuristic-based: review before i18n conversion.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class Hit:
    file: str
    line: int
    col: int
    kind: str  # string_single | string_double | template | jsx_text
    text: str
    raw_snippet: str


SKIP_STRING_PREFIXES = (
    "@/",
    "./",
    "../",
    "/",
    "http://",
    "https://",
    "data:",
    "blob:",
    "import ",
    "export ",
    "from ",
    "className:",
    "clsx(",
    "cn(",
)

SKIP_EXACT = frozenset(
    {
        "",
        " ",
        "true",
        "false",
        "null",
        "undefined",
        "use client",
        "use strict",
    }
)


def line_col_from_index(content: str, index: int) -> tuple[int, int]:
    line = content.count("\n", 0, index) + 1
    last_nl = content.rfind("\n", 0, index)
    col = index - (last_nl + 1) + 1
    return line, col


def should_skip_literal(text: str) -> bool:
    t = text.strip()
    if len(t) < 2:
        return True
    if t in SKIP_EXACT:
        return True
    if all(c in "0123456789." for c in t) and any(c.isdigit() for c in t):
        return True
    low = t.lower()
    if low.startswith(("rgba(", "rgb(", "hsl(", "linear-gradient", "radial-gradient", "var(--")):
        return True
    for p in SKIP_STRING_PREFIXES:
        if low.startswith(p):
            return True
    # CSS-ish / ids
    if re.match(r"^[#.[a-z0-9\-_\]()[\]%+:,]+$", t, re.I) and len(t) < 80:
        if " " not in t and not re.search(r"[a-z]{3,}", t.lower()):
            return True
    return False


def scan_string_literals(content: str, rel_path: str) -> list[Hit]:
    hits: list[Hit] = []
    n = len(content)
    i = 0

    def push(kind: str, start: int, end: int, inner: str) -> None:
        line, col = line_col_from_index(content, start)
        raw = content[start : end + 1] if end < n else content[start:]
        hits.append(
            Hit(
                file=rel_path,
                line=line,
                col=col,
                kind=kind,
                text=inner,
                raw_snippet=raw[:120],
            )
        )

    while i < n:
        ch = content[i]
        if ch in "'\"":
            quote = ch
            start = i
            i += 1
            buf: list[str] = []
            while i < n:
                c = content[i]
                if c == "\\" and i + 1 < n:
                    buf.append(c + content[i + 1])
                    i += 2
                    continue
                if c == quote:
                    inner = "".join(buf)
                    if not should_skip_literal(inner):
                        kind = "string_single" if quote == "'" else "string_double"
                        push(kind, start, i, inner)
                    i += 1
                    break
                buf.append(c)
                i += 1
            continue
        if ch == "`":
            start = i
            i += 1
            buf = []
            while i < n:
                c = content[i]
                if c == "\\" and i + 1 < n:
                    buf.append(c + content[i + 1])
                    i += 2
                    continue
                if c == "`":
                    inner = "".join(buf)
                    if "${" not in inner and not should_skip_literal(inner):
                        push("template", start, i - 1, inner)
                    i += 1
                    break
                if c == "$" and i + 1 < n and content[i + 1] == "{":
                    # template with interpolation — skip whole template
                    depth = 1
                    i += 2
                    while i < n and depth:
                        if content[i] == "{":
                            depth += 1
                        elif content[i] == "}":
                            depth -= 1
                        i += 1
                    continue
                buf.append(c)
                i += 1
            continue
        i += 1

    return hits


def scan_jsx_text_lines(content: str, rel_path: str) -> list[Hit]:
    """Single-line JSX text between > and < (no { in between)."""
    hits: list[Hit] = []
    for line_no, line in enumerate(content.splitlines(), start=1):
        if "{" in line and ">" in line and "<" in line:
            # likely has JSX expression — still try simple segments
            pass
        for m in re.finditer(r">([^<{}]+)<", line):
            inner = m.group(1).strip()
            if not inner or len(inner) < 2:
                continue
            if not should_skip_literal(inner):
                hits.append(
                    Hit(
                        file=rel_path,
                        line=line_no,
                        col=m.start(1) + 1,
                        kind="jsx_text",
                        text=inner,
                        raw_snippet=m.group(0)[:120],
                    )
                )
    return hits


def dedupe(hits: list[Hit]) -> list[Hit]:
    seen: set[tuple[str, int, int, str, str]] = set()
    out: list[Hit] = []
    for h in hits:
        k = (h.file, h.line, h.col, h.kind, h.text)
        if k in seen:
            continue
        seen.add(k)
        out.append(h)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract hardcoded strings from frontend/src")
    ap.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "frontend" / "src",
        help="Source root (default: frontend/src)",
    )
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "reports",
        help="Output directory for JSON and CSV",
    )
    ap.add_argument(
        "--summary",
        action="store_true",
        help="Print counts by kind (e.g. jsx_text should be 0 after i18n pass)",
    )
    args = ap.parse_args()
    root: Path = args.root
    out_dir: Path = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    all_hits: list[Hit] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix not in {".ts", ".tsx"}:
            continue
        if path.name.endswith(".d.ts"):
            continue
        rel = path.relative_to(root.parent.parent).as_posix()
        content = path.read_text(encoding="utf-8")
        all_hits.extend(scan_string_literals(content, rel))
        all_hits.extend(scan_jsx_text_lines(content, rel))

    all_hits = dedupe(all_hits)
    all_hits.sort(key=lambda h: (h.file, h.line, h.col))

    payload = {
        "root": str(root),
        "count": len(all_hits),
        "strings": [asdict(h) for h in all_hits],
    }
    json_path = out_dir / "hardcoded_strings.json"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    csv_path = out_dir / "hardcoded_strings.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "line", "col", "kind", "text", "raw_snippet"])
        w.writeheader()
        for h in all_hits:
            w.writerow(asdict(h))

    print(f"Wrote {json_path} ({len(all_hits)} rows)")
    print(f"Wrote {csv_path}")

    if args.summary:
        from collections import Counter

        by_kind = Counter(h.kind for h in all_hits)
        print("Summary (by kind):", dict(sorted(by_kind.items(), key=lambda x: x[0])))
        jsx = [h for h in all_hits if h.kind == "jsx_text"]
        print(f"jsx_text (same-line JSX copy without {{ }}): {len(jsx)}")
        if jsx:
            for h in jsx[:25]:
                print(f"  {h.file}:{h.line}  {h.text[:72]!r}")


if __name__ == "__main__":
    main()
