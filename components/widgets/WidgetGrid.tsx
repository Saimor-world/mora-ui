'use client';

import React, { useEffect, useMemo, useState } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import { Plus, X, Check, Pencil, RotateCcw, GripVertical } from 'lucide-react';
import { useWidgetStore } from '@/lib/store/widgetStore';
import { useNavStore } from '@/lib/store/navStore';
import { WIDGET_REGISTRY, WIDGET_TYPES } from '@/components/widgets/registry';
import { isWidgetAllowedOnSurface } from '@/lib/widgets/surfaceAllowlist';
import {
    WIDGET_GRID_COLS,
    WIDGET_ROW_HEIGHT,
    type WidgetContext,
    type WidgetSurface,
} from '@/lib/widgets/types';
import { UNIVERSE_ROW_HEIGHT, universeGlanceMins, departmentGlanceMins } from '@/lib/widgets/universeGlance';
import { universeWidgetDefaults } from '@/lib/store/widgetStore';
import { departmentWidgetDefaults } from '@/lib/widgets/universeGlance';
import { widgetOverlapsCosmosColumns } from '@/lib/universe/interactionZones';
import type { UniverseFocusMode } from '@/lib/universe/interactionZones';

const Grid = WidthProvider(GridLayout);
const COLS = WIDGET_GRID_COLS.lg;

/**
 * WidgetGrid — the editable widget desktop for a surface (Universe / Department).
 *
 * View mode: a static, read-only arrangement. Edit mode ("Anpassen"): widgets
 * become draggable + resizable via react-grid-layout, with an add palette, a
 * per-widget remove, and a reset. Geometry persists per user+company on the server.
 */
