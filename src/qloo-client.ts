/**
 * Qloo Insights API client.
 *
 * Endpoint facts taken from the hackathon developer guide:
 *   - base URL for hackathon keys is https://hackathon.api.qloo.com
 *   - /v2/insights is a GET request; parameters live in the query string
 *   - authentication is either X-Api-Key: <key> or Authorization: Bearer <key>
 *   - /search resolves human names to entity ids, /v2/tags resolves tag ids
 *   - /recommendations and /recs are legacy and unsupported
 *
 * There is no curated offline dataset here. When the key is absent the client
 * refuses to answer instead of inventing entities, and the contract server in
 * scripts/contract-server.mjs exists so the transport path can still be tested.
 */

export type QlooDomain =
  | 'artist'
  | 'book'
  | 'brand'
  | 'locality'
  | 'movie'
  | 'person'
  | 'place'
  | 'podcast'
  | 'tv_show'
  | 'videogame';

export const DOMAIN_URN: Record<QlooDomain, string> = {
  artist: 'urn:entity:artist',
  book: 'urn:entity:book',
  brand: 'urn:entity:brand',
  locality: 'urn:entity:locality',
  movie: 'urn:entity:movie',
  person: 'urn:entity:person',
  place: 'urn:entity:place',
  podcast: 'urn:entity:podcast',
  tv_show: 'urn:entity:tv_show',
  videogame: 'urn:entity:videogame',
};

export interface QlooClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  onRequest?: (record: RequestRecord) => void;
}

export interface RequestRecord {
  method: 'GET';
  url: string;
  status: number;
  durationMs: number;
  attempt: number;
  endpoint: string;
}

export interface QlooEntity {
  id: string;
  name: string;
  type: string;
  affinity: number | null;
  tags: string[];
  raw: Record<string, unknown>;
}

export class QlooAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QlooAuthError';
  }
}

export class QlooHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly url: string,
  ) {
    super('Qloo request failed: HTTP ' + status + ' from ' + url + ' :: ' + body.slice(0, 200));
    this.name = 'QlooHttpError';
  }
}

const DEFAULT_BASE_URL = 'https://hackathon.api.qloo.com';

