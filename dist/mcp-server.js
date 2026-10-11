import { QlooClient } from './qloo-client.js';
import { TasteGraphEngine } from './taste-graph-engine.js';

export class QlooMcpServer {
  constructor(client = new QlooClient()) {
    this.client = client;
    this.engine = new TasteGraphEngine(client);
  }

  getToolDefinitions() {
    return [
      {
        name: 'qloo_resolve_entity',
        description: 'Look up a cultural entity in Qloo taste graph across music, dining, film, fashion, travel, or books.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Entity name, genre, or keyword' }
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
            anchorEntityIds: { type: 'array', items: { type: 'string' } },
            targetDomains: { type: 'array', items: { type: 'string' } },
            strictnessThreshold: { type: 'number' }
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
            entityIds: { type: 'array', items: { type: 'string' } }
          },
          required: ['entityIds']
        }
      }
    ];
  }

  async executeTool(toolName, args) {
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
        return this.client.computeTasteAffinity(e1, e2);
      }

      case 'qloo_cross_domain_synthesis': {
        const anchors = [];
        for (const id of args.anchorEntityIds) {
          const e = await this.client.getEntity(id);
          if (e) anchors.push(e);
        }

        if (anchors.length === 0) {
          throw new Error('No valid anchor entities found');
        }

        const profile = {
          anchors,
          targetDomains: args.targetDomains,
          strictnessThreshold: args.strictnessThreshold
        };

        const recommendations = await this.engine.synthesizeRecommendations(profile);
        return {
          anchors: anchors.map(a => ({ id: a.id, name: a.name, domain: a.domain })),
          recommendations
        };
      }

      case 'qloo_audit_cultural_fit': {
        const entities = [];
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
