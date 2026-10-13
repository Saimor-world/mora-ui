export type CapitalOpportunityKind = 'grant' | 'builder-revenue' | 'yield';
export type CapitalOpportunityStatus = 'open' | 'available' | 'verify';
export type CapitalOpportunityRisk = 'low' | 'medium' | 'high';

export interface CapitalOpportunity {
  id: string;
  title: string;
  provider: string;
  kind: CapitalOpportunityKind;
  status: CapitalOpportunityStatus;
  summary: string;
  whyItFits: string;
  sourceUrl: string;
  verifiedAt: string;
  risk: CapitalOpportunityRisk;
  requiresSigning: boolean;
  requiresKyc: boolean | null;
  requiresCapital: boolean;
  actionLabel: string;
}

/**
 * Curated, official-source opportunities for the Capital surface.
 *
 * This is deliberately not an airdrop feed. Entries must point to an official
 * provider source and carry a verification date. Saimôr may surface and assess
 * them, but must never sign, deposit or apply automatically.
 */
export const CAPITAL_OPPORTUNITIES: CapitalOpportunity[] = [
  {
    id: 'xrpl-glow-wave-5',
    title: 'GLOW · Wave #5',
    provider: 'XRPL Commons',
    kind: 'grant',
    status: 'open',
    summary: 'Anerkennung und Prämien für sinnvolle Beiträge zum XRP-Ledger-Ökosystem. Wave #5 ist gerade offen.',
    whyItFits: 'Saimôr baut bereits eine echte XRPL-Integration. Ein fokussierter Open-Source-Beitrag oder ein Entwickler-Tool könnte eine passende Einreichung werden.',
    sourceUrl: 'https://glow.xrpl-commons.org/',
    verifiedAt: '2026-09-06',
    risk: 'low',
    requiresSigning: false,
    requiresKyc: null,
    requiresCapital: false,
    actionLabel: 'Eignung prüfen',
  },
  {
    id: 'xrpl-developer-funding',
    title: 'XRPL Developer Funding',
    provider: 'XRP Ledger',
    kind: 'grant',
    status: 'available',
    summary: 'Offizielle Förderwege: meilenstein- oder anreizbasierte Grants, Hackathons, Accelerator und technische Unterstützung.',
    whyItFits: 'Capital-Schiene, agentische Zahlungen und künftige Saimôr-Integrationen sind konkrete XRPL-Produktarbeit – kein spekulativer Token-Pitch.',
    sourceUrl: 'https://xrpl.org/community/developer-funding',
    verifiedAt: '2026-09-06',
    risk: 'low',
    requiresSigning: false,
    requiresKyc: null,
    requiresCapital: false,
    actionLabel: 'Programme ansehen',
  },
  {
    id: 'xaman-ecosystem-fund',
    title: 'Xaman Ecosystem Fund',
    provider: 'Xaman',
    kind: 'builder-revenue',
    status: 'verify',
    summary: 'Xaman hat ein Revenue-Share-Modell angekündigt: Integrationen erhalten einen Anteil der Xaman-Servicegebühren, die über sie entstehen.',
    whyItFits: 'Wird Saimôr später eine echte Xaman-Integration oder xApp, wäre das eine wiederkehrende Einnahmequelle statt eines Einmal-Bonus.',
    sourceUrl: 'https://xaman.app/blog/ecosystem-fund',
    verifiedAt: '2026-09-06',
    risk: 'low',
    requiresSigning: false,
    requiresKyc: null,
    requiresCapital: false,
    actionLabel: 'Aktuellen Status prüfen',
  },
  {
    id: 'xaman-flare-xrpfi',
    title: 'Flare XRPFi Yield',
    provider: 'Flare · Xaman',
    kind: 'yield',
    status: 'available',
    summary: 'Eine Xaman-xApp öffnet selbstverwahrte XRP-Rendite-Strategien über Flare Smart Accounts und FAssets.',
    whyItFits: 'Nur als optionale Kapital-Schiene relevant. Kein geschenktes Geld: Mittel fließen in DeFi-Strategien Dritter und bleiben Kapital im Risiko.',
    sourceUrl: 'https://xaman.app/blog/flare',
    verifiedAt: '2026-09-06',
    risk: 'high',
    requiresSigning: true,
    requiresKyc: null,
    requiresCapital: true,
    actionLabel: 'Nur analysieren',
  },
];
