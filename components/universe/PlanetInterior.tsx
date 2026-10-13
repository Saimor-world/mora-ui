'use client';

/**
 * Universe v2 – das Innere eines Planeten.
 * Der Kosmos bleibt: derselbe Hintergrund wie im Universe. Du stehst auf der
 * Oberfläche – unten wölbt sich der Horizont, die Bereiche gehen als Monde
 * darüber auf, und die Arbeit liegt auf einer einzigen Glasfläche.
 * Keine Türkis-Welt, keine Randkacheln, keine Null-Zähler. Leeres ist ehrlicher Nebel.
 */
import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileText } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSpaces } from '@/lib/queries/useSpaces';
import { useTree } from '@/lib/queries/useTree';
import { createSpace } from '@/lib/api/orgClient';
import { queryKeys } from '@/lib/queries/queryKeys';
import { getDeptStyle } from '@/lib/utils/deptStyle';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';
import { MOTION } from '@/lib/universe/motion';
import type { IncidentStatusPanel as IncidentStatusPanelData } from '@/lib/panel/types';

const GLASS: React.CSSProperties = {
  background: 'rgba(22,24,30,0.56)',
  backdropFilter: 'blur(40px) saturate(160%)',
  WebkitBackdropFilter: 'blur(40px) saturate(160%)',
  boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.13), inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 60px rgba(0,0,0,0.45)',
};
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif';

/** Monde verteilt auf dem Horizontbogen – symmetrisch um die Mitte, nie über der Glasfläche. */
export function moonSlots(n: number): { x: number; lift: number; size: number }[] {
  if (n <= 0) return [];
  const spread = Math.min(0.78, 0.18 + n * 0.11); // Anteil der Breite
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = 0.5 + (t - 0.5) * spread;
    const edge = Math.abs(t - 0.5) * 2; // 0 Mitte … 1 Rand
    return { x, lift: 1 - edge * 0.55, size: 30 - edge * 8 };
  });
}

export function interiorSentence(spaces: number, docs: number, incidents: number): string {
  if (incidents > 0) return incidents === 1 ? 'Eine Sache braucht hier Aufmerksamkeit.' : `${incidents} Dinge brauchen hier Aufmerksamkeit.`;
  if (!spaces && !docs) return 'Dieser Ort ist noch neu.';
  const parts = [spaces ? (spaces === 1 ? 'ein Bereich' : `${spaces} Bereiche`) : '', docs ? (docs === 1 ? 'ein Dokument' : `${docs} Dokumente`) : ''].filter(Boolean);
  return `Ruhig. ${parts.join(' und ').replace(/^./, (c) => c.toUpperCase())}.`;
}

