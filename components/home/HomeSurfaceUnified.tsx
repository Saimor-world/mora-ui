'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Compass,
  FolderOpen,
  Mail,
  MessageCircleMore,
  Radar,
  Search,
  Settings2,
  Sparkles,
  Timer,
  type LucideIcon,
} from 'lucide-react';

import { TodayOverview } from '@/components/home/TodayOverview';
import { openMoraWorkspace } from '@/lib/os/openMoraWorkspace';
import { surfaceMarker, SAIMOR_PRODUCT_LABEL, SAIMOR_SURFACES } from '@/lib/os/surfaceContract';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';

type OpenTarget = {
  id: string;
  type: string;
  title: string;
  size: { width: number; height: number };
};

type Area = OpenTarget & {
  kicker: string;
  description: string;
  icon: LucideIcon;
};

const PRIMARY_AREAS: Area[] = [
  {
    id: 'work-main',
    type: 'work',
    title: 'Arbeit',
    kicker: 'Fokus & Fortschritt',
    description: 'Offene Arbeit, nächste Schritte und laufende Arbeitspläne.',
    icon: Timer,
    size: { width: 1080, height: 760 },
  },
  {
    id: 'mail-main',
    type: 'mail',
    title: 'Mail',
    kicker: 'Kommunikation',
    description: 'Lesen, antworten, sortieren und Wichtiges direkt weiterverarbeiten.',
    icon: Mail,
    size: { width: 1040, height: 720 },
  },
  {
    id: 'calendar-main',
    type: 'calendar',
    title: 'Kalender',
    kicker: 'Zeit',
    description: 'Termine, Tagesstruktur und die nächsten festen Punkte.',
    icon: CalendarDays,
    size: { width: 920, height: 680 },
  },
  {
    id: 'files-main',
    type: 'meine-dateien',
    title: 'Dateien',
    kicker: 'Material & Wissen',
    description: 'Dokumente und Arbeitsmaterial im selben Kontext wie deine Arbeit.',
    icon: FolderOpen,
    size: { width: 960, height: 700 },
  },
];

const SECONDARY_AREAS: Area[] = [
  {
    id: 'timeline-main',
    type: 'timeline',
    title: 'Aktivität',
    kicker: 'Verlauf',
    description: 'Nachvollziehen, was sich im System verändert hat.',
    icon: Activity,
    size: { width: 860, height: 700 },
  },
  {
    id: 'nightwatch-main',
    type: 'nightwatch',
    title: 'Nightwatch',
    kicker: 'System',
    description: 'Störungen, Hinweise und Dinge, die Aufmerksamkeit brauchen.',
    icon: Radar,
    size: { width: 1100, height: 760 },
  },
];

function timeGreeting(hour: number) {
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

/** MÔRA - the jade stone from the Saimôr sigil (same artwork as MoraOrb). */
function PresenceOrb() {
  return (
    <div className="relative h-14 w-14 shrink-0" aria-hidden>
      <motion.div
        className="absolute inset-[-6px] rounded-full bg-emerald-300/10 blur-md"
        animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small static brand asset on the home hero */}
        <img src="/brand/mora-stone-v1.png" alt="" width={56} height={56} draggable={false} className="h-full w-full select-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]" />
      </motion.div>
    </div>
  );
}

