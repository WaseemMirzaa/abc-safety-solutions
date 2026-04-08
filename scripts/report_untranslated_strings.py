#!/usr/bin/env python3
"""
Scan frontend/src (all .ts / .tsx) and list likely user-facing strings that are
not passed through i18n t() (or are raw JSX text).

Writes:
  reports/untranslated_strings.json
  reports/untranslated_strings.csv
  reports/untranslated_strings.md

Heuristic: excludes import paths, routes, URLs, t('key') arguments, and lines
that only reference translation keys. Review output before bulk changes.
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import re
import sys
from dataclasses import asdict
from pathlib import Path

# Load extract_hardcoded_strings as a module (same folder)
_EXTRACT_PATH = Path(__file__).resolve().parent / "extract_hardcoded_strings.py"
_spec = importlib.util.spec_from_file_location("extract_hardcoded_strings", _EXTRACT_PATH)
assert _spec and _spec.loader
_extract = importlib.util.module_from_spec(_spec)
sys.modules["extract_hardcoded_strings"] = _extract
_spec.loader.exec_module(_extract)

scan_string_literals = _extract.scan_string_literals
scan_jsx_text_lines = _extract.scan_jsx_text_lines
dedupe = _extract.dedupe
Hit = _extract.Hit
should_skip_literal = _extract.should_skip_literal


def strip_line_comment(code: str) -> str:
    """Remove // comment from end of line (rough)."""
    out = []
    i = 0
    in_s = in_d = in_bt = False
    quote = ""
    while i < len(code):
        c = code[i]
        if not in_s and not in_d and not in_bt and i + 1 < len(code) and code[i : i + 2] == "//":
            break
        if not in_d and not in_bt and c in "'\"":
            if not in_s:
                in_s = True
                quote = c
            elif c == quote:
                in_s = False
        elif not in_s and not in_bt and c == '"':
            in_d = not in_d
        elif not in_s and not in_d and c == "`":
            in_bt = not in_bt
        out.append(c)
        i += 1
    return "".join(out)


def text_is_first_arg_of_t(line: str, text: str) -> bool:
    """True if this exact string is the first string literal argument to t(...)."""
    s = strip_line_comment(line)
    # t( 'key' ) or t("key") or t(`key`)
    for pat in (
        rf"\bt\s*\(\s*['\"]{re.escape(text)}['\"]",
        rf"\bt\s*\(\s*`{re.escape(text)}`",
        rf"i18n\s*\.\s*t\s*\(\s*['\"]{re.escape(text)}['\"]",
    ):
        if re.search(pat, s):
            return True
    # labelKey: 'i18n_key'
    if re.search(r"\blabelKey\s*:\s*['\"]" + re.escape(text) + r"['\"]", s):
        return True
    return False


def line_looks_like_import_or_export(line: str) -> bool:
    t = line.strip()
    return bool(re.match(r"^(import|export)\s", t))


def line_looks_like_type_only(line: str) -> bool:
    t = line.strip()
    return t.startswith("type ") or t.startswith("interface ")


def looks_like_route_or_nav_segment(line: str, text: str) -> bool:
    """path=, to=, navigate( segments — not copy for i18n."""
    if re.search(r"\bpath\s*=\s*[`'\"]" + re.escape(text) + r"[`'\"]", line):
        return True
    if re.search(r"\bto\s*=\s*[`'\"]/" + re.escape(text) + r"[`'\"]", line):
        return True
    if text == "admin" and re.search(r"\bto\s*=\s*[`'\"]/admin[`'\"]", line):
        return True
    if re.search(r"\bnavigate\s*\(\s*[`'\"]/" + re.escape(text) + r"[`'\"]", line):
        return True
    if re.search(r"\bhref\s*=\s*[`'\"]/" + re.escape(text) + r"[`'\"]", line):
        return True
    return False


def looks_like_code_identifier(line: str, text: str) -> bool:
    """name=, type=, role=, etc."""
    if re.search(
        r"\b(name|type|id|htmlFor|key|variant)\s*=\s*[`'\"]" + re.escape(text) + r"[`'\"]",
        line,
    ):
        return True
    return False