export function PlanetInterior({ incidentPanels = [] }: { incidentPanels?: IncidentStatusPanelData[] }) {
  const { activeDepartmentId, activeCompanyId, navigateToSpace } = useNavStore();
  const openPane = usePaneStore((s) => s.openPane);
  const reduced = !!useReducedMotion();
  const qc = useQueryClient();
  const add = useMutation({ mutationFn: createSpace, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.spaces(activeDepartmentId) }) });
  const { data: departments = [] } = useDepartments(activeCompanyId);
  const { data: spacesRaw = [], isLoading } = useSpaces(activeDepartmentId);
  const { data: tree = [] } = useTree(activeCompanyId);

  const dept = (Array.isArray(departments) ? departments : []).find((d: any) => d.id === activeDepartmentId) as any;
  const spaces = Array.isArray(spacesRaw) ? spacesRaw : [];
  const docs = useMemo(() => {
    const root = (Array.isArray(tree) ? tree : []).find((n: any) => n.id === activeDepartmentId);
    const out: any[] = [];
    const walk = (n: any) => { if (!n) return; if (n.type === 'node') out.push(n); (n.children || []).forEach(walk); };
    walk(root);
    return out.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  }, [tree, activeDepartmentId]);
  const name = dept?.name || 'Planet';
  const glow = getDeptStyle(name, dept?.color).glow;
  const slots = moonSlots(Math.min(spaces.length, 7));
  const incidents = incidentPanels.filter((p: any) => p && p.state !== 'resolved');
  const ease = MOTION.ease.out;
  const appear = (delay: number) => (reduced ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const, delay } });

  return (
    <div className="absolute inset-0 overflow-hidden text-white antialiased" data-testid="uv2-planet-interior" style={{ fontFamily: FONT }}>
      {/* Derselbe Kosmos wie draußen */}
      <div className="absolute -inset-[3%] bg-cover bg-center" style={{ backgroundImage: 'url(/universe/deep-space-warm.jpg)', transform: 'scale(1.08)', filter: 'saturate(0.9)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(3,6,10,0.35) 0%, rgba(3,6,10,0.25) 50%, rgba(3,6,10,0.6) 100%)' }} />

      {/* Der Horizont: die Oberfläche dieses Planeten */}
      <div className="pointer-events-none absolute left-1/2 rounded-full" data-testid="uv2-horizon"
        style={{ width: '240vw', height: '240vw', top: '74vh', transform: 'translateX(-50%)',
          background: 'radial-gradient(circle at 50% 0%, #1a1712 0%, #0d0c0a 18%, #060606 40%)',
          boxShadow: `0 -1px 0 rgba(255,226,184,0.55), 0 -8px 30px ${glow}33, 0 -40px 120px rgba(255,196,128,0.10), inset 0 18px 40px rgba(255,214,160,0.06)` }} />
      <div className="pointer-events-none absolute inset-x-0" style={{ top: 'calc(74vh - 140px)', height: 160, background: 'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(255,210,150,0.10), transparent 70%)' }} />

      {/* Bereiche als Monde über dem Horizont */}
      {slots.map((s, i) => {
        const sp: any = spaces[i];
        return (
          <motion.button key={sp.id} type="button" onClick={() => navigateToSpace(sp.id)} data-testid="uv2-moon"
            className="group absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${s.x * 100}%`, top: `calc(74vh - ${70 + s.lift * 70}px)` }}
            {...(reduced ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] as const, delay: 0.5 + i * 0.12 } })}>
            <span className="block rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{ width: s.size, height: s.size, background: 'radial-gradient(circle at 35% 30%, #f3ead9 0%, #b9ad98 38%, #4a4237 78%, #1d1a16 100%)', boxShadow: '0 0 18px rgba(255,226,184,0.18)' }} />
            <span className="mt-2 max-w-[140px] truncate text-white/75 group-hover:text-white" style={{ fontSize: 12, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>{sp.name}</span>
          </motion.button>
        );
      })}
      {!isLoading && spaces.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center" style={{ top: 'calc(74vh - 92px)' }} data-testid="uv2-moon-nebel">
          <span className="mx-auto block h-7 w-7 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.18)', filter: 'blur(0.5px)' }} />
          <span className="mt-2 block text-white/45" style={{ fontSize: 12 }}>Noch kein Mond – noch keine Bereiche</span>
        </div>
      )}

      {/* Eine Glasfläche für die Arbeit */}
      <div className="absolute inset-x-0 top-[112px] flex justify-center px-6">
      <motion.section className="w-full max-w-[560px] rounded-[24px] p-7" style={GLASS} data-testid="uv2-planet-panel" {...appear(0.15)}>
        <h1 className="font-semibold text-white" style={{ fontSize: 34, lineHeight: '40px', letterSpacing: '-0.022em' }}>{name}</h1>
        <p className="mt-2 text-white/60" style={{ fontSize: 15, lineHeight: '20px' }}>{isLoading ? 'Einen Moment …' : interiorSentence(spaces.length, docs.length, incidents.length)}</p>

        {incidents.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-white/90" style={{ fontSize: 13 }}>Wache</h2>
            {incidents.slice(0, 2).map((p: any, i) => (
              <p key={i} className="mt-2 text-white/70" style={{ fontSize: 13, lineHeight: '18px' }}>{p.title || p.headline || 'Hinweis der Wache'}</p>
            ))}
          </div>
        )}

        {docs.length > 0 ? (
          <div className="mt-6">
            <h2 className="font-semibold text-white/90" style={{ fontSize: 13 }}>Zuletzt</h2>
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {docs.slice(0, 4).map((d: any) => (
                <li key={d.id}>
                  <button type="button" className="group flex w-full items-center gap-3 py-2.5 text-left"
                    onClick={() => openPane({ id: `document-${d.id}`, type: 'document', title: d.name || d.title || 'Dokument', size: GLASS_SHEET_SIZE, data: { nodeId: d.id } } as any)}>
                    <FileText size={15} strokeWidth={1.5} className="shrink-0 text-white/50" />
                    <span className="min-w-0 flex-1 truncate text-white/85" style={{ fontSize: 14 }}>{d.name || d.title || 'Ohne Titel'}</span>
                    <ArrowRight size={13} className="text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : !isLoading && (
          <p className="mt-6 text-white/45" style={{ fontSize: 13, lineHeight: '18px' }} data-testid="uv2-planet-nebel">
            Noch im Nebel: Dokumente und Signale. Sobald hier etwas entsteht, liegt es auf dieser Fläche – nichts wird erfunden.
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => openPane({ id: 'chat-main', type: 'chat', title: 'MÔRA', size: { width: 560, height: 640 }, data: { initialPrompt: `Was ist in ${name} gerade wichtig?` } } as any)}
            className="h-9 flex-1 rounded-full bg-white font-semibold text-black transition-transform active:scale-[0.97]" style={{ fontSize: 13 }}>
            MÔRA zu {name} fragen
          </button>
          <button type="button" disabled={add.isPending || !activeDepartmentId}
            onClick={() => activeDepartmentId && add.mutate({ department_id: activeDepartmentId, name: 'Neuer Bereich', description: 'Im Planeten angelegt' } as any)}
            className="h-9 flex-1 rounded-full font-medium text-white/85 transition-colors hover:bg-white/15 disabled:opacity-50" style={{ fontSize: 13, background: 'rgba(255,255,255,0.08)' }}>
            Bereich anlegen
          </button>
        </div>
      </motion.section>
      </div>
      <style>{`[data-testid=uv2-planet-interior]{--uv2-ease:${ease}}`}</style>
    </div>
  );
}
