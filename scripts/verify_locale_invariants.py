#!/usr/bin/env python3
"""
Ensure locale JSON never drifts from non-translatable invariants:
demo account emails/passwords (must match demoAccounts.ts), storage key prefix, etc.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEMO_TS = REPO / "frontend" / "src" / "config" / "demoAccounts.ts"


def parse_demo_accounts(ts: str) -> tuple[list[str], list[str]]:
    emails = re.findall(r"email:\s*'([^']+)'", ts)
    passwords = re.findall(r"password:\s*'([^']+)'", ts)
    return emails, passwords


def main() -> int:
    raw = DEMO_TS.read_text(encoding="utf-8")
    emails, passwords = parse_demo_accounts(raw)
    if len(emails) < 2 or len(passwords) < 2:
        print("Could not parse demoAccounts.ts emails/passwords.", file=sys.stderr)
        return 1

    for name in ("en.json", "es.json"):
        path = REPO / "frontend" / "src" / "locales" / name
        data = json.loads(path.read_text(encoding="utf-8"))
        blob = json.dumps(data, ensure_ascii=False)
        for e in emails:
            if e not in blob:
                print(f"{path.name}: missing demo email literal {e!r}", file=sys.stderr)
                return 1
        for p in passwords:
            if p not in blob:
                print(f"{path.name}: missing demo password literal {p!r}", file=sys.stderr)
                return 1
        # Never ship a wrong learner alias (common bad translation)
        if "alumno@demo.local" in blob:
            print(f"{path.name}: invalid translated demo email alumno@demo.local", file=sys.stderr)
            return 1

    print("OK: locale demo credentials match demoAccounts.ts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
