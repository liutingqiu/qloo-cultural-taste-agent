import { QlooClient } from './qloo-client.js';
import { QlooMcpServer } from './mcp-server.js';
import { TasteGraphEngine } from './taste-graph-engine.js';

export interface AgentPlanRequest {
  naturalLanguagePrompt: string;
  userVibeHints?: string[];
  preferredDomains?: ('music' | 'film' | 'dining' | 'fashion' | 'travel')[];
}

export interface AgentExecutionStep {
  step: number;
  tool: string;
  arguments: Record<string, any>;
  observationSummary: string;
}

export interface AgentPlanResult {
  inferredTasteAnchors: string[];
  executionTrace: AgentExecutionStep[];
  culturalItinerary: {
    domain: string;
    title: string;
    culturalHarmonyRating: number;
    explanation: string;
  }[];
  overallCoherenceScore: number;
  agentSummary: string;
}

export class CulturalAgentPipeline {
  private mcpServer: QlooMcpServer;
  private client: QlooClient;
  private engine: TasteGraphEngine;

  constructor() {
    this.client = new QlooClient();
    this.engine = new TasteGraphEngine(this.client);
    this.mcpServer = new QlooMcpServer(this.client);
  }

  /**
   * Run agentic planning with Qloo taste graph grounding
   */
  public async planAndExecute(request: AgentPlanRequest): Promise<AgentPlanResult> {
    const trace: AgentExecutionStep[] = [];
    let stepCount = 1;

    // Step 1: Parse keywords from prompt and resolve taste anchors
    const keywords = this.extractKeywords(request.naturalLanguagePrompt, request.userVibeHints);
    const resolvedAnchorIds: string[] = [];

    for (const kw of keywords) {
      const resolveResult = await this.mcpServer.executeTool('qloo_resolve_entity', { query: kw });
      trace.push({
        step: stepCount++,
        tool: 'qloo_resolve_entity',
        arguments: { query: kw },
        observationSummary: resolveResult.found 
          ? `Found '${resolveResult.entity.name}' in ${resolveResult.entity.domain} with aesthetic '${resolveResult.entity.vibeVectors.aesthetic}'`
          : `No direct match for '${kw}'`
      });

      if (resolveResult.found) {
        resolvedAnchorIds.push(resolveResult.entity.id);
      }
    }

    // Default to at least one strong anchor if none resolved
    if (resolvedAnchorIds.length === 0) {
      resolvedAnchorIds.push('music_my_bloody_valentine');
    }

    // Step 2: Determine target domains
    const targetDomains = request.preferredDomains && request.preferredDomains.length > 0
      ? request.preferredDomains
      : ['dining', 'film', 'fashion', 'travel'];

    // Step 3: Run cross-domain taste synthesis via MCP
    const synthResult = await this.mcpServer.executeTool('qloo_cross_domain_synthesis', {
      anchorEntityIds: resolvedAnchorIds,
      targetDomains: targetDomains,
      strictnessThreshold: 0.50
    });

    trace.push({
      step: stepCount++,
      tool: 'qloo_cross_domain_synthesis',
      arguments: {
        anchorEntityIds: resolvedAnchorIds,
        targetDomains
      },
      observationSummary: `Synthesized ${synthResult.recommendations.length} culturally coherent cross-domain entities.`
    });

    // Step 4: Audit overall itinerary
    const allEntitiesToAudit = [...resolvedAnchorIds, ...synthResult.recommendations.map((r: any) => r.recommendedEntity.id)];
    const auditResult = await this.mcpServer.executeTool('qloo_audit_cultural_fit', {
      entityIds: allEntitiesToAudit
    });

    trace.push({
      step: stepCount++,
      tool: 'qloo_audit_cultural_fit',
      arguments: { entityIds: allEntitiesToAudit },
      observationSummary: `Cultural coherence score: ${auditResult.overallCoherenceScore}% (${auditResult.verdict})`
    });

    // Format output itinerary
    const culturalItinerary = synthResult.recommendations.map((rec: any) => ({
      domain: rec.domain.toUpperCase(),
      title: rec.recommendedEntity.name,
      culturalHarmonyRating: Math.round(rec.compositeAffinityScore * 100),
      explanation: rec.culturalJustification
    }));

    const agentSummary = `Successfully synthesized a culturally grounded itinerary with ${auditResult.overallCoherenceScore}% overall taste harmony. Grounded in ${resolvedAnchorIds.length} anchor tastes across ${culturalItinerary.length} cross-domain recommendations.`;

    return {
      inferredTasteAnchors: resolvedAnchorIds,
      executionTrace: trace,
      culturalItinerary,
      overallCoherenceScore: auditResult.overallCoherenceScore,
      agentSummary
    };
  }

  private extractKeywords(prompt: string, hints?: string[]): string[] {
    const list: string[] = hints ? [...hints] : [];
    const p = prompt.toLowerCase();

    if (p.includes('shoegaze') || p.includes('bloody valentine')) list.push('shoegaze');
    if (p.includes('jazz') || p.includes('miles davis')) list.push('modal jazz');
    if (p.includes('ambient') || p.includes('aphex twin') || p.includes('electronic')) list.push('idm');
    if (p.includes('wine') || p.includes('natural wine')) list.push('natural wine');
    if (p.includes('coffee') || p.includes('kissaten')) list.push('kissaten');
    if (p.includes('ferment') || p.includes('nordic')) list.push('nordic fermentation');
    if (p.includes('wong kar') || p.includes('chungking')) list.push('wong kar-wai');
    if (p.includes('blade runner') || p.includes('cyberpunk')) list.push('blade runner');
    if (p.includes('pleat') || p.includes('issey miyake')) list.push('issey miyake');
    if (p.includes('workwear') || p.includes('vintage')) list.push('heritage workwear');
    if (p.includes('kyoto') || p.includes('zen')) list.push('kyoto');
    if (p.includes('berlin')) list.push('berlin');

    return [...new Set(list)];
  }
}
