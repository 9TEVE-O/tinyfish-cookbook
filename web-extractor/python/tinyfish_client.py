"""Minimal TinyFish client (Search / Fetch / Agent) for the LAB web-extractor."""
from __future__ import annotations

import json
import os
from typing import Any

import requests

AGENT_BASE = os.getenv("TINYFISH_AGENT_URL", "https://agent.tinyfish.ai")
SEARCH_BASE = os.getenv("TINYFISH_SEARCH_URL", "https://api.search.tinyfish.ai")
FETCH_BASE = os.getenv("TINYFISH_FETCH_URL", "https://api.fetch.tinyfish.ai")


class TinyFishClient:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("TINYFISH_API_KEY")
        if not self.api_key:
            raise RuntimeError("TINYFISH_API_KEY is required (set it in .env).")

    @property
    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key}

    def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        res = requests.get(SEARCH_BASE, params={"query": query}, headers=self._headers, timeout=30)
        res.raise_for_status()
        data = res.json()
        return (data.get("results") or data.get("data") or [])[:limit]

    def fetch_url(self, url: str, fmt: str = "markdown") -> dict[str, Any]:
        res = requests.post(
            FETCH_BASE,
            headers={**self._headers, "Content-Type": "application/json"},
            json={"urls": [url], "format": fmt},
            timeout=60,
        )
        res.raise_for_status()
        data = res.json()
        first = (data.get("results") or data.get("data") or [data])[0] or {}
        return {
            "url": url,
            "title": first.get("title", ""),
            "content": first.get("content") or first.get("markdown") or first.get("text", ""),
        }

    def agent_run(self, url: str, goal: str) -> Any:
        res = requests.post(
            f"{AGENT_BASE}/v1/automation/run-sse",
            headers={**self._headers, "Content-Type": "application/json"},
            json={"url": url, "goal": goal},
            stream=True,
            timeout=300,
        )
        res.raise_for_status()
        events: list[dict[str, Any]] = []
        for raw in res.iter_lines():
            if not raw:
                continue
            line = raw.decode("utf-8")
            if line.startswith("data: "):
                try:
                    events.append(json.loads(line[6:]))
                except json.JSONDecodeError:
                    pass
        for ev in reversed(events):
            payload = ev.get("result") or ev.get("output") or ev.get("data")
            if payload is not None:
                return payload
        return None
