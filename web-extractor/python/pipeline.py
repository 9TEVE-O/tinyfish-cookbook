#!/usr/bin/env python3
"""
LAB Music Management — web-extractor CLI pipeline.

Config-driven: every extraction recipe lives in ../config/<profile>.json, so
adjusting behaviour later means editing JSON, not this script.

Examples
--------
  # Free-text search (default behaviour)
  python pipeline.py "AI browser automation" --limit 5

  # Run a named target from the profile, filling its {{placeholders}}
  python pipeline.py --target artist-press --var artist="The Maccabees"
  python pipeline.py --target page-extract --var url=https://example.com

  # List available targets
  python pipeline.py --list
"""
from __future__ import annotations

import argparse
import json
import sys

from dotenv import load_dotenv

from config import fill_placeholders, get_target, load_profile, project_output
from tinyfish_client import TinyFishClient


def run_target(client: TinyFishClient, profile: dict, target: dict, overrides: dict) -> dict:
    defaults = profile["defaults"]
    engine = target["engine"]

    if engine == "search":
        query = fill_placeholders(target["query"], profile, overrides)
        limit = target.get("limit", defaults.get("searchLimit", 5))
        results = client.search(query, limit=limit)
        mapped = [
            {
                "title": r.get("title") or r.get("name", ""),
                "url": r.get("url") or r.get("link", ""),
                "snippet": r.get("snippet") or r.get("description", ""),
                "publishedAt": r.get("publishedAt") or r.get("date"),
            }
            for r in results
        ]
        return {"target": target["id"], "engine": engine, "query": query,
                "data": project_output(target, mapped)}

    if engine == "fetch":
        url = fill_placeholders(target["url"], profile, overrides)
        page = client.fetch_url(url, fmt=defaults.get("fetchFormat", "markdown"))
        return {"target": target["id"], "engine": engine, "url": url,
                "data": project_output(target, page)}

    if engine == "agent":
        url = fill_placeholders(target["url"], profile, overrides)
        goal = fill_placeholders(target["goal"], profile, overrides)
        result = client.agent_run(url, goal)
        return {"target": target["id"], "engine": engine, "url": url, "goal": goal,
                "data": project_output(target, result)}

    raise ValueError(f'Engine "{engine}" is not supported by the CLI (use the Node server for "browser").')


def parse_vars(pairs: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for p in pairs or []:
        if "=" not in p:
            raise SystemExit(f"--var expects name=value, got: {p}")
        k, v = p.split("=", 1)
        out[k.strip()] = v
    return out


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="LAB web-extractor pipeline")
    parser.add_argument("query", nargs="?", help="Free-text search query (default mode)")
    parser.add_argument("--limit", type=int, help="Max results for search mode")
    parser.add_argument("--target", help="Run a named target from the profile")
    parser.add_argument("--var", action="append", default=[], help="Override a {{placeholder}} (name=value)")
    parser.add_argument("--profile", help="Config profile name (default: $EXTRACTOR_PROFILE or 'lab')")
    parser.add_argument("--list", action="store_true", help="List available targets and exit")
    args = parser.parse_args()

    profile = load_profile(args.profile)

    if args.list:
        print(f"Profile: {profile['profile']}  ({profile['org']['name']})")
        for t in profile["targets"]:
            print(f"  - {t['id']:<18} [{t['engine']:<7}] {t.get('label', '')}")
        return

    client = TinyFishClient()
    overrides = parse_vars(args.var)

    if args.target:
        out = run_target(client, profile, get_target(profile, args.target), overrides)
    elif args.query:
        limit = args.limit or profile["defaults"].get("searchLimit", 5)
        results = client.search(args.query, limit=limit)
        out = {"engine": "search", "query": args.query, "data": results}
    else:
        parser.error("provide a search query, --target <id>, or --list")
        return

    json.dump(out, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
