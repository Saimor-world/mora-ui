'use client';

/**
 * Universe v2 – das Innere eines Planeten.
 * Der Kosmos bleibt: derselbe Hintergrund wie im Universe. Du stehst auf der
 * Oberfläche – unten wölbt sich der Horizont, die Bereiche gehen als Monde
 * darüber auf, und die Arbeit liegt auf einer einzigen Glasfläche.
 * Keine Türkis-Welt, keine Randkacheln, keine Null-Zähler. Leeres ist ehrlicher Nebel.
 */
import { planetMaterial, moonBackground, matteTone } from './PlanetSphere';
import { UV, TYPE } from '@/lib/universe/tokens';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import type { WidgetContext } from '@/lib/widgets/types';
import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileText } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { openMoraWorkspace } from '@/lib/os/openMoraWorkspace';
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

/** Instrumente: die Abteilungs-Widgets des alten OS, im Planeten als ruhige Messreihe (echte Daten aus den Widgets selbst). */
export const INSTRUMENTS = ['deptStats', 'nightwatch', 'signals', 'team', 'clock', 'quickActions', 'mora'] as const;

function Instruments({ context }: { context: WidgetContext }) {
  const [open, setOpen] = useState(true);
  return (
    <aside className="pointer-events-auto absolute right-6 top-32 hidden w-[320px] md:block lg:right-16" data-testid="uv2-instruments" {...{ style: { bottom: 'calc(26vh + 150px)', ['--scene-rgb' as any]: '214,168,72' } }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between" style={{ ...TYPE.meta, color: UV.gold }}>
        <span>Instrumente</span><span style={{ color: UV.c(0.4) }}>{open ? 'Einklappen' : `${INSTRUMENTS.length} zeigen`}</span>
      </button>
      {open && (
        <div className="mt-4 h-full space-y-3 overflow-y-auto pr-1 pb-8" style={{ scrollbarWidth: 'none', maskImage: 'linear-gradient(180deg,#000 calc(100% - 48px),transparent)', WebkitMaskImage: 'linear-gradient(180deg,#000 calc(100% - 48px),transparent)' }}>
          {INSTRUMENTS.map((t) => {
            const def = WIDGET_REGISTRY[t];
            if (!def) return null;
            return (
              <section key={t} data-widget-id={t} data-uv2-scope="" className="overflow-hidden" style={{ height: t === 'clock' ? 96 : 168, borderRadius: 12, border: `0.5px solid ${UV.c(0.1)}`, background: 'rgba(5,7,6,0.58)' }}>
                <div className="h-full overflow-hidden p-2.5" aria-label={def.label}>{def.render({ context: { ...context, compact: true, gridSize: { w: 3, h: t === 'clock' ? 2 : 4 } } })}</div>
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}

export function PlanetInterior({ incidentPanels = [], instrumentContext }: { incidentPanels?: IncidentStatusPanelData[]; instrumentContext?: WidgetContext }) {
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
  const mat = planetMaterial(name);
  const mt = matteTone(name);
  const mrgb = (c: number[], a = 1) => `rgba(${c.join(',')},${a})`;
  const slots = moonSlots(Math.min(spaces.length, 7));
  const incidents = incidentPanels.filter((p: any) => p && p.state !== 'resolved');
  const ease = MOTION.ease.out;
  const appear = (delay: number) => (reduced ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const, delay } });

  return (
    <div className="absolute inset-0 overflow-hidden text-white antialiased" data-testid="uv2-planet-interior" style={{ fontFamily: FONT }}>
      {/* Derselbe Kosmos wie draußen */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(3,6,10,0.12) 0%, rgba(3,6,10,0.08) 50%, rgba(3,6,10,0.3) 100%)' }} />

      {/* Der Horizont: die Oberfläche dieses Planeten */}
      <div className="pointer-events-none absolute left-1/2 rounded-full" data-testid="uv2-horizon"
        style={{ width: '240vw', height: '240vw', top: '74vh', transform: 'translateX(-50%)',
          // matte Keramik wie die Planeten: sanft von oben beleuchtet, keine Glut
          background: `radial-gradient(circle at 50% 0%, ${mrgb(mt.light, 0.62)} 0%, ${mrgb(mt.base, 0.6)} 3%, ${mrgb(mt.shade, 0.85)} 11%, #07080c 28%)`,
          boxShadow: `0 -1px 0 ${mrgb(mt.light, 0.55)}` }} data-uv2-premium="" />
      {/* Oberflächenstruktur des Materials, nur am Horizont sichtbar */}
      <div className="pointer-events-none absolute left-1/2 overflow-hidden rounded-full" aria-hidden
        style={{ width: '240vw', height: '240vw', top: '74vh', transform: 'translateX(-50%)', maskImage: 'radial-gradient(circle at 50% 0%, #000 0%, rgba(0,0,0,0.6) 6%, transparent 16%)', WebkitMaskImage: 'radial-gradient(circle at 50% 0%, #000 0%, rgba(0,0,0,0.6) 6%, transparent 16%)', opacity: 0.55, mixBlendMode: 'overlay' }}>
        <svg width="100%" height="100%" preserveAspectRatio="none"><filter id="uv2-hz-noise"><feTurbulence type="fractalNoise" baseFrequency={`${mat.fx / 900} ${mat.fy / 900}`} numOctaves={mat.oct} seed={7} /><feColorMatrix type="saturate" values="0" /></filter><rect width="100%" height="100%" filter="url(#uv2-hz-noise)" /></svg>
      </div>
      <div className="pointer-events-none absolute inset-x-0" style={{ top: 'calc(74vh - 140px)', height: 160, background: 'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(255,210,150,0.04), transparent 70%)' }} />

      {/* Bereiche als Monde über dem Horizont */}
      {slots.map((s, i) => {
        const sp: any = spaces[i];
        return (
          <motion.button key={sp.id} type="button" onClick={() => navigateToSpace(sp.id)} data-testid="uv2-moon"
            className="group absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${s.x * 100}%`, top: `calc(74vh - ${70 + s.lift * 70}px)` }}
            {...(reduced ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] as const, delay: 0.5 + i * 0.12 } })}>
            <span className="block rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{ width: s.size, height: s.size, background: moonBackground(name, 0.7), boxShadow: 'none' }} />
            <span className="mt-3 max-w-[140px] truncate group-hover:text-white" style={{ ...TYPE.meta, fontSize: 10, color: UV.c(0.6), textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>{sp.name}</span>
          </motion.button>
        );
      })}
      {!isLoading && spaces.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center" style={{ top: 'calc(74vh - 92px)' }} data-testid="uv2-moon-nebel">
          <span className="mx-auto block h-7 w-7 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.18)', filter: 'blur(0.5px)' }} />
          <span className="mt-3 block" style={{ ...TYPE.meta, fontSize: 10, color: UV.c(0.4) }}>Noch keine Bereiche</span>
        </div>
      )}

      {/* Editorial-Spalte statt Glasfläche: der Planet spricht links, der Horizont trägt rechts */}
      <div className="absolute inset-y-0 left-0 w-[52%]" style={{ background: 'linear-gradient(90deg, rgba(12,26,30,0.4), rgba(12,26,30,0.16) 70%, transparent)' }} />
      <motion.section className="absolute left-6 right-6 top-20 md:left-24 md:right-auto md:top-[15vh] md:w-[480px]" data-testid="uv2-planet-panel" {...appear(0.15)}>
        <p style={{ ...TYPE.meta, color: UV.gold }}>Planet · {spaces.length} {spaces.length === 1 ? 'Bereich' : 'Bereiche'}</p>
        <h1 className="mt-6" style={{ ...TYPE.display, color: UV.cream }}>{name}</h1>
        <p className="mt-6" style={{ ...TYPE.text, color: UV.c(0.6) }}>{isLoading ? 'Einen Moment …' : interiorSentence(spaces.length, docs.length, incidents.length)}</p>

        {incidents.length > 0 && (
          <div className="mt-8">
            <p style={{ ...TYPE.meta, color: 'rgba(229,140,120,0.85)' }}>Wache</p>
            {incidents.slice(0, 2).map((p: any, i) => (
              <p key={i} className="mt-2" style={{ ...TYPE.text, color: UV.c(0.75) }}>{p.title || p.headline || 'Hinweis der Wache'}</p>
            ))}
          </div>
        )}

        {docs.length > 0 ? (
          <div className="mt-8">
            <p style={{ ...TYPE.meta, color: UV.c(0.35) }}>Zuletzt bewegt</p>
            <ol className="mt-3" style={{ borderTop: `0.5px solid ${UV.hair}` }}>
              {docs.slice(0, 4).map((d: any, i: number) => (
                <li key={d.id} style={{ borderBottom: `0.5px solid ${UV.hair}` }}>
                  <button type="button" className="group flex w-full items-baseline gap-4 py-3 text-left"
                    onClick={() => openPane({ id: `document-${d.id}`, type: 'document', title: d.name || d.title || 'Dokument', size: GLASS_SHEET_SIZE, data: { nodeId: d.id } } as any)}>
                    <span style={{ ...TYPE.meta, color: UV.c(0.35) }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate transition-colors group-hover:text-white" style={{ ...TYPE.text, color: UV.c(0.85) }}>{d.name || d.title || 'Ohne Titel'}</span>
                    {d.updated_at && <span style={{ ...TYPE.meta, color: UV.c(0.35), letterSpacing: '0.1em' }}>{new Date(d.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : !isLoading && (
          <p className="mt-8" style={{ ...TYPE.text, color: UV.c(0.45) }} data-testid="uv2-planet-nebel">
            Hier ist noch nichts entstanden. Sobald es Dokumente gibt, liegen sie hier.
          </p>
        )}

        <div className="mt-10 flex items-center gap-6">
          <button type="button" onClick={() => openMoraWorkspace({ source: 'system', label: name, draftQuestion: `Was ist in ${name} gerade wichtig?`, submitQuestion: true })}
            className="h-10 rounded-full px-6 transition-transform active:scale-[0.97]" style={{ background: UV.goldGrad, color: UV.ink, fontSize: 15, fontWeight: 500 }}>
            MÔRA fragen
          </button>
          <button type="button" disabled={add.isPending || !activeDepartmentId}
            onClick={() => activeDepartmentId && add.mutate({ department_id: activeDepartmentId, name: 'Neuer Bereich', description: 'Im Planeten angelegt' } as any)}
            className="transition-colors hover:text-white disabled:opacity-50" style={{ ...TYPE.text, color: UV.c(0.6) }}>
            Bereich anlegen
          </button>
        </div>
      </motion.section>
      {instrumentContext && <Instruments context={instrumentContext} />}
      <style>{`[data-testid=uv2-planet-interior]{--uv2-ease:${ease}}`}</style>
    </div>
  );
}
