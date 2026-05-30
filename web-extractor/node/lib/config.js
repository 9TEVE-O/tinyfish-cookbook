import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, "..", "..", "config");

/** Load a profile (default from EXTRACTOR_PROFILE, else "lab"). */
export function loadProfile(name = process.env.EXTRACTOR_PROFILE || "lab") {
  const path = resolve(CONFIG_DIR, `${name}.json`);
  const profile = JSON.parse(readFileSync(path, "utf8"));
  profile.targets ||= [];
  profile.variables ||= {};
  profile.defaults ||= {};
  return profile;
}

/** Find a single target by id. */
export function getTarget(profile, id) {
  const t = profile.targets.find((x) => x.id === id);
  if (!t) {
    const ids = profile.targets.map((x) => x.id).join(", ");
    throw new Error(`Unknown target "${id}". Available: ${ids}`);
  }
  return t;
}

/** Replace {{tokens}} using overrides first, then profile.variables. */
export function fillPlaceholders(str, profile, overrides = {}) {
  if (typeof str !== "string") return str;
  const vars = { ...profile.variables, ...overrides };
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === "") {
      throw new Error(`Missing value for {{${key}}} — pass it via variables/flags.`);
    }
    return v;
  });
}

/** Keep only the fields listed in target.output (if any). */
export function projectOutput(target, obj) {
  if (!target.output || !Array.isArray(obj) && typeof obj !== "object" || obj == null) return obj;
  const pick = (o) =>
    target.output.reduce((acc, f) => (f in o ? ((acc[f] = o[f]), acc) : acc), {});
  return Array.isArray(obj) ? obj.map(pick) : pick(obj);
}
