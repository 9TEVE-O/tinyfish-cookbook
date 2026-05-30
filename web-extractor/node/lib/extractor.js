import { fillPlaceholders, projectOutput } from "./config.js";

/**
 * Run one config-defined target against TinyFish and return normalised data.
 * Generic on purpose: behaviour comes from the profile, not this code.
 */
export async function runTarget(client, profile, target, overrides = {}) {
  const limit = target.limit ?? profile.defaults.searchLimit ?? 5;
  const fmt = profile.defaults.fetchFormat ?? "markdown";

  switch (target.engine) {
    case "search": {
      const query = fillPlaceholders(target.query, profile, overrides);
      const results = await client.search(query, { limit });
      const mapped = results.map((r) => ({
        title: r.title || r.name || "",
        url: r.url || r.link || "",
        snippet: r.snippet || r.description || "",
        publishedAt: r.publishedAt || r.date || null,
      }));
      return { target: target.id, engine: "search", query, data: projectOutput(target, mapped) };
    }

    case "fetch": {
      const url = fillPlaceholders(target.url, profile, overrides);
      const page = await client.fetchUrl(url, { format: fmt });
      return { target: target.id, engine: "fetch", url, data: projectOutput(target, page) };
    }

    case "agent": {
      const url = fillPlaceholders(target.url, profile, overrides);
      const goal = fillPlaceholders(target.goal, profile, overrides);
      const { result } = await client.agentRun(url, goal);
      return { target: target.id, engine: "agent", url, goal, data: projectOutput(target, result) };
    }

    case "browser": {
      const url = fillPlaceholders(target.url, profile, overrides);
      const data = await client.withBrowser(async (page) => {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        return { url, title: await page.title() };
      });
      return { target: target.id, engine: "browser", url, data: projectOutput(target, data) };
    }

    default:
      throw new Error(`Unknown engine "${target.engine}" for target "${target.id}".`);
  }
}
