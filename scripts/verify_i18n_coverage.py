#!/usr/bin/env python3
"""
Fail if TSX files still contain likely unconverted JSX text (>literal< without t()).
Excludes lines that are only punctuation, whitespace, or obvious non-copy.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "frontend" / "src"

# >text< where text is not { or only whitespace; allow t( in content
LINE_RE = re.compile(r">([^<]+)<")


def line_is_suspicious(line: str) -> bool:
    s = line.strip()
    if not s or s.startswith("//") or s.startswith("*"):
        return False
    if "t(" in line:
        return False
    if "import " in line and " from " in line:
        return False
    for m in LINE_RE.finditer(line):
        inner = m.group(1).strip()
        if not inner:
            continue
        if inner.startswith("{"):
            continue
        # Skip pure punctuation / single char
        if len(inner) <= 1 and inner in "/—|-":
            continue
        if re.fullmatch(r"[\s\-_/…]+", inner):
            continue
        if re.fullmatch(r"\d+", inner):
            continue
        # Likely raw JSX text
        if re.search(r"[A-Za-z]{2,}", inner):
            return True
    return False


def main() -> int:
    bad: list[tuple[str, int, str]] = []
    for path in sorted(ROOT.rglob("*.tsx")):
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT.parent.parent).as_posix()
        for i, line in enumerate(text.splitlines(), start=1):
            if line_is_suspicious(line):
                bad.append((rel, i, line.strip()[:200]))

    if bad:
        print(f"Found {len(bad)} suspicious lines (JSX text without t()):", file=sys.stderr)
        for rel, ln, snippet in bad[:80]:
            print(f"  {rel}:{ln}: {snippet}", file=sys.stderr)
        if len(bad) > 80:
            print(f"  ... and {len(bad) - 80} more", file=sys.stderr)
        return 1
    print("OK: no suspicious unconverted JSX text lines found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
