import { FEATURE_MANIFESTS } from '@/features/registry';
import { LEGACY_APP_PLACEMENT } from '@/lib/os-prototype/legacyApps';
import { getAppManifest } from '@/lib/apps/appRegistry';

/**
 * Explainable proposed actions.
 *
 * MÔRA never executes on its own. Every proposal carries an explanation and a
 * reversibility class. Reversible (navigation / opening a view) runs on click;
 * anything else requires an explicit confirmation dialog — and in this
 * prototype is NOT forwarded to CORE at all.
 */
export type ProposalKind = 'navigate' | 'open-legacy' | 'prepare';

export interface MoraProposal {
  id: string;
  kind: ProposalKind;
  label: string;
  explanation: string;
  reversible: boolean;
  target: string; // feature id or legacy app id
}

const OPEN_WORDS = /(öffne|zeige?|zeig|geh(e)? zu|wechsel(e)? zu|open|show)\s+/i;
const PREPARE_WORDS = /(sende|schick|antworte|lösche|überweise|zahle|buche|mint|signiere|send|delete|pay)/i;

function norm(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function proposeActions(input: string, currentFeatureId: string | null): MoraProposal[] {
  const text = norm(input);
  const out: MoraProposal[] = [];
  const wantsOpen = OPEN_WORDS.test(input);

  for (const m of FEATURE_MANIFESTS) {
    if (m.id === currentFeatureId) continue;
    const words = [m.id, m.title, ...(m.keywords || [])].map(norm);
    if (words.some((w) => w.length > 2 && text.includes(w))) {
      out.push({
        id: `nav-${m.id}`,
        kind: 'navigate',
        label: `${m.title} öffnen`,
        explanation: `Deine Nachricht erwähnt „${m.title}“. Das wechselt nur die Ansicht – nichts wird verändert.`,
        reversible: true,
        target: m.id,
      });
    }
  }

  if (wantsOpen) {
    for (const entry of LEGACY_APP_PLACEMENT) {
      const name = getAppManifest(entry.appId)?.name || entry.appId;
      if (text.includes(norm(entry.appId)) || text.includes(norm(name))) {
        out.push({
          id: `legacy-${entry.appId}`,
          kind: 'open-legacy',
          label: `${name} (klassisch) öffnen`,
          explanation: 'Öffnet die bestehende App als Fenster. Rein lesend, jederzeit schließbar.',
          reversible: true,
          target: entry.appId,
        });
      }
    }
  }

  if (PREPARE_WORDS.test(input)) {
    out.push({
      id: 'prepare-action',
      kind: 'prepare',
      label: 'Aktion vorbereiten',
      explanation: 'Das klingt nach einer Handlung mit Außenwirkung. MÔRA bereitet nur vor – ausgeführt wird erst nach deiner ausdrücklichen Bestätigung.',
      reversible: false,
      target: currentFeatureId || 'mora',
    });
  }

  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, 4);
}
