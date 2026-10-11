import { QlooClient, QlooEntity, QlooDomain, TasteCorrelation } from './qloo-client.js';

export interface UserTasteProfile {
  anchors: QlooEntity[];
  targetDomains: QlooDomain[];
  strictnessThreshold?: number; // 0.0 - 1.0 (default 0.60)
}

export interface RecommendationResult {
  domain: QlooDomain;
  recommendedEntity: QlooEntity;
  compositeAffinityScore: number;
  correlations: TasteCorrelation[];
  culturalJustification: string;
}

export interface CulturalAuditReport {
  overallCoherenceScore: number; // 0 - 100
  pairwiseScores: TasteCorrelation[];
  dissonanceWarnings: string[];
  verdict: 'Culturally Harmonized' | 'Mixed Aesthetic' | 'Severe Cultural Dissonance';
}

export class TasteGraphEngine {
  private client: QlooClient;

  constructor(client: QlooClient = new QlooClient()) {
    this.client = client;
  }

  /**
   * Synthesize cross-domain recommendations grounded in Qloo cultural vectors
   */
  public async synthesizeRecommendations(profile: UserTasteProfile): Promise<RecommendationResult[]> {
    const threshold = profile.strictnessThreshold ?? 0.55;
    const results: RecommendationResult[] = [];

    for (const targetDomain of profile.targetDomains) {
      const candidates = await this.client.listEntitiesByDomain(targetDomain);
      let bestCandidate: QlooEntity | null = null;
      let highestAvgScore = -1;
      let bestCorrelations: TasteCorrelation[] = [];

      for (const candidate of candidates) {
        // Skip if candidate is already in anchors
        if (profile.anchors.some(a => a.id === candidate.id)) continue;

        const correlations = profile.anchors.map(anchor => 
          this.client.computeTasteAffinity(anchor, candidate)
        );

        const avgScore = correlations.reduce((sum, c) => sum + c.affinityScore, 0) / correlations.length;

        if (avgScore > highestAvgScore && avgScore >= threshold) {
          highestAvgScore = avgScore;
          bestCandidate = candidate;
          bestCorrelations = correlations;
        }
      }

      if (bestCandidate) {
        results.push({
          domain: targetDomain,
          recommendedEntity: bestCandidate,
          compositeAffinityScore: parseFloat(highestAvgScore.toFixed(3)),
          correlations: bestCorrelations,
          culturalJustification: `Grounding in Qloo taste graph achieves ${(highestAvgScore * 100).toFixed(1)}% cultural harmony with ${profile.anchors.map(a => a.name).join(' & ')}.`
        });
      }
    }

    return results;
  }

  /**
   * Audit an itinerary or set of entities for cultural coherence
   */
  public auditCulturalCoherence(entities: QlooEntity[]): CulturalAuditReport {
    if (entities.length < 2) {
      return {
        overallCoherenceScore: 100,
        pairwiseScores: [],
        dissonanceWarnings: [],
        verdict: 'Culturally Harmonized'
      };
    }

    const correlations: TasteCorrelation[] = [];
    const dissonanceWarnings: string[] = [];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const corr = this.client.computeTasteAffinity(entities[i], entities[j]);
        correlations.push(corr);

        if (corr.affinityScore < 0.40) {
          dissonanceWarnings.push(
            `Aesthetic clash between '${entities[i].name}' and '${entities[j].name}' (affinity ${(corr.affinityScore * 100).toFixed(0)}%). Energy differential and aesthetic vectors diverge significantly.`
          );
        }
      }
    }

    const avgScore = correlations.reduce((sum, c) => sum + c.affinityScore, 0) / correlations.length;
    const coherencePercentage = Math.round(avgScore * 100);

    let verdict: 'Culturally Harmonized' | 'Mixed Aesthetic' | 'Severe Cultural Dissonance' = 'Culturally Harmonized';
    if (coherencePercentage < 50) {
      verdict = 'Severe Cultural Dissonance';
    } else if (coherencePercentage < 70) {
      verdict = 'Mixed Aesthetic';
    }

    return {
      overallCoherenceScore: coherencePercentage,
      pairwiseScores: correlations,
      dissonanceWarnings,
      verdict
    };
  }
}
