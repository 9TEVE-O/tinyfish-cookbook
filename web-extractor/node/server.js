import "dotenv/config";
import express from "express";
import { TinyFishClient } from "./lib/tinyfish.js";
import { loadProfile, getTarget } from "./lib/config.js";
import { runTarget } from "./lib/extractor.js";

const app = express();
app.use(express.json());

const profile = loadProfile();
const client = new TinyFishClient();

// Health / profile introspection.
app.get("/health", (_req, res) => res.json({ ok: true, profile: profile.profile }));

app.get("/targets", (_req, res) =>
  res.json({
    org: profile.org,
    targets: profile.targets.map(({ id, label, engine }) => ({ id, label, engine })),
  })
);

// Run one target: POST /extract/:id  { "variables": { "artist": "..." } }
app.post("/extract/:id", async (req, res) => {
  try {
    const target = getTarget(profile, req.params.id);
    const out = await runTarget(client, profile, target, req.body?.variables || {});
    res.json(out);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ad-hoc search passthrough: GET /search?q=...&limit=5
app.get("/search", async (req, res) => {
  try {
    const data = await client.search(req.query.q || "", {
      limit: Number(req.query.limit) || profile.defaults.searchLimit || 5,
    });
    res.json({ query: req.query.q, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`LAB web-extractor [${profile.profile}] → http://localhost:${port}`);
  console.log(`Targets: ${profile.targets.map((t) => t.id).join(", ")}`);
});
