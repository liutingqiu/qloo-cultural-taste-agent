/**
 * Qloo API Client & Cultural Taste Graph Interface
 */

export class QlooClient {
  static CURATED_TASTE_GRAPH = {
    'music_my_bloody_valentine': {
      id: 'music_my_bloody_valentine',
      name: 'My Bloody Valentine (Shoegaze)',
      domain: 'music',
      subcategories: ['shoegaze', 'dream-pop', 'alternative-rock'],
      vibeVectors: {
        aesthetic: 'ethereal-distortion',
        energyLevel: 0.65,
        exclusivityIndex: 0.82,
        culturalEra: '90s-indie'
      },
      tags: ['fuzzy', 'analog', 'introspective', 'lo-fi', 'cult-classic', 'subcultural', 'unfiltered'],
      popularityScore: 0.74
    },
    'music_miles_davis_kind_of_blue': {
      id: 'music_miles_davis_kind_of_blue',
      name: 'Miles Davis - Modal Jazz',
      domain: 'music',
      subcategories: ['modal-jazz', 'cool-jazz', 'instrumental'],
      vibeVectors: {
        aesthetic: 'minimalist-sophistication',
        energyLevel: 0.35,
        exclusivityIndex: 0.65,
        culturalEra: 'late-50s-timeless'
      },
      tags: ['meditative', 'refined', 'acoustic', 'acoustic-depth', 'nocturnal'],
      popularityScore: 0.92
    },
    'music_aphex_twin': {
      id: 'music_aphex_twin',
      name: 'Aphex Twin (IDM / Ambient)',
      domain: 'music',
      subcategories: ['idm', 'ambient-techno', 'experimental-electronic'],
      vibeVectors: {
        aesthetic: 'futuristic-glitch',
        energyLevel: 0.55,
        exclusivityIndex: 0.88,
        culturalEra: '90s-cyberpunk'
      },
      tags: ['cerebral', 'algorithmic', 'complex-polyrhythm', 'subversive', 'cult-classic'],
      popularityScore: 0.81
    },
    'dining_natural_wine_bistrot': {
      id: 'dining_natural_wine_bistrot',
      name: 'Cave à Manger (Natural Wine & Neo-Bistrot)',
      domain: 'dining',
      subcategories: ['natural-wine', 'neo-bistro', 'fermented-produce'],
      vibeVectors: {
        aesthetic: 'warm-artisanal',
        energyLevel: 0.50,
        exclusivityIndex: 0.78,
        culturalEra: 'contemporary-terroir'
      },
      tags: ['funky-pet-nat', 'unfiltered', 'organic', 'convivial', 'intimate', 'subcultural', 'analog'],
      popularityScore: 0.68
    },
    'dining_kyoto_kissaten': {
      id: 'dining_kyoto_kissaten',
      name: 'Slow-Drip Jazz Kissaten (Charcoal Siphon Coffee)',
      domain: 'dining',
      subcategories: ['kissaten', 'specialty-coffee', 'vinyl-listening-bar'],
      vibeVectors: {
        aesthetic: 'minimalist-sophistication',
        energyLevel: 0.25,
        exclusivityIndex: 0.85,
        culturalEra: 'mid-century-showa'
      },
      tags: ['meditative', 'analog', 'acoustic-depth', 'woodcraft', 'nocturnal'],
      popularityScore: 0.62
    },
    'dining_brutalist_fermentation_lab': {
      id: 'dining_brutalist_fermentation_lab',
      name: 'Nordic Fermentation Lab (Foraged Micro-Seasonal)',
      domain: 'dining',
      subcategories: ['new-nordic', 'micro-seasonal', 'sustainable-gastronomy'],
      vibeVectors: {
        aesthetic: 'brutalist-clean',
        energyLevel: 0.40,
        exclusivityIndex: 0.92,
        culturalEra: 'contemporary-nordic'
      },
      tags: ['cerebral', 'foraged', 'monochrome', 'umami-forward'],
      popularityScore: 0.75
    },
    'film_wong_kar_wai': {
      id: 'film_wong_kar_wai',
      name: 'In the Mood for Love / Chungking Express (Wong Kar-wai)',
      domain: 'film',
      subcategories: ['neo-noir', 'arthouse-romance', 'visual-poetry'],
      vibeVectors: {
        aesthetic: 'nostalgic-neon',
        energyLevel: 0.45,
        exclusivityIndex: 0.76,
        culturalEra: '90s-hong-kong'
      },
      tags: ['longing', 'step-printed', 'atmospheric', 'melancholic', 'analog'],
      popularityScore: 0.88
    },
    'film_blade_runner_2049': {
      id: 'film_blade_runner_2049',
      name: 'Blade Runner 2049 (Denis Villeneuve)',
      domain: 'film',
      subcategories: ['cyberpunk-scifi', 'philosophical-noir', 'cinematographic-scale'],
      vibeVectors: {
        aesthetic: 'futuristic-glitch',
        energyLevel: 0.70,
        exclusivityIndex: 0.60,
        culturalEra: 'dystopian-future'
      },
      tags: ['cerebral', 'brutalist-clean', 'synth-drones', 'existential'],
      popularityScore: 0.94
    },
    'fashion_issey_miyake_pleats': {
      id: 'fashion_issey_miyake_pleats',
      name: 'Issey Miyake Homme Plissé (Architectural Drape)',
      domain: 'fashion',
      subcategories: ['avant-garde', 'micro-pleated', 'japanese-minimalism'],
      vibeVectors: {
        aesthetic: 'minimalist-sophistication',
        energyLevel: 0.40,
        exclusivityIndex: 0.83,
        culturalEra: 'contemporary-tokyo'
      },
      tags: ['structural', 'breathable', 'geometric', 'tactile-elegance'],
      popularityScore: 0.80
    },
    'fashion_vintage_workwear': {
      id: 'fashion_vintage_workwear',
      name: 'French Moleskin & Heritage Selvedge Denim',
      domain: 'fashion',
      subcategories: ['heritage-workwear', 'vintage-utilitarian', 'slow-fashion'],
      vibeVectors: {
        aesthetic: 'warm-artisanal',
        energyLevel: 0.30,
        exclusivityIndex: 0.72,
        culturalEra: 'mid-century-utilitarian'
      },
      tags: ['patina', 'organic', 'durable', 'unpretentious', 'analog'],
      popularityScore: 0.77
    },
    'travel_kyoto_higashiyama': {
      id: 'travel_kyoto_higashiyama',
      name: 'Kyoto Zen Architecture & Hidden Machiya Stay',
      domain: 'travel',
      subcategories: ['cultural-heritage', 'zen-aesthetic', 'tranquility-travel'],
      vibeVectors: {
        aesthetic: 'minimalist-sophistication',
        energyLevel: 0.20,
        exclusivityIndex: 0.86,
        culturalEra: 'timeless-tradition'
      },
      tags: ['meditative', 'woodcraft', 'contemplative', 'analog', 'refined'],
      popularityScore: 0.89
    },
    'travel_berlin_kreuzberg': {
      id: 'travel_berlin_kreuzberg',
      name: 'Berlin Kreuzberg Contemporary Art & Sound Labs',
      domain: 'travel',
      subcategories: ['subcultural-hub', 'sound-art', 'counter-culture'],
      vibeVectors: {
        aesthetic: 'ethereal-distortion',
        energyLevel: 0.75,
        exclusivityIndex: 0.79,
        culturalEra: 'post-industrial-berlin'
      },
      tags: ['brutalist-clean', 'subversive', 'unfiltered', 'experimental', 'subcultural'],
      popularityScore: 0.84
    }
  };

  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.QLOO_API_KEY || 'qloo_hackathon_agent_key_2026';
    this.baseUrl = config.baseUrl || 'https://api.qloo.com/v2';
    this.timeoutMs = config.timeoutMs || 8000;
  }

  async getEntity(idOrName) {
    const normalized = idOrName.toLowerCase().trim();
    if (QlooClient.CURATED_TASTE_GRAPH[normalized]) {
      return QlooClient.CURATED_TASTE_GRAPH[normalized];
    }
    for (const entity of Object.values(QlooClient.CURATED_TASTE_GRAPH)) {
      if (
        entity.name.toLowerCase().includes(normalized) ||
        entity.subcategories.some(s => s.toLowerCase().includes(normalized)) ||
        entity.tags.some(t => t.toLowerCase().includes(normalized))
      ) {
        return entity;
      }
    }
    return null;
  }

  async listEntitiesByDomain(domain) {
    return Object.values(QlooClient.CURATED_TASTE_GRAPH).filter(e => e.domain === domain);
  }

  computeTasteAffinity(e1, e2) {
    const aestheticMatch = e1.vibeVectors.aesthetic === e2.vibeVectors.aesthetic ? 1.0 :
      (this.areAestheticsCompatible(e1.vibeVectors.aesthetic, e2.vibeVectors.aesthetic) ? 0.70 : 0.20);

    const energyDiff = Math.abs(e1.vibeVectors.energyLevel - e2.vibeVectors.energyLevel);
    const energyScore = Math.max(0, 1.0 - energyDiff * 1.2);

    const exclusivityDiff = Math.abs(e1.vibeVectors.exclusivityIndex - e2.vibeVectors.exclusivityIndex);
    const exclusivityScore = Math.max(0, 1.0 - exclusivityDiff);

    const set1 = new Set(e1.tags);
    const set2 = new Set(e2.tags);
    const intersection = [...set1].filter(x => set2.has(x));
    const union = new Set([...set1, ...set2]);
    const jaccard = union.size > 0 ? (intersection.length / union.size) : 0;
    const tagScore = Math.min(1.0, jaccard * 2.5);

    const affinityScore = parseFloat((
      aestheticMatch * 0.35 +
      energyScore * 0.20 +
      exclusivityScore * 0.15 +
      tagScore * 0.30
    ).toFixed(3));

    let reasoning = `Strong cross-domain coherence grounded in shared '${e1.vibeVectors.aesthetic}' aesthetic`;
    if (intersection.length > 0) {
      reasoning += ` and mutual vibe markers: ${intersection.join(', ')}.`;
    } else {
      reasoning += ` with complementary energy balances (${e1.vibeVectors.energyLevel.toFixed(2)} vs ${e2.vibeVectors.energyLevel.toFixed(2)}).`;
    }

    return {
      sourceEntityId: e1.id,
      targetEntityId: e2.id,
      sourceDomain: e1.domain,
      targetDomain: e2.domain,
      affinityScore,
      coherenceReasoning: reasoning,
      sharedAestheticTags: intersection
    };
  }

  areAestheticsCompatible(a1, a2) {
    const compatiblePairs = [
      ['minimalist-sophistication', 'warm-artisanal'],
      ['ethereal-distortion', 'warm-artisanal'],
      ['ethereal-distortion', 'futuristic-glitch'],
      ['brutalist-clean', 'futuristic-glitch'],
      ['warm-artisanal', 'nostalgic-neon'],
      ['minimalist-sophistication', 'brutalist-clean']
    ];
    return compatiblePairs.some(
      ([p1, p2]) => (a1 === p1 && a2 === p2) || (a1 === p2 && a2 === p1)
    );
  }
}
