/**
 * Lokale Vorschau: das bestehende SAIMÔR-Demo-Paket „Simple Coffee Group“.
 *
 * Quelle (Spiegelung, nicht erfunden): saimor-core
 *   core/services/demo_content_packs.py  → CONTENT_PACKS['coffee']
 *   core/services/demo_isolation.py      → DEMO_COFFEE_MAIL_SAMPLES, DEMO_COFFEE_CALENDAR_EVENTS
 * Dieselbe Firma, die CORE über POST /v3/companies/guided-demo { pack: 'coffee' }
 * anlegt und die VisitorHomeSurface / DemoWorkspacesPanel anbieten.
 *
 * Nur ohne CORE-Sitzung und nur auf localhost (NEXT_PUBLIC_OS_PREVIEW=local).
 * Alles ist fiktiv und wird in der UI als „Beispiel“ markiert.
 * Finance: das Coffee-Paket definiert keine Finanzwerte → Finance bleibt ohne Zahl.
 */
export const DEMO_PACK_KEY = 'coffee';
export const DEMO_COMPANY_NAME = 'Simple Coffee Group';

export interface DemoDocument { name: string; summary: string; tags: string[] }
export interface DemoFolder { name: string; documents: DemoDocument[] }
export interface DemoDepartment { id: string; name: string; description: string; color: string; folders: DemoFolder[] }

const doc = (name: string, summary: string, tags: string[]): DemoDocument => ({ name, summary, tags });

export const DEMO_DEPARTMENTS: DemoDepartment[] = [
  { id: 'demo-management', name: 'Management', description: 'Holding und Zentralverwaltung.', color: '#fbbf24', folders: [] },
  { id: 'demo-hr', name: 'HR & Culture', description: 'Handbuch, Onboarding, Feedback.', color: '#f472b6', folders: [
    { name: 'Handbook', documents: [
      doc('employee_handbook.pdf', 'Werte, Arbeitszeit, Urlaub, Zusammenarbeit.', ['hr', 'handbook']),
      doc('onboarding_checklist_hr.pdf', 'Checkliste für neue Teammitglieder.', ['hr', 'onboarding']),
      doc('quarterly_feedback_template.docx', 'Vorlage für Quartalsgespräche.', ['hr', 'feedback']),
    ] },
  ] },
  { id: 'demo-tech', name: 'Technology & AI', description: 'Plattform, Sicherheit, Schnittstellen.', color: '#67e8f9', folders: [
    { name: 'Core System', documents: [
      doc('system_architecture.pdf', 'Ein Core, viele Stores, lokale Intelligenz.', ['tech', 'ai', 'architecture']),
      doc('security_protocols.md', 'Zero-Trust, Mandantentrennung, Verschlüsselung.', ['security']),
      doc('api_specs_v1.md', 'Schnittstellenvertrag für Bereiche, Spaces, Ordner, Knoten.', ['api']),
    ] },
  ] },
  { id: 'demo-marketing', name: 'Marketing & Brand', description: 'Marke, Kampagnen, Visuals.', color: '#a78bfa', folders: [
    { name: 'Visuals', documents: [doc('brand_manual.svg', 'Markenhandbuch zur Freigabe für die Q2-Kampagne.', ['brand'])] },
  ] },
  { id: 'demo-stuttgart', name: 'Store Stuttgart', description: 'Operative Einheit · Operations.', color: '#34d399', folders: [
    { name: 'Operations', documents: [
      doc('roster_stuttgart_q1.xlsx', 'Schichtplanung, Peak 08–10 Uhr mit drei Personen.', ['operations']),
      doc('maintenance_log.pdf', 'Service-Historie Espressomaschine, nächster Service Ende September.', ['maintenance']),
      doc('service_checklist_stuttgart.md', 'Öffnungs- und Schlusscheckliste.', ['checklist']),
    ] },
  ] },
  { id: 'demo-heilbronn', name: 'Store Heilbronn', description: 'Operative Einheit · Local Marketing.', color: '#fb923c', folders: [
    { name: 'Local Marketing', documents: [
      doc('heilbronn_grand_opening.md', 'Eröffnung mit über 500 Gästen.', ['event']),
      doc('heilbronn_social_plan_q1.pdf', 'Social-Plan Q1, Fokus Stammkundschaft.', ['social']),
      doc('heilbronn_partner_list.docx', 'Lokale Partner und Community.', ['partner']),
    ] },
  ] },
  { id: 'demo-sf', name: 'Store San Francisco', description: 'Operative Einheit · Innovation Lab.', color: '#60a5fa', folders: [
    { name: 'Innovation Lab', documents: [
      doc('ai_barista_pilot.pdf', 'Pilot: KI-gestützte Barista-Empfehlungen.', ['ai', 'pilot']),
      doc('customer_journey_sf.json', 'Segmente: Pendler, Remote-Arbeit, Wochenende.', ['journey']),
      doc('sf_feedback_insights.md', 'Auswertung Kundenfeedback.', ['feedback']),
    ] },
  ] },
];