def looks_like_tailwind_class_blob(text: str) -> bool:
    """clsx/className / utility strings — not translatable copy."""
    t = text.strip()
    if len(t) < 4:
        return False
    if re.search(r"\bspace-[xy]\b", t):
        return True
    if re.search(r"\b(sm|md|lg|xl|2xl|max|min)-[a-z]|:([a-z0-9[\]])", t):
        return True
    if re.search(
        r"\b(bg|text|ring|shadow|rounded|border|flex|grid|gap|p|px|py|m|mx|my|mt|mb|ml|mr|w|h|max-w|min-w|max-h|min-h|font|leading|tracking|uppercase|object|overflow|inset|absolute|relative|pointer|opacity|backdrop|from|to|via|translate|scale|rotate)-",
        t,
    ):
        return True
    if "[" in t and "]" in t and len(t) > 12:
        return True
    return False


TECH_LITERALS = frozenset(
    {
        "button",
        "div",
        "span",
        "lazy",
        "auto",
        "_blank",
        "noreferrer",
        "noopener",
        "currentColor",
        "none",
        "USD",
        "currency",
        "en-US",
        "smcp",
        "full",
        "compact",
        "long",
        "hidden",
        "show",
        "all",
        "DOT",
        "relative",
        "Department of Transportation (DOT)",
    }
)


def looks_like_svg_or_geometry(text: str) -> bool:
    t = text.strip()
    if re.match(r"^[\d.\s]+$", t) and 3 < len(t) < 80:
        return True
    if t.startswith("M") and len(t) > 40 and "v" in t:
        return True
    return False


def looks_like_technical_literal(text: str) -> bool:
    t = text.strip()
    if t in TECH_LITERALS:
        return True
    if re.match(r"^[\d.]+$", t):
        return True
    if len(t) > 40 and re.match(r"^[MCLZ][0-9\s.\-,]+$", t[:5]):
        return True  # SVG path d=
    if t.startswith("DEMO-") or t == "sample":
        return True
    if t in frozenset({"eager", "async", "high", "wait", "note", "featured-loading", "featured-ready"}):
        return True
    if t.startswith("cat-"):
        return True
    if t in frozenset({"spring", "string", "lucide-react", "dialog", "admin-modal-title", "light", "dark", "auth-brand-panel", "skeleton-bar", "status", "polite", "sr-only", "email", "current-password", "name", "root"}):
        return True
    if re.match(r"^[a-z]+(-[a-z0-9]+)+$", t) and len(t) < 80 and " " not in t:
        return True  # tailwind / class token
    return False


SKIP_REPORT_FILES = frozenset(
    {
        "frontend/src/api/queryKeys.ts",
        # English source-of-truth for seed data; UI uses catalogLocale + locales/*.json
        "frontend/src/data/catalog.ts",
        "frontend/src/config/demoAccounts.ts",
        "frontend/src/types.ts",
        "frontend/src/lib/localCache.ts",
        "frontend/src/lib/migrateAdminTests.ts",
        "frontend/src/lib/readFileAsDataUrl.ts",
        "frontend/src/lib/catalogLocale.ts",
        "frontend/src/i18n/t.ts",
        "frontend/src/main.tsx",
        "frontend/src/layouts/AdminLayout.tsx",
        "frontend/src/lib/demoSeed.ts",
        "frontend/src/lib/courseSlides.ts",
        "frontend/src/lib/motionPresets.ts",
    }
)


def skip_report_file(path: str) -> bool:
    if path in SKIP_REPORT_FILES:
        return True
    if path.startswith("frontend/src/pages/admin/"):
        return True
    return False


def looks_like_auth_role_literal(line: str, text: str) -> bool:
    """User role enum / comparisons — not translatable UI copy."""
    if text not in ("admin", "learner"):
        return False
    if re.search(r"\brole\s*(===|==|:)\s*['\"]" + re.escape(text) + r"['\"]", line):
        return True
    if re.search(r"fillDemo\s*\(\s*['\"]" + re.escape(text) + r"['\"]", line):
        return True
    if re.search(r"which\s*===\s*['\"]" + re.escape(text) + r"['\"]", line):
        return True
    if re.search(r"['\"]learner['\"]\s*\|\s*['\"]admin['\"]", line):
        return True
    return False


