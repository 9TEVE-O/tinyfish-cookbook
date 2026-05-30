# web-extractor — LAB Music Management

A config-driven web-extractor for **LAB Music Management**, built on
[TinyFish](https://tinyfish.ai/). It pulls live web data relevant to a music
management business — artist press, streaming/playlist placements, tour dates,
and clean page extraction — and exposes it two ways:

- a **Node server** (`/node`) with a small HTTP API, and
- a **Python CLI pipeline** (`/python`) for scripted/batch runs.

Both read the **same JSON config profile** (`config/lab.json`), so adjusting what
gets extracted later means editing config — not code.

> ⚠️ This recipe is being tailored to LAB's specific sources and output schema.
> The targets in `config/lab.json` are sensible starting points and are meant to
> be edited. See [`config/schema.md`](config/schema.md).

## Quick start

```bash
# 1. Copy env file and add your (new, rotated) TinyFish key
cp web-extractor/.env.example web-extractor/.env

# 2. Node.js server
cd web-extractor/node
npm install
npx playwright install chromium
npm start          # → http://localhost:3000

# 3. Python (optional, for CLI pipeline)
cd web-extractor/python
pip install -r requirements.txt
playwright install chromium
python pipeline.py "AI browser automation" --limit 5
```

Get a key at [agent.tinyfish.ai](https://agent.tinyfish.ai/) — Search and Fetch
are free. **Never commit your real `.env`.**

## How it's configured

Everything LAB-specific lives in [`config/lab.json`](config/lab.json). Each
**target** is one extraction recipe with an `engine`:

| Engine    | TinyFish endpoint        | Use for                                   |
|-----------|--------------------------|-------------------------------------------|
| `search`  | `api.search.tinyfish.ai` | Fast structured web search (free)         |
| `fetch`   | `api.fetch.tinyfish.ai` | Any URL → clean markdown/JSON/HTML (free) |
| `agent`   | `agent.tinyfish.ai`      | URL + natural-language goal → JSON        |
| `browser` | managed browser (CDP)    | Custom Playwright scripts (Node only)     |

Targets can contain `{{placeholders}}` (e.g. `{{artist}}`, `{{url}}`) filled at
run time. Add a new extraction recipe by appending a target object — no code
change. Full schema: [`config/schema.md`](config/schema.md).

To point at a different profile, set `EXTRACTOR_PROFILE` in `.env` and add a
matching `config/<name>.json`.

## Node server API

| Method & path        | Description                                            |
|----------------------|--------------------------------------------------------|
| `GET /health`        | Liveness + active profile                              |
| `GET /targets`       | List configured targets                                |
| `GET /search?q=&limit=` | Ad-hoc TinyFish search passthrough                  |
| `POST /extract/:id`  | Run a target; body `{ "variables": { "artist": "…" } }` |

```bash
curl -X POST http://localhost:3000/extract/artist-press \
  -H "Content-Type: application/json" \
  -d '{"variables": {"artist": "The Maccabees"}}'
```

## Python CLI

```bash
python pipeline.py --list                                   # show targets
python pipeline.py "music industry news" --limit 5          # free-text search
python pipeline.py --target artist-press --var artist="Foals"
python pipeline.py --target page-extract --var url=https://example.com
```

## Layout

```
web-extractor/
├── .env.example          # required env vars (copy to .env)
├── config/
│   ├── lab.json          # ← LAB-specific, adjustable extraction profile
│   └── schema.md         # profile schema reference
├── node/                 # Express server + TinyFish client
│   ├── server.js
│   └── lib/{tinyfish,config,extractor}.js
└── python/               # CLI pipeline + TinyFish client
    ├── pipeline.py
    ├── tinyfish_client.py
    └── config.py
```
