'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Command,
  Compass,
  Grid2X2,
  Layers3,
  MessageCircle,
  Radar,
  ShieldCheck,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

function timeGreeting(hour: number) {
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function FieldOrb() {
  return (
    <div className="relative h-20 w-20 shrink-0" aria-hidden>
      <motion.div
        className="absolute inset-0 rounded-full border border-emerald-200/14"
        animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.32, 0.72, 0.32] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-[9px] rounded-full border border-violet-200/16 bg-[radial-gradient(circle_at_38%_32%,rgba(216,180,254,.52),rgba(16,185,129,.16)_38%,rgba(4,8,18,.05)_70%)] shadow-[0_0_55px_rgba(110,231,183,.12)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-[27px] rounded-full bg-emerald-100/75 shadow-[0_0_28px_rgba(167,243,208,.55)]" />
    </div>
  );
}

type PortalProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  status?: string;
};

function Portal({ eyebrow, title, description, icon: Icon, onClick, status }: PortalProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group relative min-h-[154px] overflow-hidden rounded-[26px] border border-white/[0.075] bg-black/[0.14] p-5 text-left backdrop-blur-[18px] transition-colors hover:border-emerald-100/16 hover:bg-white/[0.035]"
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/16 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-emerald-100/70">
          <Icon size={17} />
        </div>
        <ArrowUpRight size={15} className="text-white/18 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/55" />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.24em] text-white/28">{eyebrow}</span>
        {status && (
          <span className="rounded-full border border-emerald-300/10 bg-emerald-400/[0.05] px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] text-emerald-200/45">
            {status}
          </span>
        )}
      </div>
      <h3 className="mt-1.5 text-[17px] font-medium tracking-[-0.02em] text-white/88">{title}</h3>
      <p className="mt-1.5 max-w-[32ch] text-[11px] leading-relaxed text-white/36">{description}</p>
    </motion.button>
  );
}

