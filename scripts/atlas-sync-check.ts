#!/usr/bin/env tsx
/**
 * Atlas sync check — fails when the Project Atlas reference cards drift
 * away from the codebase.
 *
 * Compares:
 *   - Pages in `src/pages/` vs cards in `Project Atlas/01-Currently Implemented/pages/`
 *   - Edge functions in `supabase/functions/` vs cards in `Project Atlas/01-Currently Implemented/edge-functions/`
 *   - Tables in `src/integrations/supabase/types.ts` vs cards in `Project Atlas/01-Currently Implemented/database-tables/`
 *
 * Exit codes:
 *   0 — Atlas is in sync.
 *   1 — Drift found. Missing or orphaned cards are listed by name.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = process.cwd();
const ATLAS_BASE = join(REPO_ROOT, "Project Atlas", "01-Currently Implemented");
const ALLOWLIST_PATH = join(REPO_ROOT, "Project Atlas", ".atlas-sync-allowlist.json");

type Drift = {
  domain: string;
  missingCards: string[];
  orphanedCards: string[];
  staleAllowlist: string[];
};

type Allowlist = {
  pages: string[];
  "edge-functions": string[];
  "database-tables": string[];
};

function loadAllowlist(): Allowlist {
  const empty: Allowlist = { pages: [], "edge-functions": [], "database-tables": [] };
  if (!existsSync(ALLOWLIST_PATH)) return empty;
  const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  const extract = (node: unknown): string[] => {
    if (Array.isArray(node)) return node.filter((x) => typeof x === "string");
    if (node && typeof node === "object" && Array.isArray((node as { entries?: unknown }).entries)) {
      return ((node as { entries: unknown[] }).entries).filter((x): x is string => typeof x === "string");
    }
    return [];
  };
  return {
    pages: extract(raw.pages),
    "edge-functions": extract(raw["edge-functions"]),
    "database-tables": extract(raw["database-tables"]),
  };
}

const ALLOWLIST = loadAllowlist();

function applyAllowlist(domain: keyof Allowlist, orphans: string[]): { orphans: string[]; stale: string[] } {
  const allowed = new Set(ALLOWLIST[domain]);
  const orphanSet = new Set(orphans);
  const remaining = orphans.filter((o) => !allowed.has(o));
  const stale = [...allowed].filter((a) => !orphanSet.has(a)).sort();
  return { orphans: remaining, stale };
}

/* -------------------------------------------------------------------------- */
/*  Pages                                                                      */
/* -------------------------------------------------------------------------- */

// Special source → card overrides for pages whose card name does not follow
// the simple `<lowercased-component-without-Page>.md` rule.
const PAGE_CARD_OVERRIDES: Record<string, string> = {
  "share/PublicBriefPage.tsx": "share-brief.md",
};

function listSourcePages(): string[] {
  const root = join(REPO_ROOT, "src", "pages");
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = relative(root, full);
      if (entry === "__tests__") continue;
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith(".tsx")) continue;
      out.push(rel);
    }
  }
  walk(root);
  return out;
}

function expectedPageCard(relTsx: string): string {
  if (PAGE_CARD_OVERRIDES[relTsx]) return PAGE_CARD_OVERRIDES[relTsx];
  const parts = relTsx.split("/");
  const file = parts.pop()!;
  const base = file.replace(/\.tsx$/, "").replace(/Page$/, "");
  const cardName = base.toLowerCase() + ".md";
  return [...parts.map((p) => p.toLowerCase()), cardName].join("/");
}

function listPageCards(): string[] {
  const root = join(ATLAS_BASE, "pages");
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = relative(root, full);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith(".md") || entry === "README.md") continue;
      out.push(rel);
    }
  }
  walk(root);
  return out;
}

function checkPages(): Drift {
  const sourcePages = listSourcePages();
  const expected = new Set(sourcePages.map(expectedPageCard));
  const actual = new Set(listPageCards());

  const missingCards = [...expected].filter((c) => !actual.has(c)).sort();
  const rawOrphans = [...actual].filter((c) => !expected.has(c)).sort();
  const { orphans: orphanedCards, stale: staleAllowlist } = applyAllowlist("pages", rawOrphans);
  return { domain: "pages", missingCards, orphanedCards, staleAllowlist };
}

/* -------------------------------------------------------------------------- */
/*  Edge functions                                                            */
/* -------------------------------------------------------------------------- */

function listSourceEdgeFunctions(): string[] {
  const root = join(REPO_ROOT, "supabase", "functions");
  return readdirSync(root)
    .filter((entry) => {
      const full = join(root, entry);
      if (!statSync(full).isDirectory()) return false;
      if (entry.startsWith("_")) return false;
      return true;
    })
    .sort();
}

