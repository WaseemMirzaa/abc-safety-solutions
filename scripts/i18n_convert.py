#!/usr/bin/env python3
"""
Build frontend/src/locales/en.json from extraction JSON and optionally apply JSX text -> {t('key')}.

Run after: python3 scripts/extract_hardcoded_strings.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


def stable_key(file_path: str, line: int, col: int, text: str) -> str:
    h = hashlib.sha256(f"{file_path}:{line}:{col}:{text}".encode()).hexdigest()[:10]
    base = Path(file_path).stem
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip())[:48].strip("_").lower() or "txt"
    return f"{base}_{line}_{slug}_{h}"


def load_hits(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("strings", [])


def build_translation_map(hits: list[dict], kinds: set[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for h in hits:
        if h.get("kind") not in kinds:
            continue
        text = (h.get("text") or "").strip()
        if len(text) < 2:
            continue
        key = stable_key(h["file"], h["line"], h["col"], text)
        out[key] = text
    return out


def ensure_t_import(content: str) -> str:
    if "from '@/i18n/t'" in content or 'from "@/i18n/t"' in content:
        return content
    lines = content.splitlines(keepends=True)
    insert_at = 0
    for i, line in enumerate(lines):
        if line.startswith("import "):
            insert_at = i + 1
    imp = "import { t } from '@/i18n/t'\n"
    lines.insert(insert_at, imp)
    return "".join(lines)


def apply_jsx_replacements(content: str, file_rel: str, hits: list[dict], keys: dict[str, str]) -> tuple[str, int]:
    """Replace >text< with {t('key')} for matching hits in this file."""
    replaced = 0
    lines = content.splitlines(keepends=True)
    file_hits = [h for h in hits if h["file"] == file_rel and h["kind"] == "jsx_text"]
    # Process line by line
    new_lines: list[str] = []
    for line_no, line in enumerate(lines, start=1):
        line_hits = [h for h in file_hits if h["line"] == line_no]
        if not line_hits:
            new_lines.append(line)
            continue
        new_line = line
        # Rightmost first if multiple (same line)
        for h in sorted(line_hits, key=lambda x: -x["col"]):
            text = (h.get("text") or "").strip()
            key = stable_key(h["file"], h["line"], h["col"], text)
            if key not in keys:
                continue
            pattern = re.compile(r">(\s*)" + re.escape(text) + r"(\s*)<")
            repl = r">\1{t('" + key + r"')}\2<"
            nline, n = pattern.subn(repl, new_line, count=1)
            if n:
                new_line = nline
                replaced += n
        new_lines.append(new_line)
    out = "".join(new_lines)
    if replaced:
        out = ensure_t_import(out)
    return out, replaced


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--extract-json",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "reports" / "hardcoded_strings.json",
    )
    ap.add_argument(
        "--locale-out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "frontend" / "src" / "locales" / "en.json",
    )
    ap.add_argument(
        "--apply",
        action="store_true",
        help="Rewrite TSX files replacing jsx_text with t() calls",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="With --apply, print counts only",
    )
    args = ap.parse_args()

    project = Path(__file__).resolve().parent.parent
    hits = load_hits(args.extract_json)
    kinds = {"jsx_text"}
    trans = build_translation_map(hits, kinds)
    args.locale_out.parent.mkdir(parents=True, exist_ok=True)
    args.locale_out.write_text(json.dumps(trans, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {args.locale_out} ({len(trans)} keys)")

    if not args.apply:
        print("Run with --apply to convert JSX text nodes (review git diff after).")
        return

    files_changed = 0
    total_repl = 0
    by_file: dict[str, int] = {}
    for path in sorted(project.glob("frontend/src/**/*.tsx")):
        rel = path.relative_to(project).as_posix()
        new_content, n = apply_jsx_replacements(path.read_text(encoding="utf-8"), rel, hits, trans)
        if n:
            by_file[rel] = n
            total_repl += n
            if args.dry_run:
                print(f"Would update {rel}: {n} replacements")
            else:
                path.write_text(new_content, encoding="utf-8")
                files_changed += 1

    print(f"Total replacements: {total_repl}, files touched: {files_changed}")
    if args.dry_run:
        print("(dry-run: no files written for TSX)")


if __name__ == "__main__":
    main()
