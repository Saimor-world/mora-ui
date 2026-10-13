'use client';

/**
 * Universe v2 – „Der Morgen“ als leise Ebene ÜBER dem echten Universe.
 * Kein eigener Raum: Hintergrund, Planeten und Dock bleiben unverändert.
 * Die Ebene liest nur die Positionen der echten Planeten (data-planet-name)
 * und hängt kleine Sternbilder mit Quellenzeile daran.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { coreGet } from '@/lib/api/http';

type Item = { title: string; source: string; area?: string };
type Proposal = { id: string; label: string; reason: string; sources: string[]; undo?: string };
type Today = { text?: string; items: Item[]; proposal: Proposal | null; nebel?: string[] };
export type DayPhase = 'morgen' | 'tag' | 'abend' | 'nacht';
type Anchor = { name: string; x: number; y: number; r: number };

const unwrap = (r: any) => (r && typeof r === 'object' && 'data' in r && Object.keys(r).length <= 2 ? r.data : r);

export function phaseForHour(h: number): DayPhase {
  if (h >= 5 && h < 11) return 'morgen';
  if (h >= 11 && h < 17) return 'tag';
  if (h >= 17 && h < 22) return 'abend';
  return 'nacht';
}

/** Leichter Farbschleier über dem bestehenden Hintergrund – nie deckend. */
const TINT: Record<DayPhase, string> = {
  morgen: 'radial-gradient(ellipse at 50% 30%, rgba(255,196,128,0.10), transparent 60%)',
  tag: 'radial-gradient(ellipse at 50% 40%, rgba(180,210,255,0.05), transparent 65%)',
  abend: 'radial-gradient(ellipse at 50% 70%, rgba(214,120,90,0.12), transparent 65%), linear-gradient(to bottom, transparent, rgba(40,10,30,0.18))',
  nacht: 'linear-gradient(to bottom, rgba(2,4,14,0.42), rgba(2,4,14,0.30))',
};
const GREETING: Record<DayPhase, string> = {
  morgen: 'Guten Morgen, Marius.', tag: 'Ein ruhiger Tag.', abend: 'Guten Abend, Marius.', nacht: 'Die Wache hält Licht.',
};

const DEMO: Today = {
  items: [
    { title: 'Rechnung R-2041 seit 14 Tagen offen', source: 'Buchhaltung · Offene Posten', area: 'Finanzen' },
    { title: 'Bankgespräch heute um 10:00', source: 'Kalender · heute', area: 'Post & Termine' },
    { title: 'Website-Update wartet auf Freigabe', source: 'Werkstatt · Freigaben', area: 'Werkstatt' },
    { title: 'Leitfaden „Onboarding“ seit 30 Tagen ungeprüft', source: 'Wissen · Dokumente', area: 'Wissen' },
  ],
  proposal: {
    id: 'demo', label: 'Zahlungserinnerung für R-2041 senden',
    reason: 'Die Rechnung ist 14 Tage überfällig. Eine freundliche Erinnerung ist üblich und ändert nichts an der Buchhaltung.',
    sources: ['Buchhaltung · Offene Posten'], undo: 'Bis zum Versand jederzeit zurückziehbar.',
  },
  nebel: ['Bankumsätze', 'Reichweite in Monaten'],
};

function isDemo(): boolean {
  if (typeof window === 'undefined') return false;
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return local && /(?:^|;\s*)mora_session=local_demo_fallback/.test(document.cookie);
}

function readPhase(): DayPhase {
  if (typeof window !== 'undefined' && isDemo()) {
    const p = new URLSearchParams(window.location.search).get('phase');
    if (p === 'morgen' || p === 'tag' || p === 'abend' || p === 'nacht') return p;
  }
  return phaseForHour(new Date().getHours());
}

const AREA_HINTS: [RegExp, RegExp][] = [
  [/finanz|buchhalt|rechnung|bank|umsatz/i, /finanz|wirtschaft|finance/i],
  [/kalender|termin|post|mail|eingang/i, /post|termin|kalender|mail/i],
  [/werkstatt|freigabe|github|deploy|engineering/i, /werkstatt|engineering|technik|product/i],
  [/wissen|dokument|leitfaden/i, /wissen|knowledge/i],
  [/wache|nightwatch|server/i, /wache|watch/i],
];

/** Ordnet jeden Punkt dem passenden echten Planeten zu (Bereich → Quelle → Reihenfolge). */
export function assignToPlanets<T extends { title: string; source: string; area?: string }>(items: T[], planets: string[]): (number | null)[] {
  const used = new Set<number>();
  const pick = (test: (name: string) => boolean) => {
    const i = planets.findIndex((n, k) => !used.has(k) && test(n));
    if (i >= 0) used.add(i);
    return i >= 0 ? i : null;
  };
  const res = items.map((it) => {
    if (it.area) { const i = pick((n) => n.toLowerCase() === it.area!.toLowerCase()); if (i !== null) return i; }
    const hint = AREA_HINTS.find(([src]) => src.test(it.source + ' ' + it.title));
    return hint ? pick((n) => hint[1].test(n)) : null;
  });
  return res.map((r) => (r !== null ? r : pick(() => true)));
}