export function WidgetGrid({
    surface,
    context,
    focusMode = 'peripheral',
}: {
    surface: WidgetSurface;
    context: WidgetContext;
    /** Universe-only: when explore, widgets yield clicks to the planet layer. */
    focusMode?: UniverseFocusMode;
}) {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
    const departmentId = context.departmentId ?? activeDepartmentId;

    const {
        editMode, hydrated,
        hydrate, setLayoutScope, setEditMode, applyLayout, addWidget, removeWidget, resetSurface, getSurfaceItems,
    } = useWidgetStore();
    const [mounted, setMounted] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);

    useEffect(() => {
        setLayoutScope(activeCompanyId, surface === 'department' ? departmentId : null);
    }, [activeCompanyId, departmentId, surface, setLayoutScope]);

    useEffect(() => {
        hydrate();
        setMounted(true);
    }, [hydrate, activeCompanyId]);

    const items = getSurfaceItems(surface, departmentId);
    const isGlanceSurface = surface === 'universe' || surface === 'department';
    const cosmosYield = isGlanceSurface && focusMode === 'explore' && !editMode;
    const rglLayout: Layout[] = useMemo(
        () => items.map((w) => {
            const def = WIDGET_REGISTRY[w.type];
            const glanceMins = isGlanceSurface
                ? (surface === 'department' ? departmentGlanceMins(w.type) : universeGlanceMins(w.type))
                : null;
            return {
                i: w.i,
                x: w.x,
                y: w.y,
                w: w.w,
                h: w.h,
                minW: glanceMins?.minW ?? def?.minW ?? 2,
                minH: glanceMins?.minH ?? def?.minH ?? 2,
            };
        }),
        [items, isGlanceSurface, surface],
    );

    const panelBackground = isGlanceSurface ? 'rgba(8, 24, 38, 0.32)' : 'rgba(8, 11, 24, 0.82)';
    const panelBorder = isGlanceSurface ? 'border-sky-100/[0.08]' : 'border-white/[0.12]';

    if (!mounted || !hydrated || surface === 'home') return null;

    const available = WIDGET_TYPES.filter(
        (t) => WIDGET_REGISTRY[t].surfaces.includes(surface) && isWidgetAllowedOnSurface(t, surface),
    );
    const btn = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors';
    const deptArg = surface === 'department' ? departmentId : undefined;

    return (
        <div className="relative">
            {/* Toolbar — hidden in glance view until edit mode */}
            {(editMode || !isGlanceSurface) && (
            <div className="mb-3 flex items-center justify-between gap-3 pointer-events-none">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    {editMode
                        ? 'Anordnen — ziehen · skalieren · hinzufügen'
                        : isGlanceSurface ? 'Glance' : 'Dein Desktop'}
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                    {editMode && (
                        <>
                            <button
                                onClick={() => setPaletteOpen((v) => !v)}
                                className={`${btn} border-white/12 bg-white/[0.04] text-white/65 hover:bg-white/[0.09] hover:text-white/90`}
                            >
                                <Plus size={12} /> Widget
                            </button>
                            <button
                                onClick={() => resetSurface(surface, deptArg)}
                                className={`${btn} border-white/12 bg-white/[0.04] text-white/45 hover:bg-white/[0.09] hover:text-white/75`}
                            >
                                <RotateCcw size={12} /> Zurücksetzen
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => { setEditMode(!editMode); setPaletteOpen(false); }}
                        className={`${btn} ${editMode
                            ? 'border-emerald-400/30 bg-emerald-400/[0.12] text-emerald-200/85'
                            : 'border-white/12 bg-white/[0.04] text-white/60 hover:bg-white/[0.09] hover:text-white/90'}`}
                    >
                        {editMode ? <><Check size={12} /> Fertig</> : <><Pencil size={12} /> Anpassen</>}
                    </button>
                </div>
            </div>
            )}

            {/* Subtle customize affordance for glance surfaces */}
            {isGlanceSurface && !editMode && (
                <div className="pointer-events-none mb-2 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setEditMode(true)}
                        className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/28 transition-colors hover:border-white/12 hover:text-white/55"
                        title="Widgets anpassen"
                    >
                        <Pencil size={10} /> Anpassen
                    </button>
                </div>
            )}

            {/* Add palette */}
            {editMode && paletteOpen && (
                <div className="pointer-events-auto mb-3 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-xl">
                    {available.map((t) => {
                        const def = WIDGET_REGISTRY[t];
                        return (
                            <button
                                key={t}
                                onClick={() => {
                                    const geom = isGlanceSurface
                                        ? (surface === 'department' ? departmentWidgetDefaults(t) : universeWidgetDefaults(t))
                                        : { w: def.defaultW, h: def.defaultH };
                                    addWidget(surface, t, geom, deptArg);
                                    setPaletteOpen(false);
                                }}
                                className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition-colors hover:border-white/20 hover:bg-white/[0.09]"
                                title={def.hint}
                            >
                                <span className="text-white/55 group-hover:text-white/80">{def.icon}</span>
                                <span className="text-[12px] text-white/72">{def.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* The grid */}
            <Grid
                className={`layout ${isGlanceSurface ? 'pointer-events-none' : ''}`}
                layout={rglLayout}
                cols={COLS}
                rowHeight={isGlanceSurface ? UNIVERSE_ROW_HEIGHT : WIDGET_ROW_HEIGHT}
                margin={isGlanceSurface ? [10, 10] : [14, 14]}
                containerPadding={[0, 0]}
                isDraggable={editMode}
                isResizable={editMode}
                draggableHandle=".widget-drag-handle"
                compactType="vertical"
                onLayoutChange={(l) => {
                    if (editMode) {
                        applyLayout(
                            surface,
                            l.map((x) => ({ i: x.i, x: x.x, y: x.y, w: x.w, h: x.h })),
                            deptArg,
                        );
                    }
                }}
            >
                {items.map((w) => {
                    const def = WIDGET_REGISTRY[w.type];
                    if (!def) return <div key={w.i} />;
                    const widgetContext: WidgetContext = {
                        ...context,
                        surface,
                        gridSize: { w: w.w, h: w.h },
                        compact: isGlanceSurface || (w.w <= 3 && w.h <= 4),
                    };
                    const chromeless = isGlanceSurface && !editMode;
                    const isClockOrb = chromeless && w.type === 'clock';
                    const overlapsCosmos = isGlanceSurface && widgetOverlapsCosmosColumns(w.x, w.w);
                    const allowPointer =
                        !isGlanceSurface ||
                        editMode ||
                        (!cosmosYield && !overlapsCosmos) ||
                        hoveredWidgetId === w.i;
                    return (
                        <div
                            key={w.i}
                            className={`relative flex h-full flex-col overflow-hidden ${
                                allowPointer ? 'pointer-events-auto' : 'pointer-events-none'
                            } ${
                                isClockOrb
                                    ? 'rounded-full border-0 bg-transparent shadow-none'
                                    : chromeless
                                        ? `rounded-2xl border ${panelBorder} backdrop-blur-xl shadow-[0_16px_44px_rgba(0,8,20,0.24),inset_0_1px_0_rgba(255,255,255,0.10)]`
                                        : `rounded-2xl border ${panelBorder} backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]`
                            }`}
                            style={isClockOrb ? undefined : { backgroundColor: panelBackground }}
                            onPointerEnter={() => setHoveredWidgetId(w.i)}
                            onPointerLeave={() => setHoveredWidgetId((current) => (current === w.i ? null : current))}
                        >
                            {!isClockOrb && (
                                <>
                                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-white/[0.08]" />
                                    {!chromeless && (
                                        <>
                                            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-2xl" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)' }} />
                                            <div
                                                className="pointer-events-none absolute inset-0 opacity-[0.5]"
                                                style={{ background: 'linear-gradient(155deg, rgba(var(--scene-rgb, 16,185,129), 0.05), transparent 55%)' }}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                            {(editMode || !isGlanceSurface) && (
                                <div
                                    className={`relative z-[1] flex items-center justify-between ${chromeless ? 'px-1 py-1' : 'px-3 py-2'} ${editMode ? 'widget-drag-handle cursor-grab active:cursor-grabbing' : ''}`}
                                >
                                    <span className={`flex items-center gap-1.5 uppercase tracking-[0.16em] text-white/40 ${chromeless ? 'text-[8px]' : 'text-[10px]'}`}>
                                        {editMode && <GripVertical size={12} className="text-white/30" />}
                                        {!chromeless && def.label}
                                    </span>
                                    {editMode && (
                                        <button
                                            onClick={() => removeWidget(surface, w.i, deptArg)}
                                            className="rounded-md p-0.5 text-white/35 transition-colors hover:bg-rose-400/15 hover:text-rose-300"
                                            aria-label={`${def.label} entfernen`}
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className={`relative z-[1] min-h-0 flex-1 overflow-hidden ${chromeless ? 'p-0' : 'overflow-auto px-2.5 pb-2.5'}`}>
                                {def.render({ context: widgetContext })}
                            </div>
                        </div>
                    );
                })}
            </Grid>
        </div>
    );
}

export default WidgetGrid;