export const HomeSurfaceNext: React.FC = () => {
  const openPane = usePaneStore((s) => s.openPane);
  const setCoreMode = useNavStore((s) => s.setCoreMode);
  const user = useSessionStore((s) => s.user);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const firstName = useMemo(() => {
    const raw = (user as any)?.name || (user as any)?.display_name || user?.email?.split('@')[0] || '';
    return String(raw).trim().split(/\s+/)[0] || '';
  }, [user]);

  const greeting = now ? timeGreeting(now.getHours()) : 'Willkommen';

  const openMora = () => openPane({
    id: 'chat-main',
    type: 'chat',
    title: 'MÔRA',
    size: { width: 900, height: 720 },
  });

  const openWork = () => openPane({
    id: 'work-main',
    type: 'work',
    title: 'Arbeit',
    size: { width: 1080, height: 760 },
  });

  const openTools = () => openPane({
    id: 'apps-main',
    type: 'apps',
    title: 'Alle Werkzeuge',
    size: { width: 1040, height: 760 },
  });

  const openCapital = () => openPane({
    id: 'finance-main',
    type: 'finance',
    title: 'Capital',
    size: { width: 1040, height: 760 },
  });

  const openSystems = () => openPane({
    id: 'nightwatch-main',
    type: 'nightwatch',
    title: 'Nightwatch',
    size: { width: 1100, height: 760 },
  });

  return (
    <div className="pointer-events-auto absolute inset-0 overflow-y-auto px-5 pb-36 pt-20 text-white sm:px-8 lg:px-12 xl:px-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[9%] h-[420px] w-[420px] rounded-full bg-emerald-400/[0.035] blur-[110px]" />
        <div className="absolute right-[4%] top-[2%] h-[500px] w-[500px] rounded-full bg-violet-500/[0.035] blur-[130px]" />
        <div className="absolute inset-x-[8%] top-[44%] h-px bg-gradient-to-r from-transparent via-white/[0.035] to-transparent" />
      </div>

      <main className="relative mx-auto w-full max-w-[1380px]">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-white/28">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70 shadow-[0_0_14px_rgba(110,231,183,.7)]" />
            Saimôr OS
          </div>
          <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/24 sm:flex">
            <span>{now ? now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}</span>
            <span className="h-3 w-px bg-white/10" />
            <span>{now ? now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
        </header>

        <section className="mt-14 grid items-end gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-5">
              <FieldOrb />
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/42">MÔRA · present</div>
                <h1 className="mt-2 max-w-[760px] text-[clamp(2.7rem,6vw,5.6rem)] font-medium leading-[0.92] tracking-[-0.065em] text-white/94">
                  {greeting}{firstName ? `, ${firstName}.` : '.'}
                </h1>
              </div>
            </div>
            <p className="mt-8 max-w-[680px] text-[clamp(1rem,1.8vw,1.35rem)] font-light leading-relaxed tracking-[-0.02em] text-white/42">
              Ein Arbeitsfeld, das versteht, was existiert — und was als Nächstes wirklich zählt.
            </p>
          </div>

          <button
            type="button"
            onClick={openMora}
            className="group relative overflow-hidden rounded-[30px] border border-emerald-200/10 bg-[linear-gradient(135deg,rgba(16,185,129,.075),rgba(124,58,237,.05),rgba(0,0,0,.12))] p-5 text-left backdrop-blur-2xl transition-colors hover:border-emerald-100/18"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/20">
                <Sparkles size={14} className="text-emerald-100/70" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-white/28">Ask MÔRA</div>
                <div className="mt-1 text-sm text-white/64">Was soll ich jetzt tun?</div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3.5 text-xs text-white/34">
              <span>Schreib, sprich oder gib ihr ein Ziel …</span>
              <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px] text-white/28">
                <Command size={10} /> J
              </div>
            </div>
          </button>
        </section>

        <section className="mt-14">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-white/24">Live surfaces</div>
              <h2 className="mt-1 text-lg font-medium tracking-[-0.02em] text-white/72">Vier Wege. Ein System.</h2>
            </div>
            <button
              type="button"
              onClick={() => setCoreMode('explore')}
              className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-white/38 transition-colors hover:text-white/70 sm:flex"
            >
              <Compass size={12} /> Universe
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Portal
              eyebrow="Work"
              title="Build & Operate"
              description="Aufgaben, Dateien, Zeit und Produkte — aus einem Arbeitskontext heraus."
              icon={Layers3}
              onClick={openWork}
              status="active"
            />
            <Portal
              eyebrow="Capital"
              title="Money that can work"
              description="Wallets, Vermögen und On-chain-Kapital. Canary zuerst read-only."
              icon={WalletCards}
              onClick={openCapital}
              status="read only"
            />
            <Portal
              eyebrow="Intelligence"
              title="MÔRA"
              description="Kontext, Memory und Entscheidungen — als Schicht im gesamten OS."
              icon={MessageCircle}
              onClick={openMora}
            />
            <Portal
              eyebrow="Systems"
              title="Nightwatch"
              description="Infrastruktur, Runtime und Signale. Nur was Aufmerksamkeit braucht."
              icon={Radar}
              onClick={openSystems}
              status="live"
            />
          </div>
        </section>

        <section className="mt-10 grid gap-3 lg:grid-cols-[1.5fr_.5fr]">
          <div className="relative overflow-hidden rounded-[26px] border border-white/[0.06] bg-black/[0.1] px-5 py-4 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] text-white/30">
              <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-200/45" /> Core reserve stays separate</span>
              <span className="flex items-center gap-2"><Activity size={12} className="text-cyan-200/40" /> Canary is observation-first</span>
              <span className="flex items-center gap-2"><Boxes size={12} className="text-violet-200/42" /> Products stay independent, OS operates them</span>
            </div>
          </div>
          <button
            type="button"
            onClick={openTools}
            className="flex items-center justify-between rounded-[26px] border border-white/[0.06] bg-white/[0.025] px-5 py-4 text-left text-xs text-white/44 transition-colors hover:bg-white/[0.045] hover:text-white/72"
          >
            <span className="flex items-center gap-2"><Grid2X2 size={13} /> Alle Werkzeuge</span>
            <ArrowUpRight size={14} />
          </button>
        </section>
      </main>
    </div>
  );
};