/** Kleines Sternbild: 3–4 Punkte, feine Linien, deterministisch je Index. */
function Constellation({ seed, dim }: { seed: number; dim?: boolean }) {
  const shapes = [
    [[0, 10], [12, 0], [26, 6], [34, 18]],
    [[0, 4], [10, 16], [24, 12], [30, 0]],
    [[0, 14], [14, 8], [22, 18], [34, 6]],
    [[0, 0], [8, 12], [22, 14], [32, 4]],
  ];
  const pts = shapes[seed % shapes.length];
  return (
    <svg width="38" height="22" viewBox="-2 -2 38 22" className="shrink-0" aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,236,200,0.35)" strokeWidth="0.6" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 1 ? 1.6 : 1.1} fill={dim ? 'rgba(255,255,255,0.4)' : 'rgba(255,240,210,0.95)'} />
      ))}
    </svg>
  );
}

export function MorgenOverlay() {
  const [phase, setPhase] = useState<DayPhase>('morgen');
  const [demo, setDemo] = useState(false);
  const [today, setToday] = useState<Today | 'nebel' | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [vw, setVw] = useState(1440);

  useEffect(() => {
    setPhase(readPhase());
    const d = isDemo(); setDemo(d);
    if (d) setToday(DEMO);
    else coreGet('/v3/mora/today').then((r) => setToday(unwrap(r))).catch(() => setToday('nebel'));
  }, []);

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    // Echte Planeten des Universe: Organisationsfeld (data-mora-label) oder PlanetLayer (data-planet-name)
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="territory-"], [data-testid^="locked-territory-"], [data-planet-name]'));
    setAnchors(els.map((el) => {
      const body = el.querySelector<HTMLElement>('.saimor-territory-body') || el;
      const r = body.getBoundingClientRect();
      return { name: el.dataset.moraLabel || el.dataset.planetName || '', x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 };
    }).filter((a) => a.r > 4 && a.r < 200));
  }, []);

  useEffect(() => {
    measure();
    const t = window.setInterval(measure, 1500);
    window.addEventListener('resize', measure);
    return () => { window.clearInterval(t); window.removeEventListener('resize', measure); };
  }, [measure]);

  const data = today && today !== 'nebel' ? today : null;
  const night = phase === 'nacht';
  const cx = vw / 2;
  // Sternbilder hängen an echten Planeten, in fester Reihenfolge von oben nach unten.
  const usable = [...anchors].sort((a, b) => a.y - b.y || a.x - b.x);
  const items = night ? [] : (data?.items ?? []).slice(0, Math.min(4, usable.length));
  const slots = assignToPlanets(items, usable.map((a) => a.name));
  const watch = anchors.find((a) => /wache|watch/i.test(a.name));
  const showComet = !night && phase !== 'abend' && !!data?.proposal && !dismissed;

  // Nur im Universe (wenn echte Planeten sichtbar sind) – sonst bleibt das OS unberührt.
  if (anchors.length === 0) return null;

  const n = items.length;
  const SUB: Record<DayPhase, string> = {
    morgen: n ? `${n === 1 ? 'Eine Sache ist' : `${['', '', 'Zwei', 'Drei', 'Vier'][n]} Dinge sind`} heute wichtig${data?.proposal ? ' – eine wartet auf dich.' : '.'}` : 'Nichts drängt heute.',
    tag: n ? 'Nur was sich bewegt, leuchtet.' : 'Alles ruhig.',
    abend: 'Heute: 3 Vorschläge, 2 freigegeben, 1 offen bis morgen. Die Wache war still.',
    nacht: 'Alles ruht. Nur die Wache bleibt wach.',
  };
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div className="pointer-events-none fixed inset-0 z-[40] antialiased" data-testid="universe-v2-overlay" data-phase={phase}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      {/* Tagesphase: leiser Schleier über dem bestehenden Hintergrund */}
      <div className="absolute inset-0 transition-[background] duration-[3000ms]" style={{ background: TINT[phase] }} />

      {/* MÔRAs Licht – kein Ring, kein Text darin, nur Atem */}
      <div className="absolute left-1/2 top-[49%] -translate-x-1/2 -translate-y-1/2">
        <div className="h-56 w-56 rounded-full" style={{ background: `radial-gradient(circle, rgba(255,222,170,${night ? 0.08 : 0.16}) 0%, rgba(255,200,140,0.04) 42%, transparent 70%)`, animation: `uv2breath 9s ${ease} infinite` }} />
      </div>

      {/* Eine Überschrift: MÔRAs Begrüßung + ein Satz. Ersetzt „Woraus … besteht“. */}
      <header className="absolute left-1/2 top-[104px] w-[min(640px,90vw)] -translate-x-1/2 text-center" data-testid="uv2-greeting"><div style={{ animation: `uv2in 1.2s ${ease} both` }}>
        <h1 className="font-semibold text-white" style={{ fontSize: 34, lineHeight: '40px', letterSpacing: '-0.022em', textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}>{GREETING[phase]}</h1>
        <p className="mt-2 text-white/60" style={{ fontSize: 15, lineHeight: '20px', letterSpacing: '-0.01em', textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>{SUB[phase]}</p>
      </div></header>

      {/* Sternbilder an echten Planeten – zwei Textebenen, gleiche Abstände */}
      {items.map((it, i) => {
        const slot = slots[i];
        if (slot === null) return null;
        const a = usable[slot];
        const toLeft = a.x < cx - 40;
        // Rechts nie unter das Vorschlagsfeld laufen (rechter Rand 24 + Breite 296 + Luft 24).
        const limit = showComet ? vw - 24 - 296 - 24 : vw - 24;
        const W = toLeft ? 176 : Math.max(120, Math.min(176, limit - (a.x + a.r + 16)));
        const left = toLeft ? a.x - a.r - 16 - W : a.x + a.r + 16;
        return (
          <div key={i} className="absolute flex items-start gap-2.5" data-testid="uv2-constellation"
            style={{ left: Math.max(24, left), top: a.y - a.r - 4, width: W, flexDirection: toLeft ? 'row-reverse' : 'row', textAlign: toLeft ? 'right' : 'left', animation: `uv2in 1.4s ${ease} ${0.6 + i * 0.25}s both` }}>
            <Constellation seed={i} dim={phase === 'abend'} />
            <div className="min-w-0" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.75)' }}>
              <p className="font-medium text-white/90" style={{ fontSize: 13, lineHeight: '17px', letterSpacing: '-0.005em' }}>{it.title}</p>
              <p className="mt-1 text-white/45" style={{ fontSize: 11, lineHeight: '14px' }}>{it.source}</p>
            </div>
          </div>
        );
      })}

      {night && watch && (
        <div className="absolute rounded-full" data-testid="uv2-watch-glow"
          style={{ left: watch.x - watch.r * 2.2, top: watch.y - watch.r * 2.2, width: watch.r * 4.4, height: watch.r * 4.4, background: 'radial-gradient(circle, rgba(229,115,115,0.18), transparent 65%)', animation: `uv2breath 8s ${ease} infinite` }} />
      )}

      {today === 'nebel' && (
        <p className="absolute left-1/2 top-[160px] -translate-x-1/2 text-[13px] text-white/45">MÔRAs Tagesbild liegt noch im Nebel – Quelle nicht erreichbar.</p>
      )}

      {/* Komet: eine feine Spur, die im Vorschlag endet */}
      {showComet && data?.proposal && (
        <>
          <div className="absolute" data-testid="uv2-comet" style={{ right: 24 + 296 - 8, top: 212, width: 96, height: 1, transform: 'rotate(-24deg)', transformOrigin: 'right center', background: 'linear-gradient(to left, rgba(255,240,215,0.9), transparent)', animation: `uv2fade 1.6s ${ease} 1.4s both` }} />
          <aside className="pointer-events-auto absolute right-6 top-[200px] w-[296px] rounded-[20px] p-5" data-testid="uv2-proposal"
            style={{ background: 'rgba(22,24,30,0.58)', backdropFilter: 'blur(40px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.45)', animation: `uv2in 1.2s ${ease} 1.8s both` }}>
            <p className="font-medium text-amber-100/70" style={{ fontSize: 12, lineHeight: '16px' }}>MÔRA schlägt vor</p>
            <p className="mt-2 font-semibold text-white" style={{ fontSize: 17, lineHeight: '22px', letterSpacing: '-0.015em' }}>{data.proposal.label}</p>
            <p className="mt-2 text-white/60" style={{ fontSize: 13, lineHeight: '18px' }}>{data.proposal.reason}</p>
            <p className="mt-3 text-white/40" style={{ fontSize: 11, lineHeight: '14px' }}>Quelle: {data.proposal.sources.join(', ')}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" disabled={demo} className="h-9 rounded-full bg-white font-semibold text-black transition-transform active:scale-[0.97] disabled:opacity-80" style={{ fontSize: 13 }}>Freigeben</button>
              <button type="button" onClick={() => setDismissed(true)} className="h-9 rounded-full font-medium text-white/80 transition-colors hover:bg-white/15" style={{ fontSize: 13, background: 'rgba(255,255,255,0.08)' }}>Später</button>
            </div>
          </aside>
        </>
      )}

      {/* Ehrlicher Nebel – eine leise Zeile, kein Kasten */}
      {!!data?.nebel?.length && !night && (
        <p className="absolute bottom-[124px] left-1/2 -translate-x-1/2 whitespace-nowrap text-white/40" data-testid="nebel" style={{ fontSize: 12, textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
          Noch im Nebel: {data.nebel.join(', ')}
        </p>
      )}

      {demo && (
        <div className="absolute left-6 top-6 rounded-full px-2.5 py-1 font-medium text-amber-100/75" style={{ fontSize: 11, background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 0 0 0.5px rgba(255,220,160,0.3)' }}>Entwurf · Beispieldaten</div>
      )}
      <style>{`@keyframes uv2breath{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.05);opacity:1}}@keyframes uv2fade{from{opacity:0}to{opacity:1}}@keyframes uv2in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){[data-testid=universe-v2-overlay] *{animation:none!important}}`}</style>
    </div>
  );
}