function listEdgeFunctionCards(): string[] {
  const root = join(ATLAS_BASE, "edge-functions");
  return readdirSync(root)
    .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
    .map((entry) => entry.replace(/\.md$/, ""))
    .sort();
}

function checkEdgeFunctions(): Drift {
  const expected = new Set(listSourceEdgeFunctions());
  const actual = new Set(listEdgeFunctionCards());
  const missingCards = [...expected]
    .filter((c) => !actual.has(c))
    .map((c) => `${c}.md`)
    .sort();
  const rawOrphans = [...actual]
    .filter((c) => !expected.has(c))
    .map((c) => `${c}.md`)
    .sort();
  const { orphans: orphanedCards, stale: staleAllowlist } = applyAllowlist(
    "edge-functions",
    rawOrphans,
  );
  return { domain: "edge-functions", missingCards, orphanedCards, staleAllowlist };
}

/* -------------------------------------------------------------------------- */
/*  Database tables                                                           */
/* -------------------------------------------------------------------------- */

function readTypesFile(): string {
  const path = join(REPO_ROOT, "src", "integrations", "supabase", "types.ts");
  const buf = readFileSync(path);
  // The generated file is UTF-16 LE with a BOM.
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  return buf.toString("utf8");
}

function listSourceTables(): string[] {
  const text = readTypesFile();
  const lines = text.split(/\r?\n/);
  const tables: string[] = [];
  let inTables = false;
  let depth = 0;
  for (const line of lines) {
    if (!inTables) {
      if (/^\s{4}Tables:\s*\{/.test(line)) {
        inTables = true;
        depth = 1;
      }
      continue;
    }
    // Track brace depth to know when the Tables: { ... } block closes.
    for (const ch of line) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth <= 0) {
      inTables = false;
      continue;
    }
    // Top-level table entries are indented exactly 6 spaces inside Tables: { … }.
    const m = line.match(/^\s{6}([a-z_][a-z0-9_]*):\s*\{$/);
    if (m) tables.push(m[1]);
  }
  return tables.sort();
}

function listTableCards(): string[] {
  const root = join(ATLAS_BASE, "database-tables");
  return readdirSync(root)
    .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
    .map((entry) => entry.replace(/\.md$/, ""))
    .sort();
}

function checkTables(): Drift {
  const expected = new Set(listSourceTables());
  const actual = new Set(listTableCards());
  const missingCards = [...expected]
    .filter((c) => !actual.has(c))
    .map((c) => `${c}.md`)
    .sort();
  const rawOrphans = [...actual]
    .filter((c) => !expected.has(c))
    .map((c) => `${c}.md`)
    .sort();
  const { orphans: orphanedCards, stale: staleAllowlist } = applyAllowlist(
    "database-tables",
    rawOrphans,
  );
  return { domain: "database-tables", missingCards, orphanedCards, staleAllowlist };
}

/* -------------------------------------------------------------------------- */
/*  Reporter                                                                  */
/* -------------------------------------------------------------------------- */

function report(drifts: Drift[]): boolean {
  let clean = true;
  for (const d of drifts) {
    const hasDrift =
      d.missingCards.length > 0 ||
      d.orphanedCards.length > 0 ||
      d.staleAllowlist.length > 0;
    if (!hasDrift) {
      console.log(`✓ ${d.domain}: in sync`);
      continue;
    }
    clean = false;
    console.log(`✗ ${d.domain}: drift detected`);
    if (d.missingCards.length > 0) {
      console.log(
        `  Missing cards (exist in code, no Atlas card in 01-Currently Implemented/${d.domain}/):`,
      );
      for (const m of d.missingCards) console.log(`    - ${m}`);
    }
    if (d.orphanedCards.length > 0) {
      console.log(
        `  Orphaned cards (Atlas card in 01-Currently Implemented/${d.domain}/ has no source in the repo):`,
      );
      for (const o of d.orphanedCards) console.log(`    - ${o}`);
    }
    if (d.staleAllowlist.length > 0) {
      console.log(
        `  Stale allowlist entries in Project Atlas/.atlas-sync-allowlist.json (no longer needed — please remove):`,
      );
      for (const s of d.staleAllowlist) console.log(`    - ${s}`);
    }
  }
  return clean;
}

function main() {
  const drifts: Drift[] = [checkPages(), checkEdgeFunctions(), checkTables()];
  const clean = report(drifts);
  if (!clean) {
    console.error(
      "\nAtlas is out of sync with the codebase. Add the missing cards under " +
        "`Project Atlas/01-Currently Implemented/`, or remove the orphaned cards " +
        "(or move them to `02-Planned/` or `03-Ideas/` if they describe future work).",
    );
    process.exit(1);
  }
  console.log("\nProject Atlas is in sync with the codebase.");
}

main();
