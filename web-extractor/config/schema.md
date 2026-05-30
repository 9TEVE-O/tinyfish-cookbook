# Config profile schema

A profile (e.g. `lab.json`) is the single source of truth for what this
extractor pulls. Both the Node server and the Python CLI read the same file, so
adjusting behaviour later means editing JSON — not code.

Select the active profile with `EXTRACTOR_PROFILE` in `.env` (default `lab`).

```jsonc
{
  "profile": "lab",                  // must match the filename
  "org": { "name", "domain", "description" },

  "defaults": {
    "searchLimit": 5,                // default result cap for search targets
    "fetchFormat": "markdown",       // markdown | html | json
    "region": "us"
  },

  "targets": [                       // each entry is one extraction recipe
    {
      "id": "artist-press",          // unique id, used by CLI/API to pick a target
      "label": "Human readable name",
      "engine": "search",            // search | fetch | agent | browser
      "query": "{{artist}} ...",     // for engine=search
      "url": "https://...{{var}}",   // for engine=fetch | agent | browser
      "goal": "Natural-language ...",// for engine=agent (and optional for browser)
      "limit": 5,                    // optional, overrides defaults.searchLimit
      "output": ["field", "..."]     // fields to keep in the normalised result
    }
  ],

  "variables": {                     // default values for {{placeholders}}
    "artist": "",
    "url": ""
  }
}
```

## Engines

| Engine    | TinyFish endpoint                    | Use for                                   |
|-----------|--------------------------------------|-------------------------------------------|
| `search`  | `api.search.tinyfish.ai`             | Fast structured web search (free)         |
| `fetch`   | `api.fetch.tinyfish.ai`             | Any URL → clean markdown/JSON/HTML (free) |
| `agent`   | `agent.tinyfish.ai` (SSE)            | URL + natural-language goal → JSON        |
| `browser` | managed browser via Playwright (CDP) | Custom multi-step Playwright scripts      |

## Placeholders

`{{name}}` tokens in `query`, `url`, and `goal` are filled from, in order:
1. per-run overrides (CLI `--var name=value` / API body `variables`)
2. the profile's `variables` block

Adding a new LAB extraction recipe = append a `target` object. No code change.
