/**
 * Taste agent pipeline: resolve signals, ask Qloo for cross-domain affinity,
 * aggregate the answers, and keep a trace of every request that produced them.
 *
 * Every recommendation carries the Qloo entity id and the affinity score the
 * API returned for it. Nothing is scored locally.
 */

import { QlooClient, QlooDomain, QlooEntity, RequestRecord } from './qloo-client.js';

export interface TasteRequest {
  description: string;
  seedDomain: QlooDomain;
  targetDomains: QlooDomain[];
  take?: number;
}

export interface TraceStep {
  step: string;
  domain?: QlooDomain;
  ok: boolean;
  entityCount: number;
  durationMs: number;
  detail?: string;
}

export interface Recommendation {
  domain: QlooDomain;
  id: string;
  name: string;
  affinity: number | null;
  tags: string[];
  viaSeed: string;
}

export interface TasteResult {
  query: TasteRequest;
  seeds: QlooEntity[];
  recommendations: Recommendation[];
  trace: TraceStep[];
  requests: RequestRecord[];
  errors: string[];
}

function uniqueById(entities: QlooEntity[]): QlooEntity[] {
  const seen = new Map<string, QlooEntity>();
  for (const entity of entities) {
    const key = entity.id || entity.name;
    if (!seen.has(key)) seen.set(key, entity);
  }
  return [...seen.values()];
}

export class TasteAgent {
  private readonly requests: RequestRecord[] = [];

  constructor(private readonly client: QlooClient) {}

  get configured(): boolean {
    return this.client.configured;
  }

  recordRequests = (record: RequestRecord): void => {
    this.requests.push(record);
  };

  /** Same array the result carries, exposed for the CLI. */
  get requestLog(): RequestRecord[] {
    return this.requests;
  }

  private async time<T>(
    step: string,
    domain: QlooDomain | undefined,
    fn: () => Promise<T>,
    count: (value: T) => number,
  ): Promise<{ step: TraceStep; value?: T }> {
    const started = Date.now();
    try {
      const value = await fn();
      return { step: { step, domain, ok: true, entityCount: count(value), durationMs: Date.now() - started }, value };
    } catch (error) {
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
  async searchOnly(query: string, type?: QlooDomain): Promise<QlooEntity[]> {
    return this.client.search(query, type, 5);
  }

  async insightsOnly(signalEntityId: string, filterType: QlooDomain, take = 10): Promise<QlooEntity[]> {
    return this.client.insights({ filterType, signEntities: [signalEntityId], take });
  }

  async recommend(request: TasteRequest): Promise<TasteResult> {
    const trace: TraceStep[] = [];
    const errors: string[] = [];
    const take = request.take ?? 10;

    // Two signal sources, because /search matches names and a free-text taste
    // description is rarely a name: "shoegaze and slow cinema" resolves to acts
    // literally called Cinema. /v2/tags with filter.query understands genre
    // vocabulary, so tags are resolved first and used alongside any entities.
    const tagRun = await this.time(
      'tags.resolve',
      undefined,
      () => this.client.tags(request.description, 4),
      (tags) => tags.length,
    );
    trace.push(tagRun.step);
    const tagIds = (tagRun.value ?? []).map((tag) => tag.id).filter(Boolean).slice(0, 3);

    const seedRun = await this.time(
      'search.seeds',
      request.seedDomain,
      () => this.client.search(request.description, request.seedDomain, 3),
      (entities) => entities.length,
    );
    trace.push(seedRun.step);
    const seeds = uniqueById(seedRun.value ?? []);

    if (!seeds.length && !tagIds.length) {
      errors.push(seedRun.step.detail ?? 'neither entity nor tag signal resolved for the description');
      return { query: request, seeds: [], recommendations: [], trace, requests: [...this.requests], errors };
    }

    const pooled = new Map<string, Recommendation>();

    for (const domain of request.targetDomains) {
      const label = 'insights.' + domain + '<-' + (tagIds[0] ?? seeds[0]?.id ?? 'signal');
      const run = await this.time(
        label,
        domain,
        () =>
          this.client.insights({
            filterType: domain,
            signEntities: seeds.slice(0, 2).map((seed) => seed.id),
            signTags: tagIds,
            take,
          }),
        (entities) => entities.length,
      );
      trace.push(run.step);
      if (!run.step.ok) {
        if (run.step.detail) errors.push(run.step.detail);
        continue;
      }
      for (const entity of run.value ?? []) {
        const key = domain + ':' + entity.id;
        const candidate: Recommendation = {
          domain,
          id: entity.id,
          name: entity.name,
          affinity: entity.affinity,
          tags: entity.tags,
          viaSeed: tagIds[0] ?? seeds[0]?.id ?? '',
        };
        const existing = pooled.get(key);
        if (!existing || (candidate.affinity ?? -1) > (existing.affinity ?? -1)) {
          pooled.set(key, candidate);
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

export function summarise(result: TasteResult): Record<string, unknown> {
  const durations = result.requests.map((request) => request.durationMs).sort((a, b) => a - b);
  const pct = (p: number) =>
    durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] : null;
  const byDomain: Record<string, number> = {};
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
