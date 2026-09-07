'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Command,
  FileText,
  FolderOpen,
  Grid2X2,
  Mail,
  MessageCircleMore,
  Radar,
  Search,
  Settings2,
  Sparkles,
  SquareCheckBig,
  Timer,
  type LucideIcon,
} from 'lucide-react';

import { TodayOverview } from '@/components/home/TodayOverview';
import { surfaceMarker, SAIMOR_PRODUCT_LABEL, SAIMOR_SURFACES } from '@/lib/os/surfaceContract';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';

type OpenTarget = {
  id: string;
  type: string;
  title: string;
  size: { width: number; height: number };
};

type Room = OpenTarget & {
  eyebrow: string;
  description: string;
  icon: LucideIcon;
};

const WORK_ROOMS: Room[] = [
  {
    id: 'work-main',
    type: 'work',
    title: 'Arbeit',
    eyebrow: 'Fokus',
    description: 'Aufgaben, Dateien, Termine und Arbeitssitzungen in einem Kontext.',
    icon: Timer,
    size: { width: 1080, height: 760 },
  },
  {
    id: 'mail-main',
    type: 'mail',
    title: 'Mail',
    eyebrow: 'Kommunikation',
    description: 'Postfach, Threads und Anhänge ohne Wechsel in ein zweites Produkt.',
    icon: Mail,
    size: { width: 1040, height: 720 },
  },
  {
    id: 'calendar-main',
    type: 'calendar',
    title: 'Kalender',
    eyebrow: 'Zeit',
    description: 'Termine und Tagesgrenzen aus demselben persönlichen Arbeitskontext.',
    icon: CalendarDays,
    size: { width: 920, height: 680 },
  },
  {
    id: 'files-main',
    type: 'meine-dateien',
    title: 'Dateien',
    eyebrow: 'Wissen',
    description: 'Dokumente und Arbeitsmaterial dort, wo MÔRA und Work sie verstehen.',
    icon: FolderOpen,
    size: { width: 960, height: 700 },
  },
];

const SYSTEM_ROOMS: Room[] = [
  {
    id: 'tasks-main',
    type: 'tasks',
    title: 'Aufgaben',
    eyebrow: 'Ausführung',
    description: 'Konkrete nächste Schritte.',
    icon: SquareCheckBig,
    size: { width: 980, height: 680 },
  },
  {
    id: 'timeline-main',
    type: 'timeline',
    title: 'Aktivität',
    eyebrow: 'Verlauf',
    description: 'Was sich im System bewegt hat.',
    icon: Activity,
    size: { width: 840, height: 680 },
  },
  {
    id: 'nightwatch-main',
    type: 'nightwatch',
    title: 'Nightwatch',
    eyebrow: 'Betrieb',
    description: 'Nur Signale, die Aufmerksamkeit verdienen.',
    icon: Radar,
    size: { width: 1100, height: 760 },
  },
  {
    id: 'search-main',
    type: 'search',
    title: 'Suche',
    eyebrow: 'Finden',
    description: 'Semantisch durch Saimôr suchen.',
    icon: Search,
    size: { width: 760, height: 620 },
  },
];

