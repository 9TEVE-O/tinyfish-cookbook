"""Load and resolve the shared JSON config profile (same files as the Node app)."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"
_TOKEN = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def load_profile(name: str | None = None) -> dict[str, Any]:
    name = name or os.getenv("EXTRACTOR_PROFILE", "lab")
    profile = json.loads((CONFIG_DIR / f"{name}.json").read_text(encoding="utf-8"))
    profile.setdefault("targets", [])
    profile.setdefault("variables", {})
    profile.setdefault("defaults", {})
    return profile


def get_target(profile: dict[str, Any], target_id: str) -> dict[str, Any]:
    for t in profile["targets"]:
        if t.get("id") == target_id:
            return t
    ids = ", ".join(t.get("id", "?") for t in profile["targets"])
    raise KeyError(f'Unknown target "{target_id}". Available: {ids}')


def fill_placeholders(value: Any, profile: dict[str, Any], overrides: dict[str, str]) -> Any:
    if not isinstance(value, str):
        return value
    variables = {**profile["variables"], **overrides}

    def repl(m: re.Match) -> str:
        key = m.group(1)
        v = variables.get(key)
        if v in (None, ""):
            raise ValueError(f"Missing value for {{{{{key}}}}} — pass it via --var.")
        return str(v)

    return _TOKEN.sub(repl, value)


def project_output(target: dict[str, Any], obj: Any) -> Any:
    fields = target.get("output")
    if not fields or obj is None:
        return obj

    def pick(o: dict[str, Any]) -> dict[str, Any]:
        return {f: o[f] for f in fields if f in o}

    if isinstance(obj, list):
        return [pick(o) if isinstance(o, dict) else o for o in obj]
    if isinstance(obj, dict):
        return pick(obj)
    return obj
