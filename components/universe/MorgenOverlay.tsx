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

  return (
    <div className="pointer-events-none fixed inset-0 z-[40]" data-testid="universe-v2-overlay" data-phase={phase}>
      {/* Tagesphase: leiser Schleier über dem bestehenden Hintergrund */}
      <div className="absolute inset-0 transition-[background] duration-[3000ms]" style={{ background: TINT[phase] }} />

      {/* MÔRAs warmes Licht nahe der Mitte */}
      <div className="absolute left-1/2 top-[49%] -translate-x-1/2 -translate-y-1/2">
        <div className="h-44 w-44 rounded-full" style={{ background: `radial-gradient(circle, rgba(255,214,150,${night ? 0.10 : 0.22}) 0%, rgba(255,190,120,0.06) 40%, transparent 70%)`, animation: 'uv2breath 7s ease-in-out infinite' }} />
      </div>

      {/* Begrüßung oben, schmal */}
      <div className="absolute left-1/2 top-[53%] w-[280px] -translate-x-1/2 text-center">
        <p className="font-light tracking-wide text-white/80" style={{ fontSize: 15 }}>{GREETING[phase]}</p>
        {phase === 'abend' && <p className="mt-1 text-[11px] leading-snug text-white/45">Heute: 3 Vorschläge, 2 freigegeben, 1 offen bis morgen. Die Wache war still.</p>}
        {night && <p className="mt-1 text-xs text-white/40">Alles ruht. Nur die Wache bleibt wach.</p>}
      </div>

      {/* Sternbilder an echten Planeten, je mit Quellenzeile */}
      {items.map((it, i) => {
        const slot = slots[i];
        if (slot === null) return null;
        const a = usable[slot];
        const W = 160;
        const toLeft = a.x < cx - 40; // Text nach außen, weg von MÔRAs Licht und den Planetennamen
        const left = toLeft ? a.x - a.r - 10 - W : a.x + a.r + 10;
        return (
          <div key={i} className="absolute flex items-start gap-2" data-testid="uv2-constellation"
            style={{ left: Math.max(12, left), top: a.y - a.r - 6, width: W, flexDirection: toLeft ? 'row-reverse' : 'row', textAlign: toLeft ? 'right' : 'left' }}>
            <Constellation seed={i} dim={phase === 'abend'} />
            <div className="min-w-0">
              <p className="text-[12px] leading-tight text-white/85">{it.title}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-amber-100/45">{it.source}</p>
            </div>
          </div>
        );
      })}

      {/* Nachts leuchtet nur die Wache */}
      {night && watch && (
        <div className="absolute rounded-full" data-testid="uv2-watch-glow"
          style={{ left: watch.x - watch.r * 2.2, top: watch.y - watch.r * 2.2, width: watch.r * 4.4, height: watch.r * 4.4, background: 'radial-gradient(circle, rgba(229,115,115,0.22), transparent 65%)', animation: 'uv2breath 6s ease-in-out infinite' }} />
      )}

      {today === 'nebel' && (
        <p className="absolute left-1/2 top-[56%] -translate-x-1/2 text-xs italic text-white/40">MÔRAs Tagesbild liegt noch im Nebel – Quelle nicht erreichbar.</p>
      )}

      {/* Komet + ruhiges Seitenfeld */}
      {showComet && data?.proposal && (
        <>
          <div className="absolute" data-testid="uv2-comet" style={{ right: 300, top: 150, width: 120, height: 1.5, transform: 'rotate(-28deg)', transformOrigin: 'right center', background: 'linear-gradient(to left, rgba(255,236,200,0.95), rgba(255,236,200,0.25) 30%, transparent)', borderRadius: 2, boxShadow: '2px 0 8px rgba(255,230,190,0.8)' }} />
          <aside className="pointer-events-auto absolute right-7 top-[184px] w-[262px] rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md" data-testid="uv2-proposal">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-100/60">Vorschlag</p>
            <p className="mt-1.5 text-[14px] leading-snug text-white/90">{data.proposal.label}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/55">{data.proposal.reason}</p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/35">Quelle · {data.proposal.sources.join(' · ')}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={demo} className="rounded-full bg-amber-100/90 px-4 py-1.5 text-xs text-black disabled:opacity-70">Ja, freigeben</button>
              <button type="button" onClick={() => setDismissed(true)} className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70">Später</button>
            </div>
          </aside>
        </>
      )}

      {/* Ehrlicher Nebel für nicht angeschlossene Quellen */}
      {!!data?.nebel?.length && !night && (
        <div className="absolute bottom-[92px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.03)', filter: 'blur(0px)' }} data-testid="nebel">
          <p className="text-[11px] italic text-white/45"><span className="not-italic text-[10px] uppercase tracking-[0.14em] text-white/35">Im Nebel · noch nicht angeschlossen:</span> {data.nebel.join(' · ')}</p>
        </div>
      )}

      {demo && (
        <div className="absolute left-7 top-6 rounded-full border border-amber-200/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-100/80">Entwurf · Beispieldaten</div>
      )}
      <style>{`@keyframes uv2breath{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.08);opacity:1}}`}</style>
    </div>
  );
}