function timeGreeting(hour: number) {
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function PresenceOrb() {
  return (
    <div className="relative h-14 w-14 shrink-0" aria-hidden>
      <motion.div
        className="absolute inset-0 rounded-full border border-emerald-200/16"
        animate={{ scale: [0.93, 1.08, 0.93], opacity: [0.26, 0.65, 0.26] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-[7px] rounded-full border border-violet-200/15 bg-[radial-gradient(circle_at_38%_32%,rgba(216,180,254,.42),rgba(16,185,129,.14)_38%,rgba(4,8,18,.04)_70%)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-[20px] rounded-full bg-emerald-100/75 shadow-[0_0_24px_rgba(167,243,208,.42)]" />
    </div>
  );
}

function RoomButton({ room, onOpen }: { room: Room; onOpen: (room: Room) => void }) {
  const Icon = room.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(room)}
      className="group flex min-h-[118px] items-start gap-4 rounded-[22px] border border-white/[0.06] bg-black/[0.12] p-4 text-left backdrop-blur-[16px] transition hover:border-emerald-100/14 hover:bg-white/[0.025]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.065] bg-white/[0.025] text-emerald-100/60">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-[0.22em] text-white/24">{room.eyebrow}</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-medium tracking-[-0.02em] text-white/78">{room.title}</h3>
          <ArrowRight size={13} className="text-white/16 transition group-hover:translate-x-0.5 group-hover:text-white/44" />
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/32">{room.description}</p>
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
    const raw =
      (user as any)?.name ||
      (user as any)?.display_name ||
      user?.email?.split('@')[0] ||
      '';
    return String(raw).trim().split(/\s+/)[0] || '';
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

  const openMora = () =>
    open({
      id: 'chat-main',
      type: 'chat',
      title: 'MÔRA',
      size: { width: 900, height: 720 },
    });

  const openApps = () =>
    open({
      id: 'apps-main',
      type: 'apps',
      title: 'Alle Werkzeuge',
      size: { width: 1040, height: 760 },
    });

  const openSettings = () =>
    open({
      id: 'settings-main',
      type: 'settings',
      title: 'Saimôr Setup',
      size: { width: 920, height: 700 },
    });

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
          <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/24 sm:flex">
            <span>
              {now
                ? now.toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  })
                : '—'}
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span>
              {now
                ? now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </span>
          </div>
        </header>

        <section className="mt-12 grid gap-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="flex items-center gap-4">
              <PresenceOrb />
              <div>
                <div className="text-[9px] uppercase tracking-[0.23em] text-emerald-100/40">
                  MÔRA · im System
                </div>
                <h1 className="mt-2 max-w-[820px] text-[clamp(2.9rem,6vw,5.7rem)] font-medium leading-[0.92] tracking-[-0.065em] text-white/94">
                  {greeting}{firstName ? `, ${firstName}.` : '.'}
                </h1>
              </div>
            </div>
            <p className="mt-7 max-w-[720px] text-[clamp(1rem,1.7vw,1.25rem)] font-light leading-relaxed tracking-[-0.02em] text-white/40">
              Ein System für deinen Tag, deine Arbeit und deinen Kontext. Kein Desk daneben, keine zweite Wahrheit.
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
                  Sie bleibt im Hintergrund. Gespräch ist eine Fähigkeit des OS — nicht die Startseite.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openMora}
              className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/[0.055] bg-white/[0.02] px-3.5 py-3 text-left text-[11px] text-white/48 transition hover:border-white/[0.10] hover:bg-white/[0.035] hover:text-white/74"
            >
              <span className="flex items-center gap-2">
                <MessageCircleMore size={13} /> Mit MÔRA sprechen
              </span>
              <span className="flex items-center gap-1 text-[9px] text-white/24">
                <Command size={10} /> J
              </span>
            </button>
          </div>
        </section>

        <TodayOverview />

        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-white/22">Weiterarbeiten</div>
              <h2 className="mt-1 text-lg font-medium tracking-[-0.025em] text-white/72">
                Deine Räume. Ein gemeinsamer Kontext.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCoreMode('explore')}
              className="rounded-full border border-white/[0.065] bg-white/[0.02] px-3 py-2 text-[10px] text-white/34 transition hover:text-white/68"
            >
              Universe öffnen
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {WORK_ROOMS.map((room) => (
              <RoomButton key={room.id} room={room} onOpen={open} />
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-white/[0.045] pt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-white/20">Systemebene</div>
              <h2 className="mt-1 text-[15px] font-medium tracking-[-0.02em] text-white/58">
                Ausführen, beobachten, wiederfinden.
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openApps}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.018] px-3 py-2 text-[10px] text-white/32 transition hover:text-white/64"
              >
                <Grid2X2 size={11} /> Alle Apps
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.055] bg-white/[0.018] text-white/28 transition hover:text-white/62"
                aria-label="Saimôr Setup öffnen"
              >
                <Settings2 size={12} />
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SYSTEM_ROOMS.map((room) => (
              <RoomButton key={room.id} room={room} onOpen={open} />
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.035] py-7 text-[9px] uppercase tracking-[0.18em] text-white/18">
          <span>CORE · Wahrheit · MÔRA · Kontext · Engine · Laufzeit</span>
          <span className="flex items-center gap-2">
            <FileText size={10} /> Ein Produkt · ein Zustand
          </span>
        </footer>
      </main>
    </div>
  );
};
