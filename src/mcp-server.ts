/**
 * MCP server exposing the Qloo-backed taste tools.
 *
 * Every tool call runs through TasteAgent, so a tool result is a real Qloo
 * response or an explicit error. There is no canned recommendation path.
 */

import { TasteAgent } from "./agent-pipeline.js";
import { QlooDomain } from "./qloo-client.js";

export const TOOL_SCHEMA = [
  {
    name: "qloo_search_entities",
    description: "Resolve a free-text name to Qloo entity ids via /search.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        type: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "qloo_insights",
    description: "Call /v2/insights for a signal entity and return ranked entities with affinity.",
    inputSchema: {
      type: "object",
      properties: {
        signalEntityId: { type: "string" },
        filterType: { type: "string" },
        take: { type: "number" },
      },
      required: ["signalEntityId", "filterType"],
    },
  },
  {
    name: "taste_recommend",
    description: "Cross-domain run: resolve seeds, query several target domains, merge by affinity.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string" },
        seedDomain: { type: "string" },
        targetDomains: { type: "array", items: { type: "string" } },
        take: { type: "number" },
      },
      required: ["description", "seedDomain", "targetDomains"],
    },
  },
];

export class QlooMcpServer {
  constructor(private readonly agent: TasteAgent) {}

  listTools() {
    return TOOL_SCHEMA;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case "qloo_search_entities": {
        const entities = await this.agent.searchOnly(String(args.query ?? ""), args.type as QlooDomain | undefined);
        return { content: [{ type: "text", text: JSON.stringify({ entities }, null, 2) }] };
      }
      case "qloo_insights": {
        const entities = await this.agent.insightsOnly(
          String(args.signalEntityId ?? ""),
          String(args.filterType ?? "") as QlooDomain,
          Number(args.take ?? 10),
        );
        return { content: [{ type: "text", text: JSON.stringify({ entities }, null, 2) }] };
      }
      case "taste_recommend": {
        const result = await this.agent.recommend({
          description: String(args.description ?? ""),
          seedDomain: String(args.seedDomain ?? "artist") as QlooDomain,
          targetDomains: ((args.targetDomains as string[]) ?? ["movie"]).map((d) => d as QlooDomain),
          take: Number(args.take ?? 10),
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error("unknown tool: " + name);
    }
  }
}
