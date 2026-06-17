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

const Grid = WidthProvider(GridLayout);
const COLS = WIDGET_GRID_COLS.lg;

/**
 * WidgetGrid — the editable widget desktop for a surface (Universe / Department).
 *
 * View mode: a static, read-only arrangement. Edit mode ("Anpassen"): widgets
 * become draggable + resizable via react-grid-layout, with an add palette, a
 * per-widget remove, and a reset. Geometry persists per user+company on the server.
 */
export function WidgetGrid({ surface, context }: { surface: WidgetSurface; context: WidgetContext }) {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
    const departmentId = context.departmentId ?? activeDepartmentId;

    const {
        editMode, hydrated,
        hydrate, setLayoutScope, setEditMode, applyLayout, addWidget, removeWidget, resetSurface, getSurfaceItems,
    } = useWidgetStore();
    const [mounted, setMounted] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        setLayoutScope(activeCompanyId, surface === 'department' ? departmentId : null);
    }, [activeCompanyId, departmentId, surface, setLayoutScope]);

    useEffect(() => {
        hydrate();
        setMounted(true);
    }, [hydrate, activeCompanyId]);

    const items = getSurfaceItems(surface, departmentId);
    const rglLayout: Layout[] = useMemo(
        () => items.map((w) => {
            const def = WIDGET_REGISTRY[w.type];
            return { i: w.i, x: w.x, y: w.y, w: w.w, h: w.h, minW: def?.minW ?? 2, minH: def?.minH ?? 2 };
        }),
        [items],
    );

    if (!mounted || !hydrated || surface === 'home') return null;

    const available = WIDGET_TYPES.filter(
        (t) => WIDGET_REGISTRY[t].surfaces.includes(surface) && isWidgetAllowedOnSurface(t, surface),
    );
    const btn = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors';
    const deptArg = surface === 'department' ? departmentId : undefined;

    return (
        <div className="relative">
            {/* Toolbar */}
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    {editMode ? 'Anordnen — ziehen · skalieren · hinzufügen' : 'Dein Desktop'}
                </div>
                <div className="flex items-center gap-2">
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

            {/* Add palette */}
            {editMode && paletteOpen && (
                <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-xl">
                    {available.map((t) => {
                        const def = WIDGET_REGISTRY[t];
                        return (
                            <button
                                key={t}
                                onClick={() => { addWidget(surface, t, { w: def.defaultW, h: def.defaultH }, deptArg); setPaletteOpen(false); }}
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
                className="layout"
                layout={rglLayout}
                cols={COLS}
                rowHeight={WIDGET_ROW_HEIGHT}
                margin={[14, 14]}
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
                    return (
                        <div
                            key={w.i}
                            className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                            style={{ backgroundColor: 'rgba(10, 13, 23, 0.62)' }}
                        >
                            <div
                                className="pointer-events-none absolute inset-0 opacity-[0.5]"
                                style={{ background: 'linear-gradient(155deg, rgba(var(--scene-rgb, 16,185,129), 0.05), transparent 55%)' }}
                            />
                            <div
                                className={`relative z-[1] flex items-center justify-between px-3 py-2 ${editMode ? 'widget-drag-handle cursor-grab active:cursor-grabbing' : ''}`}
                            >
                                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40">
                                    {editMode && <GripVertical size={12} className="text-white/30" />}
                                    {def.label}
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
                            <div className="relative z-[1] min-h-0 flex-1 overflow-auto px-3 pb-3">
                                {def.render({ context })}
                            </div>
                        </div>
                    );
                })}
            </Grid>
        </div>
    );
}

export default WidgetGrid;
