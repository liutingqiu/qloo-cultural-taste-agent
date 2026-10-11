import { QlooClient } from './qloo-client.js';

export class TasteGraphEngine {
  constructor(client = new QlooClient()) {
    this.client = client;
  }

  async synthesizeRecommendations(profile) {
    const threshold = profile.strictnessThreshold ?? 0.55;
    const results = [];

    for (const targetDomain of profile.targetDomains) {
      const candidates = await this.client.listEntitiesByDomain(targetDomain);
      let bestCandidate = null;
      let highestAvgScore = -1;
      let bestCorrelations = [];

      for (const candidate of candidates) {
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

  auditCulturalCoherence(entities) {
    if (entities.length < 2) {
      return {
        overallCoherenceScore: 100,
        pairwiseScores: [],
        dissonanceWarnings: [],
        verdict: 'Culturally Harmonized'
      };
    }

    const correlations = [];
    const dissonanceWarnings = [];

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

    let verdict = 'Culturally Harmonized';
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
