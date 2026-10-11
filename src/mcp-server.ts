import { QlooClient, QlooDomain, QlooEntity } from './qloo-client.js';
import { TasteGraphEngine, UserTasteProfile } from './taste-graph-engine.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export class QlooMcpServer {
  private client: QlooClient;
  private engine: TasteGraphEngine;

  constructor(client: QlooClient = new QlooClient()) {
    this.client = client;
    this.engine = new TasteGraphEngine(client);
  }

  /**
   * Return standardized MCP tool declarations for LLM agent integration
   */
  public getToolDefinitions(): McpToolDefinition[] {
    return [
      {
        name: 'qloo_resolve_entity',
        description: 'Look up a cultural entity in Qloo taste graph across music, dining, film, fashion, travel, or books.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Entity name, genre, or keyword (e.g. "shoegaze", "natural wine", "blade runner")' }
          },
          required: ['query']
        }
      },
      {
        name: 'qloo_compute_taste_affinity',
        description: 'Calculate cultural affinity and compatibility between two entities across different domains.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceEntityId: { type: 'string', description: 'Source entity identifier' },
            targetEntityId: { type: 'string', description: 'Target entity identifier' }
          },
          required: ['sourceEntityId', 'targetEntityId']
        }
      },
      {
        name: 'qloo_cross_domain_synthesis',
        description: 'Synthesize cross-domain recommendations matching user taste anchors with cultural coherence.',
        inputSchema: {
          type: 'object',
          properties: {
            anchorEntityIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Known taste anchors the user loves (e.g. ["music_my_bloody_valentine", "dining_natural_wine_bistrot"])'
            },
            targetDomains: {
              type: 'array',
              items: { type: 'string', enum: ['music', 'film', 'dining', 'fashion', 'travel', 'books'] },
              description: 'Domains to synthesize recommendations for'
            },
            strictnessThreshold: {
              type: 'number',
              description: 'Minimum cultural affinity threshold (0.0 to 1.0, default 0.55)'
            }
          },
          required: ['anchorEntityIds', 'targetDomains']
        }
      },
      {
        name: 'qloo_audit_cultural_fit',
        description: 'Audit an itinerary, experience, or product bundle for cultural harmony vs aesthetic dissonance.',
        inputSchema: {
          type: 'object',
          properties: {
            entityIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of entity IDs forming the plan or bundle'
            }
          },
          required: ['entityIds']
        }
      }
    ];
  }

  /**
   * Execute an MCP tool invocation
   */
  public async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    switch (toolName) {
      case 'qloo_resolve_entity': {
        const entity = await this.client.getEntity(args.query);
        if (!entity) {
          return { found: false, message: `Entity matching '${args.query}' not found in taste graph.` };
        }
        return { found: true, entity };
      }

      case 'qloo_compute_taste_affinity': {
        const e1 = await this.client.getEntity(args.sourceEntityId);
        const e2 = await this.client.getEntity(args.targetEntityId);
        if (!e1 || !e2) {
          throw new Error('One or both entities not found in taste graph');
        }
        const correlation = this.client.computeTasteAffinity(e1, e2);
        return correlation;
      }

      case 'qloo_cross_domain_synthesis': {
        const anchors: QlooEntity[] = [];
        for (const id of args.anchorEntityIds) {
          const e = await this.client.getEntity(id);
          if (e) anchors.push(e);
        }

        if (anchors.length === 0) {
          throw new Error('No valid anchor entities found');
        }

        const profile: UserTasteProfile = {
          anchors,
          targetDomains: args.targetDomains as QlooDomain[],
          strictnessThreshold: args.strictnessThreshold
        };

        const recommendations = await this.engine.synthesizeRecommendations(profile);
        return {
          anchors: anchors.map(a => ({ id: a.id, name: a.name, domain: a.domain })),
          recommendations
        };
      }

      case 'qloo_audit_cultural_fit': {
        const entities: QlooEntity[] = [];
        for (const id of args.entityIds) {
          const e = await this.client.getEntity(id);
          if (e) entities.push(e);
        }

        if (entities.length < 2) {
          throw new Error('Audit requires at least 2 entities');
        }

        return this.engine.auditCulturalCoherence(entities);
      }

      default:
        throw new Error(`Unknown MCP tool: ${toolName}`);
    }
  }
}
