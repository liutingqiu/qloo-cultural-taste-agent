/**
 * Tests run against scripts/contract-server.mjs over real HTTP: real sockets,
 * real status codes, real retry timing. The fixture only replaces the upstream
 * data source, which is the part that needs a hackathon key.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const PORT = 8787 + Math.floor(Math.random() * 200);
const BASE = "http://127.0.0.1:" + PORT;
const KEY = "contract-test-key";

async function startServer(extraArgs = []) {
  const child = spawn(process.execPath, ["scripts/contract-server.mjs", "--port", String(PORT), ...extraArgs], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(BASE + "/health");
      if (res.ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("contract server did not start");
}

async function stopServer(child) {
  child.kill();
  await once(child, "exit");
}

const { QlooClient, QlooAuthError, QlooHttpError, TasteAgent } = await import("../dist/index.js");

test("client refuses to call without a key", async () => {
  const client = new QlooClient({ apiKey: "", baseUrl: BASE });
  assert.equal(client.configured, false);
  await assert.rejects(() => client.search("shoegaze", "artist"), QlooAuthError);
});

test("rejects a bad key as an auth error, not a retry loop", async () => {
  const child = await startServer();
  try {
    const client = new QlooClient({ apiKey: "wrong-key", baseUrl: BASE, maxRetries: 2 });
    await assert.rejects(() => client.search("shoegaze", "artist"), QlooAuthError);
  } finally {
    await stopServer(child);
  }
});

test("retries a 429 and then succeeds", async () => {
  const child = await startServer(["--fail-first", "2"]);
  try {
    const calls = [];
    const client = new QlooClient({
      apiKey: KEY,
      baseUrl: BASE,
      maxRetries: 3,
      onRequest: (record) => calls.push(record),
    });
    const entities = await client.insights({ filterType: "movie", signEntities: ["qloo:artist:mbv"], take: 3 });
    assert.ok(entities.length > 0);
    assert.equal(calls.filter((call) => call.status === 429).length, 2);
    assert.equal(calls.at(-1).status, 200);
    assert.ok(calls.at(-1).attempt >= 2);
  } finally {
    await stopServer(child);
  }
});

test("parses entities, keeps unknown fields, sorts by affinity", async () => {
  const child = await startServer();
  try {
    const client = new QlooClient({ apiKey: KEY, baseUrl: BASE });
    const entities = await client.insights({ filterType: "movie", signEntities: ["qloo:artist:mbv"], take: 5 });
    assert.ok(entities.length >= 2);
    const affinities = entities.map((entity) => entity.affinity);
    assert.deepEqual(affinities, [...affinities].sort((a, b) => b - a));
    assert.ok(entities[0].id.startsWith("qloo:movie:"));
    assert.ok(Array.isArray(entities[0].tags));
    assert.ok(entities[0].raw && typeof entities[0].raw === "object");
  } finally {
    await stopServer(child);
  }
});

test("surfaces a 404 as QlooHttpError with status", async () => {
  const child = await startServer();
  try {
    const client = new QlooClient({ apiKey: KEY, baseUrl: BASE, maxRetries: 0 });
    await assert.rejects(
      () => client.request("/v2/unknown", {}),
      (error) => error instanceof QlooHttpError && error.status === 404,
    );
  } finally {
    await stopServer(child);
  }
});

test("agent resolves seeds, queries every target domain, and traces each call", async () => {
  const child = await startServer();
  try {
    let agent;
    const client = new QlooClient({
      apiKey: KEY,
      baseUrl: BASE,
      onRequest: (record) => agent.recordRequests(record),
    });
    agent = new TasteAgent(client);
    const result = await agent.recommend({
      description: "shoegaze",
      seedDomain: "artist",
      targetDomains: ["movie", "place"],
      take: 5,
    });
    assert.ok(result.seeds.length > 0, "seed resolution must return entities");
    assert.ok(result.recommendations.length > 0);
    assert.equal(result.requests.length, result.seeds.length * 2 + 1);
    const domains = new Set(result.recommendations.map((rec) => rec.domain));
    assert.deepEqual([...domains].sort(), ["movie", "place"]);
    assert.ok(result.trace.every((step) => step.ok));
    assert.ok(result.trace.some((step) => step.step.startsWith("search.seeds")));
    for (const rec of result.recommendations) {
      assert.ok(rec.id.length > 0);
      assert.equal(typeof rec.affinity, "number");
    }
  } finally {
    await stopServer(child);
  }
});

test("agent reports an error instead of inventing entities when search is empty", async () => {
  const child = await startServer();
  try {
    const client = new QlooClient({ apiKey: KEY, baseUrl: BASE });
    const agent = new TasteAgent(client);
    const result = await agent.recommend({
      description: "zzz-no-such-entity",
      seedDomain: "artist",
      targetDomains: ["movie"],
    });
    assert.ok(result.trace.length >= 1);
    assert.equal(typeof result.errors, "object");
  } finally {
    await stopServer(child);
  }
});
