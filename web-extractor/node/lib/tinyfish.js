import fetch from "node-fetch";

const AGENT_BASE = process.env.TINYFISH_AGENT_URL || "https://agent.tinyfish.ai";
const SEARCH_BASE = process.env.TINYFISH_SEARCH_URL || "https://api.search.tinyfish.ai";
const FETCH_BASE = process.env.TINYFISH_FETCH_URL || "https://api.fetch.tinyfish.ai";

/**
 * Minimal TinyFish client covering the four endpoints this recipe uses:
 * Search, Fetch, Agent (SSE) and the managed Browser (Playwright over CDP).
 */
export class TinyFishClient {
  constructor({ apiKey, cdpUrl } = {}) {
    this.apiKey = apiKey || process.env.TINYFISH_API_KEY;
    this.cdpUrl = cdpUrl || process.env.TINYFISH_BROWSER_CDP_URL || "";
    if (!this.apiKey) {
      throw new Error("TINYFISH_API_KEY is required (set it in .env).");
    }
  }

  get headers() {
    return { "X-API-Key": this.apiKey };
  }

  /** Search → structured web results (free). */
  async search(query, { limit = 10 } = {}) {
    const url = new URL(SEARCH_BASE);
    url.searchParams.set("query", query);
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Search failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return (data.results || data.data || []).slice(0, limit);
  }

  /** Fetch → any URL to clean markdown/json/html (free). */
  async fetchUrl(url, { format = "markdown" } = {}) {
    const res = await fetch(FETCH_BASE, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url], format }),
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const first = (data.results || data.data || [data])[0] || {};
    return {
      url,
      title: first.title || "",
      content: first.content || first.markdown || first.text || "",
    };
  }

  /** Agent (SSE) → URL + natural-language goal returns structured JSON. */
  async agentRun(url, goal) {
    const res = await fetch(`${AGENT_BASE}/v1/automation/run-sse`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ url, goal }),
    });
    if (!res.ok) throw new Error(`Agent run failed: ${res.status} ${res.statusText}`);
    const text = await res.text();
    const events = [];
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (t.startsWith("data: ")) {
        try { events.push(JSON.parse(t.slice(6))); } catch { /* keepalive */ }
      }
    }
    // Prefer the last event carrying a result/output payload.
    const final = [...events].reverse().find((e) => e.result || e.output || e.data);
    return { result: final?.result ?? final?.output ?? final?.data ?? null, events };
  }

  /**
   * Browser → connect Playwright to TinyFish's managed cloud browser.
   * Pass a function `(page) => result`. Requires TINYFISH_BROWSER_CDP_URL.
   */
  async withBrowser(fn) {
    if (!this.cdpUrl) {
      throw new Error("TINYFISH_BROWSER_CDP_URL is required for the 'browser' engine.");
    }
    const { chromium } = await import("playwright");
    const browser = await chromium.connectOverCDP(this.cdpUrl);
    try {
      const context = browser.contexts()[0] || (await browser.newContext());
      const page = await context.newPage();
      return await fn(page);
    } finally {
      await browser.close();
    }
  }
}
