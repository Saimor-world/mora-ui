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
    summary: 'Rewards and recognition for meaningful contributions to the XRP Ledger ecosystem. Wave #5 is currently open.',
    whyItFits: 'Saimôr is already building a real XRPL integration. A focused open-source contribution or developer tool could become an eligible submission.',
    sourceUrl: 'https://glow.xrpl-commons.org/',
    verifiedAt: '2026-09-06',
    risk: 'low',
    requiresSigning: false,
    requiresKyc: null,
    requiresCapital: false,
    actionLabel: 'Eligibility prüfen',
  },
  {
    id: 'xrpl-developer-funding',
    title: 'XRPL Developer Funding',
    provider: 'XRP Ledger',
    kind: 'grant',
    status: 'available',
    summary: 'Official ecosystem funding paths include milestone- or incentive-based grants, hackathons, accelerators and technical support.',
    whyItFits: 'The Capital rail, agentic payments and future Saimôr integrations are concrete XRPL product work rather than a speculative token pitch.',
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
    summary: 'Xaman announced a builder revenue-share model where integrations receive a share of Xaman Service Fee revenue generated through their integration.',
    whyItFits: 'If Saimôr later becomes a genuine Xaman integration or xApp, this is a possible recurring builder revenue rail rather than a one-off bonus.',
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
    summary: 'A Xaman xApp provides access to self-custodial XRP yield strategies through Flare Smart Accounts and FAssets.',
    whyItFits: 'Relevant only as an optional productive-capital rail. It is not free money: funds are deployed into third-party DeFi strategies and remain capital at risk.',
    sourceUrl: 'https://xaman.app/blog/flare',
    verifiedAt: '2026-09-06',
    risk: 'high',
    requiresSigning: true,
    requiresKyc: null,
    requiresCapital: true,
    actionLabel: 'Nur analysieren',
  },
];
