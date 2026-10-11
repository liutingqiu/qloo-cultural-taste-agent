// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QlooClient,
  TasteGraphEngine,
  QlooMcpServer,
  CulturalAgentPipeline
} from '../dist/index.js';

test('1. QlooClient resolves entities by ID, genre keyword, and filters by domain', async () => {
  const client = new QlooClient();

  // Test direct ID lookup
  const e1 = await client.getEntity('music_my_bloody_valentine');
  assert.ok(e1, 'Entity must exist');
  assert.equal(e1.domain, 'music');
  assert.equal(e1.vibeVectors.aesthetic, 'ethereal-distortion');

  // Test keyword search
  const e2 = await client.getEntity('natural wine');
  assert.ok(e2, 'Entity must be resolved via keyword');
  assert.equal(e2.domain, 'dining');

  // Test domain listing
  const diningList = await client.listEntitiesByDomain('dining');
  assert.ok(diningList.length >= 3, 'Must contain at least 3 curated dining entities');
});

test('2. computeTasteAffinity calculates calibrated cross-domain resonance scores', async () => {
  const client = new QlooClient();

  const shoegaze = await client.getEntity('music_my_bloody_valentine');
  const naturalWine = await client.getEntity('dining_natural_wine_bistrot');
  const aphexTwin = await client.getEntity('music_aphex_twin');

  assert.ok(shoegaze && naturalWine && aphexTwin);

  // Compute affinity between shoegaze & natural wine (indie aesthetic resonance)
  const corr = client.computeTasteAffinity(shoegaze, naturalWine);
  assert.ok(corr.affinityScore >= 0.50, 'Aesthetic resonance must be above 0.50');
  assert.ok(corr.coherenceReasoning.length > 10, 'Must include descriptive reasoning');
  assert.equal(corr.sourceDomain, 'music');
  assert.equal(corr.targetDomain, 'dining');

  // Aphex Twin & Shoegaze (electronic-shoegaze subcultural synergy)
  const electronicCorr = client.computeTasteAffinity(shoegaze, aphexTwin);
  assert.ok(electronicCorr.affinityScore >= 0.55, 'Subcultural cross-domain correlation must be strong');
});

test('3. TasteGraphEngine synthesizes culturally grounded multi-domain recommendations', async () => {
  const client = new QlooClient();
  const engine = new TasteGraphEngine(client);

  const jazz = await client.getEntity('music_miles_davis_kind_of_blue');
  assert.ok(jazz);

  // User loves modal jazz -> request dining, travel, fashion
  const recommendations = await engine.synthesizeRecommendations({
    anchors: [jazz],
    targetDomains: ['dining', 'travel', 'fashion'],
    strictnessThreshold: 0.50
  });

  assert.equal(recommendations.length, 3, 'Must return recommendations for all 3 target domains');

  // Should recommend Kyoto Kissaten or similar minimalist woodcraft / vinyl establishment
  const diningRec = recommendations.find(r => r.domain === 'dining');
  assert.ok(diningRec, 'Must recommend dining');
  assert.equal(diningRec.recommendedEntity.id, 'dining_kyoto_kissaten');
  assert.ok(diningRec.compositeAffinityScore >= 0.70, 'Affinity with modal jazz must be exceptionally high');
});

test('4. auditCulturalCoherence correctly evaluates cultural harmony and detects aesthetic dissonance', async () => {
  const client = new QlooClient();
  const engine = new TasteGraphEngine(client);

  const jazz = await client.getEntity('music_miles_davis_kind_of_blue');
  const kissaten = await client.getEntity('dining_kyoto_kissaten');
  const kyoto = await client.getEntity('travel_kyoto_higashiyama');

  assert.ok(jazz && kissaten && kyoto);

  // Harmonized set
  const harmonizedReport = engine.auditCulturalCoherence([jazz, kissaten, kyoto]);
  assert.equal(harmonizedReport.verdict, 'Culturally Harmonized');
  assert.ok(harmonizedReport.overallCoherenceScore >= 75, 'Harmonized score should be >= 75%');
  assert.equal(harmonizedReport.dissonanceWarnings.length, 0, 'No dissonance warnings in harmonized set');
});

test('5. QlooMcpServer provides valid MCP tool specifications and executes tool calls', async () => {
  const mcpServer = new QlooMcpServer();
  const toolsList = mcpServer.getToolDefinitions();

  assert.equal(toolsList.length, 4, 'Must provide 4 standardized MCP tools');
  assert.ok(toolsList.some(t => t.name === 'qloo_resolve_entity'));
  assert.ok(toolsList.some(t => t.name === 'qloo_cross_domain_synthesis'));

  // Test tool execution
  const resolveResult = await mcpServer.executeTool('qloo_resolve_entity', { query: 'wong kar-wai' });
  assert.equal(resolveResult.found, true);
  assert.equal(resolveResult.entity.id, 'film_wong_kar_wai');

  const synthResult = await mcpServer.executeTool('qloo_cross_domain_synthesis', {
    anchorEntityIds: ['film_wong_kar_wai'],
    targetDomains: ['dining', 'fashion'],
    strictnessThreshold: 0.40
  });
  assert.ok(synthResult.recommendations.length >= 1);
});

test('6. CulturalAgentPipeline end-to-end planAndExecute produces verified reasoning trace and itinerary', async () => {
  const pipeline = new CulturalAgentPipeline();

  const plan = await pipeline.planAndExecute({
    naturalLanguagePrompt: 'Plan an evening for someone who loves 90s shoegaze distortion and natural wine',
    preferredDomains: ['dining', 'travel']
  });

  assert.ok(plan.inferredTasteAnchors.length >= 1, 'Must infer taste anchors from prompt');
  assert.ok(plan.executionTrace.length >= 3, 'Must contain multi-step agent reasoning trace');
  assert.ok(plan.culturalItinerary.length >= 1, 'Must produce cultural itinerary');
  assert.ok(plan.overallCoherenceScore >= 50, 'Overall coherence score must be valid');
  assert.ok(plan.agentSummary.includes('culturally grounded'), 'Summary must reflect cultural grounding');
});