def hit_is_untranslated(content_lines: list[str], h: Hit) -> bool:
    if h.line < 1 or h.line > len(content_lines):
        return False
    line = content_lines[h.line - 1]

    if line_looks_like_import_or_export(line):
        return False
    if line_looks_like_type_only(line):
        return False

    # Raw JSX text: must not be t( on same line (verify_i18n style)
    if h.kind == "jsx_text":
        if "t(" in line:
            return False
        return True

    # String literal: skip if it's the key passed to t() / i18n.t()
    if text_is_first_arg_of_t(line, h.text):
        return False

    # Skip common technical literals still flagged
    low = h.text.strip().lower()
    if low in {"en", "es", "tsx", "ts", "json", "utf-8"}:
        return False
    if re.fullmatch(r"ui_[a-z0-9_]+", low):
        return False

    if looks_like_route_or_nav_segment(line, h.text):
        return False
    if looks_like_auth_role_literal(line, h.text):
        return False
    if re.search(r"\.get\s*\(\s*['\"]course['\"]", line) and h.text == "course":
        return False
    if "fontFeatureSettings" in line and "smcp" in h.text:
        return False
    if looks_like_code_identifier(line, h.text):
        return False
    if looks_like_tailwind_class_blob(h.text):
        return False
    if looks_like_technical_literal(h.text):
        return False
    if looks_like_svg_or_geometry(h.text):
        return False
    if h.kind == "template" and (
        "CERT-" in h.text
        or "LOCAL-" in h.text
        or "catalog_" in h.text
        or "slide" in h.text.lower()
    ):
        return False

    return True


def main() -> int:
    ap = argparse.ArgumentParser(
        description="List hardcoded UI strings not wrapped in t() (frontend/src)."
    )
    ap.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "frontend" / "src",
        help="Root to scan (default: frontend/src)",
    )
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "reports",
        help="Output directory",
    )
    args = ap.parse_args()
    root: Path = args.root
    out_dir: Path = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    repo_root = root.parent.parent
    all_hits: list[Hit] = []

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix not in {".ts", ".tsx"}:
            continue
        if path.name.endswith(".d.ts"):
            continue
        rel = path.relative_to(repo_root).as_posix()
        content = path.read_text(encoding="utf-8")
        all_hits.extend(scan_string_literals(content, rel))
        all_hits.extend(scan_jsx_text_lines(content, rel))

    all_hits = dedupe(all_hits)
    all_hits.sort(key=lambda h: (h.file, h.line, h.col))

    # Group by file for filtering
    by_file: dict[str, str] = {}
    for path in {h.file for h in all_hits}:
        p = repo_root / path
        by_file[path] = p.read_text(encoding="utf-8")

    untranslated: list[Hit] = []
    for h in all_hits:
        if skip_report_file(h.file):
            continue
        lines = by_file[h.file].splitlines()
        if not hit_is_untranslated(lines, h):
            continue
        untranslated.append(h)

    payload = {
        "description": "Likely user-facing strings not passed as t('...') first arg, or raw jsx_text without t() on line.",
        "root": str(root.resolve()),
        "files_scanned": len({h.file for h in all_hits}),
        "total_hits_raw": len(all_hits),
        "count_untranslated": len(untranslated),
        "strings": [asdict(h) for h in untranslated],
    }

    json_path = out_dir / "untranslated_strings.json"
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    csv_path = out_dir / "untranslated_strings.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f, fieldnames=["file", "line", "col", "kind", "text", "raw_snippet"]
        )
        w.writeheader()
        for h in untranslated:
            w.writerow(asdict(h))

    md_path = out_dir / "untranslated_strings.md"
    lines_out = [
        "# Untranslated / non-`t()` strings",
        "",
        f"- Root: `{root}`",
        f"- Files with hits: **{payload['files_scanned']}**",
        f"- Raw extractions: **{payload['total_hits_raw']}**",
        f"- After filter (likely untranslated): **{payload['count_untranslated']}**",
        "",
        "Heuristic: excludes `t('key')` arguments, import lines, and jsx lines containing `t(`.",
        "",
        "| File | Line | Kind | Text |",
        "|------|------|------|------|",
    ]
    for h in untranslated:
        txt = (h.text or "").replace("|", "\\|").replace("\n", " ")[:200]
        lines_out.append(f"| `{h.file}` | {h.line} | {h.kind} | {txt} |")
    md_path.write_text("\n".join(lines_out) + "\n", encoding="utf-8")

    print(f"Wrote {json_path} ({len(untranslated)} rows)")
    print(f"Wrote {csv_path}")
    print(f"Wrote {md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
