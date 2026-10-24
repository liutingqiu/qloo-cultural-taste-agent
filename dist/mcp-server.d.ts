/**
 * MCP server exposing the Qloo-backed taste tools.
 *
 * Every tool call runs through TasteAgent, so a tool result is a real Qloo
 * response or an explicit error. There is no canned recommendation path.
 */
import { TasteAgent } from "./agent-pipeline.js";
export declare const TOOL_SCHEMA: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
            };
            type: {
                type: string;
            };
            signalEntityId?: undefined;
            filterType?: undefined;
            take?: undefined;
            description?: undefined;
            seedDomain?: undefined;
            targetDomains?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            signalEntityId: {
                type: string;
            };
            filterType: {
                type: string;
            };
            take: {
                type: string;
            };
            query?: undefined;
            type?: undefined;
            description?: undefined;
            seedDomain?: undefined;
            targetDomains?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            description: {
                type: string;
            };
            seedDomain: {
                type: string;
            };
            targetDomains: {
                type: string;
                items: {
                    type: string;
                };
            };
            take: {
                type: string;
            };
            query?: undefined;
            type?: undefined;
            signalEntityId?: undefined;
            filterType?: undefined;
        };
        required: string[];
    };
})[];
export declare class QlooMcpServer {
    private readonly agent;
    constructor(agent: TasteAgent);
    listTools(): ({
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                query: {
                    type: string;
                };
                type: {
                    type: string;
                };
                signalEntityId?: undefined;
                filterType?: undefined;
                take?: undefined;
                description?: undefined;
                seedDomain?: undefined;
                targetDomains?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                signalEntityId: {
                    type: string;
                };
                filterType: {
                    type: string;
                };
                take: {
                    type: string;
                };
                query?: undefined;
                type?: undefined;
                description?: undefined;
                seedDomain?: undefined;
                targetDomains?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                description: {
                    type: string;
                };
                seedDomain: {
                    type: string;
                };
                targetDomains: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                take: {
                    type: string;
                };
                query?: undefined;
                type?: undefined;
                signalEntityId?: undefined;
                filterType?: undefined;
            };
            required: string[];
        };
    })[];
    callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}