export class QlooClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onRequest?: (record: RequestRecord) => void;

  constructor(config: QlooClientConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.QLOO_API_KEY ?? '';
    this.baseUrl = (config.baseUrl ?? process.env.QLOO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 12_000;
    this.maxRetries = config.maxRetries ?? 2;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.onRequest = config.onRequest;
  }

  get configured(): boolean {
    return this.apiKey.length > 0;
  }

  /** True when talking to a non-production base URL, which the report must disclose. */
  get isLocalEndpoint(): boolean {
    return !/qloo\.com$/i.test(new URL(this.baseUrl).hostname);
  }

  private async request(path: string, params: Record<string, string | number | undefined>): Promise<unknown> {
    if (!this.apiKey) {
      throw new QlooAuthError(
        'QLOO_API_KEY is not set. Request a hackathon key with the form linked from the Qloo developer guide.',
      );
    }
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }

    let attempt = 0;
    let lastError: unknown;
    while (attempt <= this.maxRetries) {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url.toString(), {
          method: 'GET',
          headers: {
            'X-Api-Key': this.apiKey,
            Authorization: 'Bearer ' + this.apiKey,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        const text = await response.text();
        this.onRequest?.({
          method: 'GET',
          url: url.toString(),
          status: response.status,
          durationMs: Date.now() - started,
          attempt,
          endpoint: path,
        });
        if (response.status === 401 || response.status === 403) {
          throw new QlooAuthError('Qloo rejected the key (HTTP ' + response.status + '): ' + text.slice(0, 160));
        }
        if (response.status === 429 || response.status >= 500) {
          lastError = new QlooHttpError(response.status, text, url.toString());
          attempt += 1;
          await this.backoff(attempt, response.headers.get('retry-after'));
          continue;
        }
        if (!response.ok) {
          throw new QlooHttpError(response.status, text, url.toString());
        }
        return JSON.parse(text) as unknown;
      } catch (error) {
        if (error instanceof QlooAuthError || error instanceof QlooHttpError) {
          if (error instanceof QlooHttpError && error.status < 500 && error.status !== 429) throw error;
          lastError = error;
        } else {
          lastError = error;
        }
        attempt += 1;
        if (attempt > this.maxRetries) break;
        await this.backoff(attempt, null);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async backoff(attempt: number, retryAfter: string | null): Promise<void> {
    const headerMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
    const base = Number.isFinite(headerMs) ? headerMs : 250 * 2 ** (attempt - 1);
    const jitter = Math.random() * 120;
    await new Promise((resolve) => setTimeout(resolve, base + jitter));
  }

  /** Resolve a free-text name to Qloo entity ids. */
  async search(query: string, type?: QlooDomain, take = 5): Promise<QlooEntity[]> {
    const payload = await this.request('/search', {
      query,
      types: type ? DOMAIN_URN[type] : undefined,
      take,
    });
    return this.normalise(payload, 'search');
  }

  /** Cross-domain affinity insights for a set of signal entities. */
  async insights(options: {
    filterType: QlooDomain;
    signEntities?: string[];
    signTags?: string[];
    take?: number;
    biasTrends?: 'off' | 'very_low' | 'low' | 'mid' | 'medium' | 'high' | 'very_high';
    sortBy?: 'affinity' | 'rating' | 'distance' | 'quality';
  }): Promise<QlooEntity[]> {
    const params: Record<string, string | number | undefined> = {
      'filter.type': DOMAIN_URN[options.filterType],
      take: options.take ?? 10,
      'bias.trends': options.biasTrends ?? 'medium',
      sort_by: options.sortBy ?? 'affinity',
    };
    if (options.signEntities?.length) {
      params['signal.interests.entities'] = options.signEntities.join(',');
    }
    if (options.signTags?.length) {
      params['signal.interests.tags'] = options.signTags.join(',');
    }
    const payload = await this.request('/v2/insights', params);
    return this.normalise(payload, 'insights');
  }

  /** Look up tag ids, used to keep insight filters valid. */
  async tags(query: string, take = 5): Promise<Array<{ id: string; name: string }>> {
    const payload = (await this.request('/v2/tags', { query, take })) as Record<string, unknown>;
    const list = this.pickArray(payload);
    return list.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: String(record.tag_id ?? record.id ?? record.urn ?? ''),
        name: String(record.name ?? record.label ?? record.tag_id ?? ''),
      };
    });
  }

  /**
   * The response envelope is not identical across the lookup and insight
   * endpoints, so the parser reads the documented candidates in order and keeps
   * the raw record for every entity instead of dropping unknown fields.
   */
  private normalise(payload: unknown, source: 'search' | 'insights'): QlooEntity[] {
    const list = this.pickArray(payload as Record<string, unknown>);
    return list
      .map((item) => {
        const record = item as Record<string, unknown>;
        const properties = (record.properties ?? {}) as Record<string, unknown>;
        const id = String(record.entity_id ?? record.id ?? record.urn ?? properties.entity_id ?? '');
        const name = String(record.name ?? properties.name ?? record.label ?? '');
        if (!id && !name) return null;
        const affinityRaw = record.affinity ?? record.score ?? record.relevance;
        const affinity = typeof affinityRaw === 'number' ? affinityRaw : affinityRaw != null ? Number(affinityRaw) : null;
        const tagsRaw = (record.tags ?? properties.tags ?? []) as unknown;
        const tags = Array.isArray(tagsRaw)
          ? tagsRaw.map((t) => (typeof t === 'string' ? t : String((t as Record<string, unknown>).name ?? ''))).filter(Boolean)
          : [];
        const entity: QlooEntity = {
          id,
          name,
          type: String(record.type ?? properties.type ?? ''),
          affinity: Number.isFinite(affinity as number) ? (affinity as number) : null,
          tags,
          raw: record,
        };
        return entity;
      })
      .filter((entity): entity is QlooEntity => entity !== null)
      .sort((a, b) => (b.affinity ?? -1) - (a.affinity ?? -1));
  }

  private pickArray(payload: Record<string, unknown>): unknown[] {
    const candidates = ['entities', 'results', 'data', 'items'];
    for (const key of candidates) {
      const value = payload?.[key];
      if (Array.isArray(value)) return value;
    }
    if (Array.isArray(payload)) return payload as unknown[];
    return [];
  }
}
