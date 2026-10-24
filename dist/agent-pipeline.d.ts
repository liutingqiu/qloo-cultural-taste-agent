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
export declare class TasteAgent {
    private readonly client;
    private readonly requests;
    constructor(client: QlooClient);
    get configured(): boolean;
    recordRequests: (record: RequestRecord) => void;
    /** Same array the result carries, exposed for the CLI. */
    get requestLog(): RequestRecord[];
    private time;
    /** Thin passthroughs used by the MCP tools, kept here so every call is traced. */
    searchOnly(query: string, type?: QlooDomain): Promise<QlooEntity[]>;
    insightsOnly(signalEntityId: string, filterType: QlooDomain, take?: number): Promise<QlooEntity[]>;
    recommend(request: TasteRequest): Promise<TasteResult>;
}
export declare function summarise(result: TasteResult): Record<string, unknown>;
