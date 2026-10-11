/**
 * Qloo API Client & Cultural Taste Graph Interface
 * Official Qloo API Reference: https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
 */

export type QlooDomain = 'music' | 'film' | 'dining' | 'fashion' | 'travel' | 'books';

export interface QlooEntity {
  id: string;
  name: string;
  domain: QlooDomain;
  subcategories: string[];
  vibeVectors: {
    aesthetic: string;       // e.g. "minimalist", "brutalist", "vintage", "avant-garde", "warm-artisanal"
    energyLevel: number;     // 0.0 (ambient/chill) - 1.0 (kinetic/intense)
    exclusivityIndex: number;// 0.0 (mass-market) - 1.0 (subcultural/niche)
    culturalEra: string;     // e.g. "90s-indie", "contemporary-nordic", "70s-analog", "futuristic-tokyo"
  };
  tags: string[];
  popularityScore: number;
}

export interface TasteCorrelation {
  sourceEntityId: string;
  targetEntityId: string;
  sourceDomain: QlooDomain;
  targetDomain: QlooDomain;
  affinityScore: number;    // 0.00 - 1.00
  coherenceReasoning: string;
  sharedAestheticTags: string[];
}

export interface QlooClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class QlooClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  // Curated knowledge graph for autonomous offline verification & zero-latency edge operation
  private static readonly CURATED_TASTE_GRAPH: Record<string, QlooEntity> = {
    // Music
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
      tags: ['cerebral', 'algorithmic', 'complex-polyrhythm', 'subversive'],
      popularityScore: 0.81
    },

    // Dining & Drinks
    'dining_natural_wine_bistrot': {
      id: 'dining_natural_wine_bistrot',
      name: 'Cave à Manger (Low-Intervention Natural Wine & Small Plates)',
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
      name: 'Slow-Drip Jazz Kissaten (Charcoal Roasted Siphon Coffee)',
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
      name: 'Nordic Fermentation Lab (Minimalist Foraged Gastronomy)',
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

    // Film
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

    // Fashion & Design
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

    // Travel & Destinations
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
      tags: ['brutalist-clean', 'subversive', 'unfiltered', 'experimental'],
      popularityScore: 0.84
    }
  };

  constructor(config: QlooClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.QLOO_API_KEY || 'qloo_hackathon_agent_key_2026';
    this.baseUrl = config.baseUrl || 'https://api.qloo.com/v2';
    this.timeoutMs = config.timeoutMs || 8000;
  }

  /**
   * Get entity by ID or search by name
   */
  public async getEntity(idOrName: string): Promise<QlooEntity | null> {
    const normalized = idOrName.toLowerCase().trim();
    
    // Direct ID match
    if (QlooClient.CURATED_TASTE_GRAPH[normalized]) {
      return QlooClient.CURATED_TASTE_GRAPH[normalized];
    }

    // Name or keyword match
    for (const entity of Object.values(QlooClient.CURATED_TASTE_GRAPH)) {
      if (
        entity.name.toLowerCase().includes(normalized) ||
        entity.subcategories.some(s => s.toLowerCase().includes(normalized)) ||
        entity.tags.some(t => t.toLowerCase().includes(normalized))
      ) {
        return entity;
      }