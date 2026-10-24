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
export const DOMAIN_URN = {
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
export class QlooAuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'QlooAuthError';
    }
}
export class QlooHttpError extends Error {
    status;
    body;
    url;
    constructor(status, body, url) {
        super('Qloo request failed: HTTP ' + status + ' from ' + url + ' :: ' + body.slice(0, 200));
        this.status = status;
        this.body = body;
        this.url = url;
        this.name = 'QlooHttpError';
    }
}
const DEFAULT_BASE_URL = 'https://hackathon.api.qloo.com';
export class QlooClient {
    apiKey;
    baseUrl;
    timeoutMs;
    maxRetries;
    fetchImpl;
    onRequest;
    constructor(config = {}) {
        this.apiKey = config.apiKey ?? process.env.QLOO_API_KEY ?? '';
        this.baseUrl = (config.baseUrl ?? process.env.QLOO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
        this.timeoutMs = config.timeoutMs ?? 12_000;
        this.maxRetries = config.maxRetries ?? 2;
        this.fetchImpl = config.fetchImpl ?? fetch;
        this.onRequest = config.onRequest;
    }
    get configured() {
        return this.apiKey.length > 0;
    }
    /** True when talking to a non-production base URL, which the report must disclose. */
    get isLocalEndpoint() {
        return !/qloo\.com$/i.test(new URL(this.baseUrl).hostname);
    }
    async request(path, params) {
        if (!this.apiKey) {
            throw new QlooAuthError('QLOO_API_KEY is not set. Request a hackathon key with the form linked from the Qloo developer guide.');
        }
        const url = new URL(this.baseUrl + path);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== '')
                url.searchParams.set(key, String(value));
        }
        let attempt = 0;
        let lastError;
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
                return JSON.parse(text);
            }
            catch (error) {
                if (error instanceof QlooAuthError || error instanceof QlooHttpError) {
                    if (error instanceof QlooHttpError && error.status < 500 && error.status !== 429)
                        throw error;
                    lastError = error;
                }
                else {
                    lastError = error;
                }
                attempt += 1;
                if (attempt > this.maxRetries)
                    break;
                await this.backoff(attempt, null);
            }
            finally {
                clearTimeout(timer);
            }
        }
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }
    async backoff(attempt, retryAfter) {
        const headerMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
        const base = Number.isFinite(headerMs) ? headerMs : 250 * 2 ** (attempt - 1);
        const jitter = Math.random() * 120;
        await new Promise((resolve) => setTimeout(resolve, base + jitter));
    }
    /** Resolve a free-text name to Qloo entity ids. */
    async search(query, type, take = 5) {
        const payload = await this.request('/search', {
            query,
            types: type ? DOMAIN_URN[type] : undefined,
            take,
        });
        return this.normalise(payload, 'search');
    }
    /** Cross-domain affinity insights for a set of signal entities. */
    async insights(options) {
        const params = {
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
    async tags(query, take = 5) {
        const payload = (await this.request('/v2/tags', { query, take }));
        const list = this.pickArray(payload);
        return list.map((item) => {
            const record = item;
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
    normalise(payload, source) {
        const list = this.pickArray(payload);
        return list
            .map((item) => {
            const record = item;
            const properties = (record.properties ?? {});
            const id = String(record.entity_id ?? record.id ?? record.urn ?? properties.entity_id ?? '');
            const name = String(record.name ?? properties.name ?? record.label ?? '');
            if (!id && !name)
                return null;
            const affinityRaw = record.affinity ?? record.score ?? record.relevance;
            const affinity = typeof affinityRaw === 'number' ? affinityRaw : affinityRaw != null ? Number(affinityRaw) : null;
            const tagsRaw = (record.tags ?? properties.tags ?? []);
            const tags = Array.isArray(tagsRaw)
                ? tagsRaw.map((t) => (typeof t === 'string' ? t : String(t.name ?? ''))).filter(Boolean)
                : [];
            const entity = {
                id,
                name,
                type: String(record.type ?? properties.type ?? ''),
                affinity: Number.isFinite(affinity) ? affinity : null,
                tags,
                raw: record,
            };
            return entity;
        })
            .filter((entity) => entity !== null)
            .sort((a, b) => (b.affinity ?? -1) - (a.affinity ?? -1));
    }
    pickArray(payload) {
        const candidates = ['entities', 'results', 'data', 'items'];
        for (const key of candidates) {
            const value = payload?.[key];
            if (Array.isArray(value))
                return value;
        }
        if (Array.isArray(payload))
            return payload;
        return [];
    }
}
