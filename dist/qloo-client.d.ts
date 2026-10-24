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
export type QlooDomain = 'artist' | 'book' | 'brand' | 'locality' | 'movie' | 'person' | 'place' | 'podcast' | 'tv_show' | 'videogame';
export declare const DOMAIN_URN: Record<QlooDomain, string>;
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
export declare class QlooAuthError extends Error {
    constructor(message: string);
}
export declare class QlooHttpError extends Error {
    readonly status: number;
    readonly body: string;
    readonly url: string;
    constructor(status: number, body: string, url: string);
}
export declare class QlooClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly fetchImpl;
    private readonly onRequest?;
    constructor(config?: QlooClientConfig);
    get configured(): boolean;
    /** True when talking to a non-production base URL, which the report must disclose. */
    get isLocalEndpoint(): boolean;
    private request;
    private backoff;
    /** Resolve a free-text name to Qloo entity ids. */
    search(query: string, type?: QlooDomain, take?: number): Promise<QlooEntity[]>;
    /** Cross-domain affinity insights for a set of signal entities. */
    insights(options: {
        filterType: QlooDomain;
        signEntities?: string[];
        signTags?: string[];
        take?: number;
        biasTrends?: 'off' | 'very_low' | 'low' | 'mid' | 'medium' | 'high' | 'very_high';
        sortBy?: 'affinity' | 'rating' | 'distance' | 'quality';
    }): Promise<QlooEntity[]>;
    /** Look up tag ids, used to keep insight filters valid. */
    tags(query: string, take?: number): Promise<Array<{
        id: string;
        name: string;
    }>>;
    /**
     * The response envelope is not identical across the lookup and insight
     * endpoints, so the parser reads the documented candidates in order and keeps
     * the raw record for every entity instead of dropping unknown fields.
     */
    private normalise;
    private pickArray;
}
