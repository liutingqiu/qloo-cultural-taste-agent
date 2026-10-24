/**
 * CLI entry: run one taste query end to end and write the artifacts a judge can
 * re-check (result, per-request trace, latency summary).
 *
 *   node dist/cli.js --description "shoegaze and slow cinema" \
 *     --seed artist --domains movie,place --take 5 --out runs/demo
 *
 * Point QLOO_BASE_URL at scripts/contract-server.mjs to exercise the transport
 * without a hackathon key.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TasteAgent, summarise } from "./agent-pipeline.js";
import { QlooClient, QlooDomain } from "./qloo-client.js";

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf("--" + name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main(): Promise<number> {
  const description = arg("description", "shoegaze and slow cinema") as string;
  const seed = (arg("seed", "artist") as QlooDomain);
  const domains = ((arg("domains", "movie,place") as string).split(",").filter(Boolean)) as QlooDomain[];
  const take = Number(arg("take", "5"));
  const outDir = arg("out", "runs/last") as string;

  // One client, one agent: the onRequest hook feeds the same instance that
  // produces the result, so the trace and the payload cannot diverge.
  const holder: { agent?: TasteAgent } = {};
  const client = new QlooClient({
    apiKey: process.env.QLOO_API_KEY,
    baseUrl: process.env.QLOO_BASE_URL,
    onRequest: (record) => holder.agent?.recordRequests(record),
  });
  const runner = new TasteAgent(client);
  holder.agent = runner;
  const requests = runner.requestLog;

  if (!runner.configured) {
    console.error("QLOO_API_KEY is not set; nothing was requested and nothing was invented.");
    return 2;
  }

  const started = Date.now();
  const result = await runner.recommend({ description, seedDomain: seed, targetDomains: domains, take });
  const wallMs = Date.now() - started;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "result.json"), JSON.stringify(result, null, 2));
  writeFileSync(join(outDir, "requests.json"), JSON.stringify(requests, null, 2));
  const metrics = {
    ...summarise(result),
    wallMs,
    endpoint: client.isLocalEndpoint ? "contract-server" : "qloo-hackathon-api",
    baseUrl: process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com",
  };
  writeFileSync(join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));

  console.log(JSON.stringify(metrics, null, 2));
  if (!result.recommendations.length) return 1;
  return 0;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(error);
  process.exit(3);
});
