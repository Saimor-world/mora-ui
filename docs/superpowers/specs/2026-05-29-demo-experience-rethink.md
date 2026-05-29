# SAIMÔR Demo Experience — Complete Rethink

**Date:** 2026-05-29
**Author:** Opus 4.8 (concept + plan; implementation → cheaper models)
**Status:** Concept approved (guided story + example workspace). Detailing.
**Supersedes:** the "demo = subset of OS apps" framing in the master roadmap §4.9.

---

## The reframe

The demo is **not** the employee OS with fewer apps. It is a **curated, guided experience that runs *on* the OS platform** — its own face, its own design language, its own purpose. Calendar, terminal, finder file-tree, integrations panels = noise for a first-time visitor who just saw their security score.

**The demo's single job:** turn a curious Security-Check visitor's "huh" into "I want this." It is SAIMÔR's shop window.

**Hard principles (from the user, locked):**
- No synthetic/mock data, ever. The example workspace is a **real, curated showcase tenant** (genuine content in the DB, maintained like Salesforce's demo org) — not render-time fakes.
- Demo must feel **rich**, never empty, never dead-ending.
- **Guided, never lost** — Mora always offers the next meaningful step.

---

## Two layers, one narrative

### Layer 1 — Personal guided story (the spine)
Mora leads the visitor through a 4-beat arc, each beat a designed moment in the expressive tier (glow, motion, big typographic moments — AuditDossierView/Signal-Wall energy):

1. **Ankunft — Living Dossier.** Their score animates in. Mora is *already there*, has read it, opens with a specific insight about THEIR domain ("example.de — die fehlende HSTS-Konfiguration ist dein dringendster Punkt"). Findings reveal progressively. Not a static document — a living briefing.
2. **Verstehen.** Mora explains what the top gaps actually mean for them, prioritized. The visitor feels *understood*, not lectured.
3. **Soziale Beweise — Signal Wall.** "Unternehmen wie deins" — the Wall (already rebuilt). Mora can analyze any entry. The visitor sees they're not alone.
4. **Tiefe — step into a real workspace.** "So arbeitet ein Unternehmen, das auf SAIMÔR läuft" → transition INTO Layer 2.

Climax → **Der Sprung:** "Auf die Wall" — from anonymous visitor to named network contact (the lead). The 20-day dossier becomes permanent.

### Layer 2 — Example company workspace (the depth)
A **real, curated showcase tenant** the visitor can explore to feel daily product use. This is where the *rethought* work surfaces live — and it's our chance to showcase the new navigation model:
- **Universe** — the company map (planets = departments)
- **Department view** — the rethought daily surface: team presence (aura colors) · recent docs · Mora suggestions · ERP/CRM connections
- Only meaningful surfaces. Real curated content. No calendar/terminal noise.

The narrative leads here as beat 4, so the workspace isn't a disconnected sandbox — it's "here's what your world could look like."

---

## What the demo contains (and what it drops)

| Keep / build | Drop from demo |
|---|---|
| Living Dossier (their result) | Calendar |
| Mora (context-aware, guides story) | Terminal |
| Signal Wall | Finder file-tree as primary nav |
| Example workspace (Universe + Department) | Integrations panel |
| "Auf die Wall" conversion | Mission Control / Tageslage employee chrome |
| Curated demo dock | Settings, Mail (for visitor) |

**Curated demo dock:** Dossier · Mora · Wall · Beispiel-Workspace. That's it. Expressive, not minimal — each is a designed destination, not a utility icon.

---

## Surfaces — build inventory

| # | Surface | Status | Work |
|---|---|---|---|
| D1 | **Demo narrative controller** | NEW | Orchestrates the 4-beat arc: per-beat Mora prompt, transitions, "next step" affordance. State machine gated to `public_playground`. |
| D2 | **Living Dossier** | EXTEND `AuditDossierView` | Add Mora-present opening, progressive reveal, "Mora's first insight" hook. |
| D3 | **Mora demo persona** | DEPENDS on Mora Hybrid (spike) | Pre-seeded with audit context; drives narrative beats. Until Hybrid lands: scripted prompts. |
| D4 | **Signal Wall** | DONE (rebuilt) | Slot into beat 3; ensure Mora hand-off works. |
| D5 | **Example showcase tenant** | NEW (data) | Curate a real demo company in a tenant: real nodes, real structure, believable but genuine. Maintained as a showcase. |
| D6 | **Universe (demo)** | RETHINK | Company-map view of the showcase tenant. Expressive. |
| D7 | **Department view** | NEW | The rethought daily surface (team presence + recent docs + Mora + ERP/CRM). Showcased here first. |
| D8 | **"Auf die Wall" conversion** | EXTEND (wall-submit exists) | The narrative climax — consent + become-contact moment. |
| D9 | **Curated demo dock** | RETHINK existing Dock | Demo-mode dock = 4 designed destinations; gate everything else. |
| D10 | **Demo design language** | USE design tokens | All of the above consume `lib/design/tokens` — expressive tier. |

---

## Sequencing (each → its own implementation plan for a cheaper model)

**Phase D-1 — The spine (highest impact, mostly existing pieces):**
1. D9 curated demo dock (reframes the whole feel immediately)
2. D2 Living Dossier upgrade
3. D1 narrative controller (scripted Mora first, before Hybrid)
→ ships a coherent guided personal story using what exists.

**Phase D-2 — Social + conversion:**
4. D4 Wall integration into beat 3
5. D8 "Auf die Wall" climax

**Phase D-3 — The depth (the example workspace):**
6. D5 curate the showcase tenant (real content)
7. D7 Department view (new) + D6 Universe demo
8. Narrative beat 4 transition into the workspace

**Phase D-4 — Intelligence:**
9. D3 real Mora persona once the Hybrid spike + build lands (replaces scripted prompts)

---

## Strategic principle — the demo is the design vanguard ("vom Kunden zum Produkt")

The main-system desktop (Home/Universe today) is **also** not good enough. Rather than redesign it in place, we use the **demo as the proving ground**: it's customer-facing (the shop window), so it's where we're free to "go wild" and perfect the new design language. Whatever proves out in the demo then flows **back into the main product**.

```
   DEMO (customer-facing, free to experiment)
        │  design language matures here
        ▼
   MAIN OS (employee product) adopts what proved out
```

Direction of innovation: **customer → product**. This is why surfaces like the Department view (D7) are deliberately dual-use — built once, showcased in the demo, then it IS the real employee surface. The expressive design tokens, the guided-Mora patterns, the atmospheric surfaces: all incubate in the demo, then graduate to the daily OS.

Concretely: every demo surface should be built so its non-narrative core (the Dossier renderer, the Department view, the Mora chat) is a **reusable component** the main OS can mount with real tenant data — not a demo-only throwaway. The narrative controller (D1) and curated dock (D9) stay demo-only; the *surfaces* they orchestrate become product.

## Gating
All demo surfaces gated to `activeMode === 'public_playground'`. A normal authenticated employee NEVER sees the narrative controller, the curated demo dock, or the showcase tenant. The Department view (D7) is dual-use: it's the real daily surface for employees AND showcased in the demo workspace — same component, real data per tenant.

---

## Open questions (for later, not blocking D-1)
- Showcase tenant: invent a fictional-but-real demo company, or use a consenting real customer's (anonymized) setup?
- Department view ERP/CRM: which system do we showcase first (depends on Integrations 4.8 + OpenClaw spike)?
- Narrative pacing: auto-advance beats, or visitor taps "weiter"?
