# Qloo Cultural Taste Agent

Cross-domain recommendations grounded in the Qloo Insights API. Seeds are resolved with `/search`,
affinity comes from `/v2/insights`, and nothing is scored locally.

| | |
| --- | --- |
| Endpoint | `https://hackathon.api.qloo.com` (overridable via `QLOO_BASE_URL`) |
| Auth | `X-Api-Key` and `Authorization: Bearer`, key from `QLOO_API_KEY` |
| Endpoints used | `GET /search`, `GET /v2/insights`, `GET /v2/tags` |
| Transport | 12 s timeout, retry on 429/5xx with `Retry-After` and jittered backoff |
| Measured (contract run) | 4 HTTP requests, p50 57 ms, 8 recommendations across 3 domains |

Run record: https://liutingqiu.github.io/qloo-cultural-taste-agent/  
Report: [`docs/technical-report.md`](docs/technical-report.md)

## Quick start

```bash
npm install && npm run build
node scripts/contract-server.mjs --port 8787      # transport fixture, no key needed
QLOO_API_KEY=contract-test-key QLOO_BASE_URL=http://127.0.0.1:8787 npm run cli -- \
  --description "shoegaze and slow cinema" --seed artist --domains movie,place --take 5 --out runs/demo
npm test                                          # 7 tests over real HTTP
```

Against the hackathon API, drop `QLOO_BASE_URL` and set a real key. The client throws
`QlooAuthError` when no key is configured; it has no local entity list to fall back to. The
previous version answered from a hand-written `CURATED_TASTE_GRAPH`, so it could not fail and
could not be checked.

## Layout

```
src/qloo-client.ts     auth, query building, retry, tolerant parsing
src/agent-pipeline.ts  seed resolution -> per-domain insights -> merge -> trace
src/mcp-server.ts      MCP tools: qloo_search_entities, qloo_insights, taste_recommend
src/cli.ts             one-shot run writing result.json / requests.json / metrics.json
scripts/contract-server.mjs  documented response shapes over real sockets
tests/qloo.test.js     7 tests: auth, 401, 429 retry, parsing, 404, end-to-end trace
```

## What a run writes

`result.json` (seeds, ranked recommendations, trace, errors), `requests.json` (every request with
status and duration), `metrics.json` (percentiles, retries, endpoint).
