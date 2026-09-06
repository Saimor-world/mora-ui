'use client';

import React from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  FolderOpen,
  Grid2X2,
  ListTodo,
  Mail,
  MessageCircle,
  Timer,
  Wrench,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import type { AppProps } from '@/lib/apps/types';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import { usePaneStore } from '@/lib/store/paneStore';

const ACTIONS: Array<{
  id: string;
  type: PaneType;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  size: { width: number; height: number };
  tone: string;
}> = [
  {
    id: 'tasks',
    type: 'tasks',
    title: 'Aufgaben',
    description: 'Was konkret getan werden muss.',
    icon: ListTodo,
    size: { width: 980, height: 680 },
    tone: 'text-amber-200/72',
  },
  {
    id: 'finder',
    type: 'finder',
    title: 'Finder',
    description: 'Projekte, Objekte und Dateien.',
    icon: FolderOpen,
    size: { width: 1280, height: 820 },
    tone: 'text-cyan-200/70',
  },
  {
    id: 'calendar',
    type: 'calendar',
    title: 'Kalender',
    description: 'Zeit, Termine und nächste Fixpunkte.',
    icon: CalendarDays,
    size: { width: 920, height: 680 },
    tone: 'text-emerald-200/70',
  },
  {
    id: 'work-session',
    type: 'work-session',
    title: 'Arbeitssitzung',
    description: 'Ein Fokus, ein Plan, eine Session.',
    icon: Timer,
    size: { width: 860, height: 650 },
    tone: 'text-violet-200/72',
  },
  {
    id: 'mail',
    type: 'mail',
    title: 'Mail',
    description: 'Kommunikation, ohne das OS zu verlassen.',
    icon: Mail,
    size: { width: 1040, height: 720 },
    tone: 'text-sky-200/68',
  },
  {
    id: 'chat',
    type: 'chat',
    title: 'MÔRA',
    description: 'Kontext, Entscheidungen und nächste Schritte.',
    icon: MessageCircle,
    size: { width: 900, height: 720 },
    tone: 'text-emerald-200/76',
  },
];

function ActionCard({
  title,
  description,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[112px] items-start gap-4 rounded-[22px] border border-white/[0.06] bg-white/[0.018] p-4 text-left transition-colors hover:border-white/[0.11] hover:bg-white/[0.035]"
    >
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.055] bg-black/15 ${tone}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-medium tracking-[-0.02em] text-white/82">{title}</h3>
          <ArrowUpRight size={13} className="shrink-0 text-white/18 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/48" />
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/32">{description}</p>
      </div>
    </button>
  );
}

export default function WorkApp({ paneId }: AppProps) {
  const pane = usePaneStore((s) => s.getPane(paneId));
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const openPane = usePaneStore((s) => s.openPane);
  const removePane = usePaneStore((s) => s.removePane);
  const minimizePane = usePaneStore((s) => s.minimizePane);
  const focusPane = usePaneStore((s) => s.focusPane);
  const updatePanePosition = usePaneStore((s) => s.updatePanePosition);
  const updatePaneSize = usePaneStore((s) => s.updatePaneSize);

  if (!pane) return null;

  const open = (id: string, type: PaneType, title: string, size: { width: number; height: number }) => {
    openPane({ id: `${id}-main`, type, title, size });
  };

  return (
    <GlassPanel
      title="Arbeit"
      paneId={paneId}
      width={pane.size.width}
      height={pane.size.height}
      initialX={pane.position.x}
      initialY={pane.position.y}
      onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
      onResize={(w, h) => updatePaneSize(paneId, w, h)}
      onClose={() => removePane(paneId)}
      onMinimize={() => minimizePane(paneId)}
      onFocus={() => focusPane(paneId)}
      isActive={activePaneId === paneId}
      zIndex={pane.zIndex}
      showCloseButton
      showMinimizeButton
      draggable
      resizable
    >
      <div className="flex h-full min-h-0 flex-col overflow-y-auto pr-1 text-white">
        <header className="border-b border-white/[0.05] px-1 pb-6 pt-1">
          <div className="text-[9px] uppercase tracking-[0.24em] text-emerald-100/38">Work field</div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[30px] font-medium tracking-[-0.045em] text-white/90">Mach das Nächste.</h2>
              <p className="mt-2 max-w-[620px] text-[11px] leading-relaxed text-white/36">
                Keine App-Wand. Die Dinge, die Arbeit bewegen, liegen vorne. Der Rest bleibt als Werkzeugschublade erhalten.
              </p>
            </div>
            <button
              type="button"
              onClick={() => open('apps', 'apps', 'Alle Werkzeuge', { width: 1040, height: 760 })}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-white/38 hover:text-white/70"
            >
              <Grid2X2 size={12} /> Alle Werkzeuge
            </button>
          </div>
        </header>

        <section className="grid gap-3 py-6 md:grid-cols-2 xl:grid-cols-3">
          {ACTIONS.map((action) => (
            <ActionCard
              key={action.id}
              title={action.title}
              description={action.description}
              icon={action.icon}
              tone={action.tone}
              onClick={() => open(action.id, action.type, action.title, action.size)}
            />
          ))}
        </section>

        <section className="mt-auto grid gap-3 border-t border-white/[0.045] pt-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => open('notes', 'notes', 'Notizen', { width: 760, height: 580 })}
            className="group flex items-center gap-3 rounded-[20px] border border-white/[0.05] bg-black/10 px-4 py-3 text-left"
          >
            <FileText size={14} className="text-white/28" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-white/56">Schnell festhalten</div>
              <div className="mt-0.5 text-[9px] text-white/24">Notiz öffnen</div>
            </div>
            <ArrowUpRight size={12} className="text-white/16 group-hover:text-white/40" />
          </button>
          <button
            type="button"
            onClick={() => open('apps', 'apps', 'Systemwerkzeuge', { width: 1040, height: 760 })}
            className="group flex items-center gap-3 rounded-[20px] border border-white/[0.05] bg-black/10 px-4 py-3 text-left"
          >
            <Wrench size={14} className="text-white/28" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-white/56">Mehr brauchst du gerade?</div>
              <div className="mt-0.5 text-[9px] text-white/24">Werkzeugschublade öffnen</div>
            </div>
            <ArrowUpRight size={12} className="text-white/16 group-hover:text-white/40" />
          </button>
        </section>
      </div>
    </GlassPanel>
  );
}
