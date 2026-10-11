# Qloo Cultural Taste Agent 🍸🎭

> **Submitted to the Qloo Agentic Hackathon ($25,000 Cash Prizes + $25,000 Investment Bonus by Jason Calacanis)**  
> **Hosted by:** Qloo on Devpost  
> **Judges:** Jason Calacanis, Mike Diolosa (CTO, Qloo), Nicole Seligman (OpenAI Board of Directors), Todd Boehly (CEO, Eldridge), Cedric the Entertainer  
> **Live Interactive Studio:** [https://liutingqiu.github.io/qloo-cultural-taste-agent/](https://liutingqiu.github.io/qloo-cultural-taste-agent/)  
> **GitHub Repository:** [https://github.com/liutingqiu/qloo-cultural-taste-agent](https://github.com/liutingqiu/qloo-cultural-taste-agent)  
> **Author & Lead Engineer:** Tingqiu Liu (`@liutingqiu`, `tianqi689@gmail.com`)  
> **Test Status:** 6/6 Automated Unit Tests Passing (100% Pass Rate)

---

## 🌟 Executive Summary: Cultural Grounding for Autonomous AI Agents

Modern AI agents (Claude, AutoGen, CrewAI) excel at logical reasoning, multi-step tool execution, and code generation. However, **they are culturally blind**. 
When asked to recommend a restaurant for an indie music lover, design an aesthetic itinerary, or pair wine with music, generic LLMs fall back on generic cliches and popular averages:
- They guess based on token co-occurrence rather than **multidimensional taste resonance**.
- They cannot differentiate between commercial popularity and genuine subcultural coherence (e.g. pairing aggressive fast food with meditative ambient vinyl listening).
- They lack an objective metric for **Cultural Coherence**.

**Qloo Cultural Taste Agent** equips autonomous AI agents with Qloo's cultural intelligence (250M+ entities across Music, Dining, Film, Fashion, and Travel). By mapping high-dimensional aesthetic vectors, energy profiles, exclusivity indices, and cultural eras, this agent produces recommendations and itineraries that are genuinely culturally grounded.

---

## 🏗️ System Architecture & Model Context Protocol (MCP)

```text
                  [User Natural Language Intent]
                                │
                                ▼
         [CulturalAgentPipeline: Planner & Entity Resolver]
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │       Model Context Protocol (MCP) Server     │
         │                                              │
         │  1. qloo_resolve_entity                      │
         │  2. qloo_compute_taste_affinity              │
         │  3. qloo_cross_domain_synthesis              │
         │  4. qloo_audit_cultural_fit                  │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
                 [Qloo Taste Graph Core Engine]
  ┌──────────────┬──────────────┬──────────────┬──────────────┐
  │    MUSIC     │    DINING    │     FILM     │   FASHION    │
  │ Shoegaze     │ Natural Wine │ Neo-Noir     │ Issey Miyake │
  │ Modal Jazz   │ Kissaten     │ Cyberpunk    │ Workwear     │
  │ Ambient/IDM  │ Fermentation │ Arthouse     │ Minimalist   │
  └──────────────┴──────────────┴──────────────┴──────────────┘
                                │
                                ▼
       [Cultural Coherence Index (CCI) & Dissonance Audit]
                                │
                                ▼
        [Culturally Grounded Itinerary & Reasoned Output]
```

---

## ⚡ Key Capabilities & Technical Features

### 1. Cross-Domain Cultural Vector Modeling
Each entity in the Qloo Taste Graph is characterized across 4 continuous vector dimensions:
- **Aesthetic Core:** e.g., `ethereal-distortion`, `minimalist-sophistication`, `warm-artisanal`, `futuristic-glitch`, `brutalist-clean`.
- **Energy Level (0.00 – 1.00):** Ambient tranquility vs kinetic high-tempo intensity.
- **Exclusivity Index (0.00 – 1.00):** Mainstream universality vs niche subcultural specialization.
- **Cultural Era:** Cross-generational context from `late-50s-timeless` to `90s-indie` and `contemporary-nordic`.

### 2. Standardized Model Context Protocol (MCP) Tools
Enables any autonomous LLM agent (Claude Desktop, Cursor, OpenAI, LangChain) to interface natively with Qloo:
- `qloo_resolve_entity`: Disambiguates search keywords into canonical Qloo taste nodes.
- `qloo_compute_taste_affinity`: Calculates calibrated mathematical affinity (0.00 to 1.00) between any two entities across different domains.
- `qloo_cross_domain_synthesis`: Given anchor tastes, synthesizes culturally coherent items across desired target domains.
- `qloo_audit_cultural_fit`: Audits multi-entity bundles and itineraries to detect aesthetic dissonance before presentation.

### 3. Interactive Live Workbench
Hosted on GitHub Pages with:
- **Dynamic Taste Network Graph:** Visual SVG relationship map illustrating active cross-domain affinity lines.
- **One-Click Curated Presets:** Instant demonstration of shoegaze/natural wine, modal jazz/kissaten, and IDM/cyberpunk synthesis.
- **Real-Time MCP Execution Trace:** Transparent inspectability of every agent tool call, arguments, and observations.

---

## 🧪 Verification & Test Suite

The project includes 6 automated unit tests with zero external test framework dependencies:

```bash
cd qloo-cultural-taste-agent
npm test
```

**Test Results:**
```text
✔ 1. QlooClient resolves entities by ID, genre keyword, and filters by domain
✔ 2. computeTasteAffinity calculates calibrated cross-domain resonance scores
✔ 3. TasteGraphEngine synthesizes culturally grounded multi-domain recommendations
✔ 4. auditCulturalCoherence correctly evaluates cultural harmony and detects aesthetic dissonance
✔ 5. QlooMcpServer provides valid MCP tool specifications and executes tool calls
✔ 6. CulturalAgentPipeline end-to-end planAndExecute produces verified reasoning trace and itinerary
ℹ tests 6
ℹ pass 6
ℹ fail 0
ℹ duration_ms 97ms
```

---

## 📄 Open Source License
Licensed under the [MIT License](LICENSE).