function AreaButton({ area, onOpen, compact = false }: { area: Area; onOpen: (area: Area) => void; compact?: boolean }) {
  const Icon = area.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(area)}
      className={`group flex items-start gap-4 rounded-[22px] border border-white/[0.06] bg-black/[0.12] text-left backdrop-blur-[16px] transition hover:border-emerald-100/14 hover:bg-white/[0.025] ${compact ? 'min-h-[102px] p-4' : 'min-h-[124px] p-5'}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.065] bg-white/[0.025] text-emerald-100/60">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-[0.2em] text-white/23">{area.kicker}</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-medium tracking-[-0.02em] text-white/80">{area.title}</h3>
          <ArrowRight size={13} className="text-white/14 transition group-hover:translate-x-0.5 group-hover:text-white/44" />
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/32">{area.description}</p>
      </div>
    </button>
  );
}

export const HomeSurfaceUnified: React.FC = () => {
  const openPane = usePaneStore((state) => state.openPane);
  const setCoreMode = useNavStore((state) => state.setCoreMode);
  const user = useSessionStore((state) => state.user);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const firstName = useMemo(() => {
    // Only a real name is used. An email address or its local part is not a name:
    // "Guten Tag, nextchaptergermany@gmail.com." reads like a system message.
    const raw = String((user as any)?.name || (user as any)?.display_name || (user as any)?.full_name || '').trim();
    if (!raw || raw.includes('@')) return '';
    const first = raw.split(/\s+/)[0] || '';
    const localPart = user?.email?.split('@')[0]?.toLowerCase();
    return localPart && first.toLowerCase() === localPart ? '' : first;
  }, [user]);

  const greeting = now ? timeGreeting(now.getHours()) : 'Willkommen';

  const open = (target: OpenTarget) => {
    openPane({
      id: target.id,
      type: target.type as any,
      title: target.title,
      size: target.size,
    });
  };

  const openSearch = () =>
    open({
      id: 'search-main',
      type: 'search',
      title: 'Suche',
      size: { width: 760, height: 620 },
    });

  const openSettings = () =>
    open({
      id: 'settings-main',
      type: 'settings',
      title: 'Einstellungen',
      size: { width: 920, height: 700 },
    });

  if (isUniverseV2Enabled()) {
    return <HomeV2 greeting={greeting} firstName={firstName} now={now} onOpen={open} onSearch={openSearch} onSettings={openSettings} onMora={() => openMoraWorkspace({ source: 'home', label: 'Heute' })} onUniverse={() => setCoreMode('explore')} />;
  }

  return (
    <div
      {...surfaceMarker(SAIMOR_SURFACES.home)}
      className="pointer-events-auto absolute inset-0 overflow-y-auto px-5 pb-36 pt-20 text-white sm:px-8 lg:px-12 xl:px-16"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4%] top-[2%] h-[520px] w-[520px] rounded-full bg-emerald-400/[0.026] blur-[125px]" />
        <div className="absolute right-[2%] top-[4%] h-[480px] w-[480px] rounded-full bg-violet-500/[0.025] blur-[135px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[1320px]">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-white/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70 shadow-[0_0_14px_rgba(110,231,183,.62)]" />
            {SAIMOR_PRODUCT_LABEL}
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-1 hidden items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-white/22 md:flex">
              <span>
                {now
                  ? now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })
                  : '—'}
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span>{now ? now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            </div>
            <button
              type="button"
              onClick={openSearch}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.055] bg-white/[0.018] text-white/28 transition hover:text-white/62"
              aria-label="Suche öffnen"
            >
              <Search size={12} />
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.055] bg-white/[0.018] text-white/28 transition hover:text-white/62"
              aria-label="Einstellungen öffnen"
            >
              <Settings2 size={12} />
            </button>
          </div>
        </header>

        <section className="mt-12 grid gap-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="flex items-center gap-4">
              <PresenceOrb />
              <div>
                <div className="text-[9px] uppercase tracking-[0.23em] text-emerald-100/40">MÔRA ist da</div>
                <h1 className="mt-2 max-w-[820px] text-[clamp(2.9rem,6vw,5.7rem)] font-medium leading-[0.92] tracking-[-0.065em] text-white/94">
                  {greeting}{firstName ? `, ${firstName}.` : '.'}
                </h1>
              </div>
            </div>
            <p className="mt-7 max-w-[720px] text-[clamp(1rem,1.7vw,1.25rem)] font-light leading-relaxed tracking-[-0.02em] text-white/40">
              Dein Tag, deine Arbeit und alles, was sich verändert — an einem Ort.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/[0.065] bg-black/[0.12] p-4 backdrop-blur-[20px]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-200/10 bg-emerald-400/[0.045] text-emerald-100/65">
                <Sparkles size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase tracking-[0.22em] text-white/25">MÔRA</div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                  Sie kennt den aktuellen Kontext und kann zusammenfassen, priorisieren, planen oder mit dir weiterarbeiten.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openMoraWorkspace({ source: 'home', label: 'Heute' })}
              className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/[0.055] bg-white/[0.02] px-3.5 py-3 text-left text-[11px] text-white/48 transition hover:border-white/[0.10] hover:bg-white/[0.035] hover:text-white/74"
            >
              <span className="flex items-center gap-2">
                <MessageCircleMore size={13} /> Mit MÔRA arbeiten
              </span>
              <ArrowRight size={12} className="text-white/22" />
            </button>
          </div>
        </section>

        <TodayOverview />

        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-white/22">Weiter</div>
              <h2 className="mt-1 text-lg font-medium tracking-[-0.025em] text-white/72">
                Dort weitermachen, wo gerade etwas anliegt.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCoreMode('explore')}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.065] bg-white/[0.02] px-3 py-2 text-[10px] text-white/34 transition hover:text-white/68"
            >
              <Compass size={11} /> Universe
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PRIMARY_AREAS.map((area) => (
              <AreaButton key={area.id} area={area} onOpen={open} />
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-white/[0.045] pt-8">
          <div className="mb-4">
            <div className="text-[9px] uppercase tracking-[0.24em] text-white/20">Im Blick</div>
            <h2 className="mt-1 text-[15px] font-medium tracking-[-0.02em] text-white/58">
              Was sich verändert — und was Aufmerksamkeit braucht.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {SECONDARY_AREAS.map((area) => (
              <AreaButton key={area.id} area={area} onOpen={open} compact />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

const V2_GLASS: React.CSSProperties = {
  background: 'rgba(22,24,30,0.5)',
  backdropFilter: 'blur(40px) saturate(160%)',
  WebkitBackdropFilter: 'blur(40px) saturate(160%)',
  boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.12), 0 12px 32px rgba(0,0,0,0.3)',
};

/**
 * Universe v2 – Home auf Apple-Niveau: ein Datum, eine Begrüßung, ein Satz von MÔRA,
 * ein Eingabefeld. Darunter „Heute“ (ehrlicher Nebel statt vier Fehlerkarten) und alle Orte
 * in einem ruhigen Raster. Keine Versalien-Eyebrows, keine doppelte Suche/Uhr.
 */
function HomeV2({ greeting, firstName, now, onOpen, onSearch, onSettings, onMora, onUniverse }: { greeting: string; firstName: string; now: Date | null; onOpen: (t: OpenTarget) => void; onSearch: () => void; onSettings: () => void; onMora: () => void; onUniverse: () => void }) {
  const [ask, setAsk] = useState('');
  const ease = [0.22, 1, 0.36, 1] as const;
  const dateLabel = now ? now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const areas = [...PRIMARY_AREAS, ...SECONDARY_AREAS];
  const M: React.CSSProperties = { fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' };
  const time = now ? now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div {...surfaceMarker(SAIMOR_SURFACES.home)} data-testid="uv2-home"
      className="pointer-events-auto absolute inset-0 overflow-y-auto px-6 pb-40 pt-[12vh] antialiased sm:px-10 lg:px-24"
      style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif', color: '#F7F4E9', background: 'linear-gradient(90deg, rgba(5,7,6,.7), rgba(5,7,6,.35))' }}>
      <div className="uv2-grain" aria-hidden />
      <main className="relative w-full max-w-[1120px]">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.25 }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p style={{ ...M, color: '#D6A848' }}>{dateLabel.replace(',', ' ·')}{time ? ` · ${time}` : ''}</p>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" data-testid="uv2-home-actions" aria-label="Schnellzugriff">
              <PresenceOrb />
              {([['MÔRA', onMora], ['Suche', onSearch], ['Universe', onUniverse], ['Einstellungen', onSettings]] as const).map(([l, fn]) => (
                <button key={l} type="button" onClick={fn} className="transition-colors hover:text-[#D6A848]" style={{ ...M, fontSize: 10, color: 'rgba(247,244,233,.5)' }}>{l}</button>
              ))}
            </nav>
          </div>
          <h1 className="mt-6 text-[44px] sm:text-[64px]" data-x="" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', lineHeight: 1.02, fontWeight: 400, letterSpacing: '-0.025em' }}>
            {greeting}{firstName ? `, ${firstName}.` : '.'}
          </h1>
          <p className="mt-6 max-w-[520px] text-[15px] font-light leading-[1.6]" style={{ color: 'rgba(247,244,233,.6)' }}>
            Ich bin da. Sag mir, was du brauchst – oder wohin du willst.
          </p>
          <form className="mt-8 max-w-[520px]" data-testid="uv2-home-ask"
            onSubmit={(e) => { e.preventDefault(); const q = ask.trim(); if (!q) return;
              // Eine Frage aus dem Nahbild: die Kamera fährt zurück, MÔRA antwortet im Raum.
              useNavStore.getState().setCoreMode('explore');
              window.setTimeout(() => window.dispatchEvent(new CustomEvent('uv2:ask', { detail: q })), 700); setAsk(''); }}>
            <label className="flex h-11 items-center gap-3" style={{ borderBottom: '0.5px solid rgba(247,244,233,.18)' }}>
              <input value={ask} onChange={(e) => setAsk(e.target.value)} aria-label="MÔRA fragen" placeholder="Frag MÔRA"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-light placeholder:text-[rgba(247,244,233,0.4)] focus:outline-none" style={{ color: '#F7F4E9' }} />
              <button type="submit" aria-label="Senden" className="transition-colors hover:text-[#D6A848]" style={{ color: 'rgba(247,244,233,.45)' }}>
                <ArrowRight size={16} strokeWidth={1.25} />
              </button>
            </label>
          </form>
        </motion.section>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.4 }}>
          <TodayOverview />
        </motion.div>

        {/* Orte als Register: zwei Spalten, Haarlinien, keine Kacheln */}
        <motion.section className="mt-16" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.55 }}>
          <p style={{ ...M, color: '#D6A848' }}>Orte</p>
          <div className="mt-4 grid gap-x-12 sm:grid-cols-2" style={{ borderTop: '0.5px solid rgba(247,244,233,.09)' }}>
            {areas.map((area, i) => (
              <button key={area.id} type="button" onClick={() => onOpen(area)}
                className="group grid grid-cols-[48px_1fr_auto] items-baseline gap-4 py-4 text-left" style={{ borderBottom: '0.5px solid rgba(247,244,233,.09)' }}>
                <span style={{ ...M, fontSize: 10, color: 'rgba(247,244,233,.35)' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-normal transition-colors group-hover:text-white" style={{ color: 'rgba(247,244,233,.92)' }}>{area.title}</span>
                  <span className="mt-1 block truncate text-[15px] font-light" style={{ color: 'rgba(247,244,233,.45)' }}>{area.description}</span>
                </span>
                <ArrowRight size={14} strokeWidth={1.25} className="transition-all group-hover:translate-x-0.5 group-hover:text-[#D6A848]" style={{ color: 'rgba(247,244,233,.3)' }} />
              </button>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
