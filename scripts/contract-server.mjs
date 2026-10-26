/**
 * Contract server for the Qloo Insights API.
 *
 * Purpose: exercise the real transport path (HTTP, query strings, auth header,
 * status codes, retry, parsing) without a hackathon key. The response shapes
 * mirror the documented envelope (entities[] with entity_id/name/affinity/tags)
 * so a parser that works here keeps working against hackathon.api.qloo.com.
 *
 * This is a transport fixture, not a data source: it answers from a small frozen
 * JSON file and refuses anything it was not built to answer.
 *
 * Usage: node scripts/contract-server.mjs --port 8787 [--latency 40] [--fail-first 2]
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(here, "contract-fixtures.json"), "utf8"));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf("--" + name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const PORT = flag("port", 8787);
const LATENCY = flag("latency", 0);
let FAIL_FIRST = flag("fail-first", 0);

const EXPECTED_KEY = process.env.QLOO_CONTRACT_KEY ?? "contract-test-key";

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

function authorised(req) {
  const headerKey = req.headers["x-api-key"];
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  return headerKey === EXPECTED_KEY || bearer === EXPECTED_KEY;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (LATENCY) await new Promise((resolve) => setTimeout(resolve, LATENCY));

  if (url.pathname === "/health") return send(res, 200, { ok: true });

  if (FAIL_FIRST > 0) {
    FAIL_FIRST -= 1;
    return send(res, 429, { error: "rate_limited", retry_after_seconds: 0 });
  }

  if (!authorised(req)) return send(res, 401, { error: "invalid_api_key" });

  if (url.pathname === "/search") {
    const query = (url.searchParams.get("query") ?? "").toLowerCase();
    const types = url.searchParams.get("types") ?? "";
    const take = Number(url.searchParams.get("take") ?? 5);
    const entityType = types.replace("urn:entity:", "");
    const pool = fixtures.search[entityType] ?? [];
    const matched = pool.filter((item) => query.includes(item.slug) || item.slug.includes(query) || query.includes(item.name.toLowerCase()));
    return send(res, 200, { entities: (matched.length ? matched : pool).slice(0, take) });
  }

  if (url.pathname === "/v2/insights") {
    const filterType = (url.searchParams.get("filter.type") ?? "").replace("urn:entity:", "");
    const signals = (url.searchParams.get("signal.interests.entities") ?? "").split(",").filter(Boolean);
    const take = Number(url.searchParams.get("take") ?? 10);
    const rows = [];
    for (const signal of signals) {
      const bucket = fixtures.insights[filterType] ?? [];
      for (const item of bucket) {
        const seedBoost = fixtures.affinity[signal]?.[item.entity_id] ?? 0;
        rows.push({
          entity_id: item.entity_id,
          name: item.name,
          type: "urn:entity:" + filterType,
          affinity: Math.min(0.99, Number((item.base_affinity + seedBoost).toFixed(4))),
          tags: item.tags,
          properties: { name: item.name, type: "urn:entity:" + filterType },
        });
      }
    }
    rows.sort((a, b) => b.affinity - a.affinity);
    return send(res, 200, { entities: rows.slice(0, take) });
  }

  if (url.pathname === "/v2/tags") {
    // The documented parameter is filter.query; a bare query= is rejected upstream,
    // so the fixture accepts it only as a legacy fallback.
    const raw = url.searchParams.get("filter.query") ?? url.searchParams.get("query") ?? "";
    if (!url.searchParams.get("filter.query") && !url.searchParams.get("query")) {
      return send(res, 400, { errors: [{ message: "At least one of the following parameters must be provided: filter.query" }] });
    }
    const query = raw.toLowerCase();
    const matched = fixtures.tags.filter((tag) => tag.name.toLowerCase().includes(query) || query.includes(tag.name.toLowerCase()));
    return send(res, 200, { success: true, results: { tags: matched } });
  }

  return send(res, 404, { error: "no_route", path: url.pathname });
});

server.listen(PORT, () => {
  console.log("contract server listening on http://127.0.0.1:" + PORT + " latency=" + LATENCY + "ms");
});
