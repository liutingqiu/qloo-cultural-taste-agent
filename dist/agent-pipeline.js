/**
 * Taste agent pipeline: resolve signals, ask Qloo for cross-domain affinity,
 * aggregate the answers, and keep a trace of every request that produced them.
 *
 * Every recommendation carries the Qloo entity id and the affinity score the
 * API returned for it. Nothing is scored locally.
 */
function uniqueById(entities) {
    const seen = new Map();
    for (const entity of entities) {
        const key = entity.id || entity.name;
        if (!seen.has(key))
            seen.set(key, entity);
    }
    return [...seen.values()];
}
export class TasteAgent {
    client;
    requests = [];
    constructor(client) {
        this.client = client;
    }
    get configured() {
        return this.client.configured;
    }
    recordRequests = (record) => {
        this.requests.push(record);
    };
    /** Same array the result carries, exposed for the CLI. */
    get requestLog() {
        return this.requests;
    }
    async time(step, domain, fn, count) {
        const started = Date.now();
        try {
            const value = await fn();
            return { step: { step, domain, ok: true, entityCount: count(value), durationMs: Date.now() - started }, value };
        }
        catch (error) {
            return {
                step: {
                    step,
                    domain,
                    ok: false,
                    entityCount: 0,
                    durationMs: Date.now() - started,
                    detail: error instanceof Error ? error.message.slice(0, 220) : String(error),
                },
            };
        }
    }
    /** Thin passthroughs used by the MCP tools, kept here so every call is traced. */
    async searchOnly(query, type) {
        return this.client.search(query, type, 5);
    }
    async insightsOnly(signalEntityId, filterType, take = 10) {
        return this.client.insights({ filterType, signEntities: [signalEntityId], take });
    }
    async recommend(request) {
        const trace = [];
        const errors = [];
        const take = request.take ?? 10;
        const seedRun = await this.time('search.seeds', request.seedDomain, () => this.client.search(request.description, request.seedDomain, 3), (entities) => entities.length);
        trace.push(seedRun.step);
        const seeds = uniqueById(seedRun.value ?? []);
        if (!seeds.length) {
            errors.push(seedRun.step.detail ?? 'no seed entity resolved for the description');
            return { query: request, seeds: [], recommendations: [], trace, requests: [...this.requests], errors };
        }
        const pooled = new Map();
        for (const domain of request.targetDomains) {
            for (const seed of seeds) {
                const label = 'insights.' + domain + '<-' + (seed.name || seed.id);
                const run = await this.time(label, domain, () => this.client.insights({ filterType: domain, signEntities: [seed.id], take }), (entities) => entities.length);
                trace.push(run.step);
                if (!run.step.ok) {
                    if (run.step.detail)
                        errors.push(run.step.detail);
                    continue;
                }
                for (const entity of run.value ?? []) {
                    const key = domain + ':' + entity.id;
                    const candidate = {
                        domain,
                        id: entity.id,
                        name: entity.name,
                        affinity: entity.affinity,
                        tags: entity.tags,
                        viaSeed: seed.id,
                    };
                    const existing = pooled.get(key);
                    if (!existing || (candidate.affinity ?? -1) > (existing.affinity ?? -1)) {
                        pooled.set(key, candidate);
                    }
                }
            }
        }
        const recommendations = [...pooled.values()].sort((a, b) => {
            const diff = (b.affinity ?? -1) - (a.affinity ?? -1);
            return diff !== 0 ? diff : a.name.localeCompare(b.name);
        });
        return { query: request, seeds, recommendations, trace, requests: [...this.requests], errors };
    }
}
export function summarise(result) {
    const durations = result.requests.map((request) => request.durationMs).sort((a, b) => a - b);
    const pct = (p) => durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] : null;
    const byDomain = {};
    for (const rec of result.recommendations) {
        byDomain[rec.domain] = (byDomain[rec.domain] ?? 0) + 1;
    }
    return {
        seeds: result.seeds.length,
        recommendations: result.recommendations.length,
        byDomain,
        requests: result.requests.length,
        retries: result.requests.filter((request) => request.attempt > 0).length,
        httpStatuses: [...new Set(result.requests.map((request) => request.status))].sort((a, b) => a - b),
        latencyMs: {
            p50: pct(0.5),
            p95: pct(0.95),
            max: durations.length ? durations[durations.length - 1] : null,
        },
        errors: result.errors,
    };
}
