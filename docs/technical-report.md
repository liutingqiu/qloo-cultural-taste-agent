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

## 6. Measured run (live)

Executed against the hackathon API with the issued key on 2026-10-26:

    QLOO_API_KEY=... npm run cli -- --description "shoegaze" --seed artist \
      --domains artist,movie,place --take 4 --out runs/live2

| Metric | Value |
| --- | --- |
| Endpoint | https://hackathon.api.qloo.com |
| Tags resolved | 4, first is urn:tag:genre:music:shoegaze |
| Seed entities | 1 |
| Recommendations | 12 (artist 4, movie 4, place 4) |
| HTTP requests | 5 (tags, search, three insights) |
| Retries | 1, a 429 retried under the configured policy |
| Status codes | 200 |
| Latency p50 / p95 | 4963 ms / 9192 ms |
| Wall clock | 35.9 s |
| Tests | 7 passed |

The output is culturally coherent rather than random. The artist bucket returned 東京酒吐座, Burrrn,
Shojoskip and Tatuki Seksu - the Japanese shoegaze scene. The movie bucket returned Love Exposure,
After the Storm, A Bride for Rip Van Winkle and Shoplifters - Sion Sono and Hirokazu Kore-eda. The
place bucket returned live-music rooms such as Thalia Hall and Union Transfer. Nothing in this
repository knows those names; they are the API's answers to a tag signal.

## 7. What the live run changed

Four things only a real key could reveal, each a bug in the pre-key code:

1. **`/v2/insights` nests its payload.** The envelope is `{"success": true, "results": {"entities": [...]}}`,
   not a top-level array. The parser had to descend into `results.entities`.
2. **Affinity lives in `query.affinity`**, per entity, not at the top level. Before the fix every
   score was null and the ranking fell back to alphabetical order.
3. **`/search` matches names, not concepts.** "shoegaze and slow cinema" resolved to acts literally
   named Cinema, which then produced airport and museum recommendations. `/v2/tags` with
   `filter.query` understands genre vocabulary, so tags are resolved first and passed as
   `signal.interests.tags` alongside any entity signals. This is the difference between a plausible
   demo and a useful one.
4. **`/v2/tags` requires `filter.query`.** A bare `query=` returns 400 listing the accepted parameters.

## 8. Scope after the key arrived

The contract server stays in the repository as the offline fixture (the 7 tests run against it) and
now mirrors the live envelope. The recorded run on the project page is the live one: `data/` holds
artifacts with `"endpoint": "qloo-hackathon-api"`.

Still true, and stated rather than hidden:

* No relevance benchmark. The output is inspectable and coherent, but there is no labelled set
  against which to compute precision.
* Affinity is returned unnormalised across domains; a place score and a movie score are not
  directly comparable even though the UI sorts them together.
* Tag resolution depends on the free-text description; a vague query still yields vague tags.
* MCP tools are defined and callable, but no client has been tested against them beyond unit level.