/** core/services/demo_isolation.py → DEMO_COFFEE_MAIL_SAMPLES */
export const DEMO_MAIL = [
  { id: 'demo-mail-1', subject: 'Wochenlieferung Arabica — Store Stuttgart', from: 'logistics@simplecoffeegroup.demo', snippet: 'Die Bohnenlieferung für Dienstag 08:00 ist bestätigt. 120 kg Arabica Premium.', read: false },
  { id: 'demo-mail-2', subject: 'Q2 Marketing-Kampagne — Freigabe Brand Manual', from: 'brand@simplecoffeegroup.demo', snippet: 'Das aktualisierte Brand Manual steht zur Freigabe bereit.', read: false },
  { id: 'demo-mail-3', subject: 'HR: Onboarding Nora Solberg — Start 1. Juli', from: 'hr@simplecoffeegroup.demo', snippet: 'Onboarding-Checkliste und Zugänge sind vorbereitet.', read: true },
  { id: 'demo-mail-4', subject: 'Re: Store San Francisco — Quartalsbericht', from: 'management@simplecoffeegroup.demo', snippet: 'Danke für den Quartalsbericht. Bitte KPIs bis Freitag nachreichen.', read: false },
];

/** core/services/demo_isolation.py → DEMO_COFFEE_CALENDAR_EVENTS (Uhrzeiten aus dem Paket, Datum = heute in der Vorschau) */
export const DEMO_CALENDAR = [
  { id: 'demo-cal-1', title: 'Store Stuttgart — Schichtplanung Q3', time: '09:00', duration: 60, location: 'Store Stuttgart' },
  { id: 'demo-cal-2', title: 'Brand Review — Q2 Kampagne', time: '14:00', duration: 45, location: 'Marketing & Brand' },
  { id: 'demo-cal-3', title: 'SF Innovation Lab — AI Barista Pilot', time: '17:30', duration: 90, location: 'Store San Francisco' },
];

/** CONTENT_PACKS['coffee'].tasks */
export const DEMO_TASKS = [
  'Q2 Marketing-Kampagne vorbereiten',
  'Mitarbeiterbefragung auswerten (HR & Culture)',
  'Store San Francisco: Quartalsbericht einreichen',
  'Technology & AI: Roadmap 2026 finalisieren',
];

/** CONTENT_PACKS['coffee'].mindloop_events (MÔRA-Beobachtungen) */
export const DEMO_MINDLOOP = [
  { id: 'demo-ml-1', category: 'hint', severity: 0.2, hoursAgo: 3, targetId: 'demo-hr', title: 'Môra: HR-Handbuch und Onboarding-Checkliste semantisch verbunden', message: 'Zwei Dokumente im HR & Culture Bereich teilen strukturelle Muster.' },
  { id: 'demo-ml-2', category: 'opportunity', severity: 0.25, hoursAgo: 7, targetId: 'demo-marketing', title: 'Môra entdeckt Zusammenhänge: Marketing ↔ Store Stuttgart', message: 'Kampagnen-Dokumente und Store-Berichte haben überlappende Inhalte.' },
  { id: 'demo-ml-3', category: 'trend', severity: 0.3, hoursAgo: 14, targetId: 'demo-tech', title: 'Technology & AI: Dokumentenaktivität deutlich gestiegen', message: 'In den letzten 48h wurden 6 neue Dokumente angelegt.' },
  { id: 'demo-ml-4', category: 'risk', severity: 0.52, hoursAgo: 22, targetId: 'demo-sf', title: 'Store San Francisco: Budget-Dokument seit 60+ Tagen nicht aktualisiert', message: 'Das Budget-Dokument wurde zuletzt vor mehr als 2 Monaten bearbeitet.' },
  { id: 'demo-ml-5', category: 'hint', severity: 0.18, hoursAgo: 26, targetId: 'demo-management', title: 'Roadmap-Dokumente in 3 Abteilungen strukturell ähnlich — kein Querverweis', message: 'Management, Tech und Marketing teilen Roadmap-Inhalte ohne Verknüpfung.' },
] as const;

/** CONTENT_PACKS['coffee'].feeds (Quellen-Titel) */
export const DEMO_FEED_SOURCES = ['Sprudge', 'Daily Coffee News', 'Perfect Daily Grind', 'Barista Magazine', 'Roast Magazine'];

export function demoDocumentCount(d: DemoDepartment) { return d.folders.reduce((n, f) => n + f.documents.length, 0); }
export function demoAllDocuments() { return DEMO_DEPARTMENTS.flatMap((d) => d.folders.flatMap((f) => f.documents.map((x) => ({ ...x, department: d.name, folder: f.name })))); }
