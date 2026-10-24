# Qloo Cultural Taste Agent - Technical Report

**Competition:** Qloo Agentic Hackathon  
**Team:** Tingqiu Liu (@liutingqiu)  
**Repository:** https://github.com/liutingqiu/qloo-cultural-taste-agent  
**Runtime:** Node 26, TypeScript 5.6.3 compiled to ESM, no frameworks

---

## 1. What changed and why

The submitted version described "Cross-Domain Cultural Intelligence & Qloo Taste Graph Grounding"
but contained no HTTP call at all. `QlooClient` answered from a `CURATED_TASTE_GRAPH` constant -
eight hand-written entities with invented `vibeVectors` fields, an `apiKey` defaulting to the
string `qloo_hackathon_agent_key_2026`, and a scoring function that did arithmetic on those
constants. It could not return a 401, could not time out, and could not be wrong.

This version removes that constant entirely. Every recommendation is an entity id and affinity
score that the Qloo API returned.

## 2. Integration surface

Facts taken from the hackathon developer guide and honoured in the client:

| Fact | Implementation |
| --- | --- |
| Hackathon base URL is `https://hackathon.api.qloo.com` | `DEFAULT_BASE_URL`; staging and production URLs are not used |
| `/v2/insights` is a GET with query parameters | parameters built into `URL.searchParams`, never a POST body |
| Auth via `X-Api-Key` or `Authorization: Bearer` | both headers sent; a 401/403 raises `QlooAuthError` before any retry |
| `/search` resolves names to entity ids | `search(query, type, take)` with `types=urn:entity:<type>` |
| `/v2/tags` supplies valid tag ids | `tags(query)` |
| `/recommendations` and `/recs` are legacy | not referenced anywhere in the code |

Supported filter types are enumerated (`artist`, `book`, `brand`, `locality`, `movie`, `person`,
`place`, `podcast`, `tv_show`, `videogame`) and mapped to their `urn:entity:*` values in `DOMAIN_URN`.

## 3. Behaviour under failure

Implemented and covered by tests:

* **No key** - `QlooAuthError` before the socket opens. The agent returns an error result, not an
  empty-but-successful answer.
* **401/403** - `QlooAuthError`, no retry (retrying a bad key only burns the quota).
* **429 or 5xx** - retried up to `maxRetries` with `Retry-After` honoured when present, otherwise
  250 ms doubling plus up to 120 ms jitter. Every attempt is recorded with its status and duration.
* **Other 4xx** - `QlooHttpError` with status and body excerpt, surfaced in `errors`.
* **Timeout** - 12 s `AbortController` per attempt.

## 4. Response parsing

The envelope is not identical across `/search` and `/v2/insights`, so `normalise()` reads the
candidates in order (`entities`, `results`, `data`, `items`), pulls `entity_id | id | urn` and
`name | properties.name | label`, and keeps the whole raw record on each entity. Affinity is read
from `affinity | score | relevance`. Unknown fields survive into `entity.raw` rather than being
dropped, which is what makes the parser safe to point at the real API without a schema snapshot.

## 5. Agent pipeline

`TasteAgent.recommend()` performs one seed resolution, then one `/v2/insights` call per (target
domain x seed), merges results by `domain:id` keeping the highest affinity, sorts descending, and
records a trace step per call with `ok`, `entityCount` and `durationMs`. A failed step is recorded
and skipped; it does not abort the run or fabricate a row.

## 6. Measured run

Executed against `scripts/contract-server.mjs` on 2026-10-24 (Node 26, local loopback), because the
hackathon key request was submitted today and keys are issued over a few business days:

| Metric | Value |
| --- | --- |
| Seed entities resolved | 1 |
| Recommendations returned | 8 (artist 2, place 3, movie 3) |
| HTTP requests | 4 |
| Retries | 0 |
| Status codes | 200 |
| Latency p50 / p95 / max | 57 ms / 62 ms / 62 ms |
| Wall clock | 214 ms |
| Tests | 7 passed |

These latencies measure the client, the retry logic and the parser against a local socket with a
35 ms injected delay. They are not Qloo network latencies and are not presented as such.

## 7. What the contract server is and is not

`scripts/contract-server.mjs` is a transport fixture: it implements `/search`, `/v2/insights` and
`/v2/tags` with the documented envelope, key checking, 401/404 paths, and optional latency and
429 injection. It exists so auth handling, retries, timeouts, parsing and merging can be tested
without a key, and so a judge can rerun everything offline.

It is **not** a data source for the submission. The fixture holds a few dozen entities and exists
to exercise code paths. When the hackathon key arrives, the same binary runs with
`QLOO_BASE_URL` unset and a real `QLOO_API_KEY`; nothing in `src/` changes.

## 8. Limitations

* No live Qloo run yet - key pending. The integration is complete and testable, the data is not real.
* No relevance evaluation: there is no labelled set of "correct" cross-domain pairs, so this report
  gives transport and pipeline metrics, not recommendation quality.
* Affinity is used as returned. No calibration or normalisation is applied across domains, so a
  movie score and a place score are not directly comparable even though the UI sorts them together.
* MCP tools are defined and callable, but no client has been tested against them beyond unit level.
