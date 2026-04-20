'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { Eraser, Minus, Plus, Trash2 } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = 'pen' | 'eraser';

const PALETTE = [
    '#ffffff', '#94a3b8', '#f87171', '#fb923c',
    '#fbbf24', '#4ade80', '#34d399', '#38bdf8',
    '#818cf8', '#c084fc',
];

// ─── CanvasApp ────────────────────────────────────────────────────────────────

export default function CanvasApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const [tool, setTool] = useState<Tool>('pen');
    const [color, setColor] = useState('#ffffff');
    const [size, setSize] = useState(3);

    // ── Drawing helpers ────────────────────────────────────────────────────────

    const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

    const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        drawing.current = true;
        lastPos.current = getPos(e);
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!drawing.current || !lastPos.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        const pos = getPos(e);

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
        ctx.lineWidth = tool === 'eraser' ? size * 5 : size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.stroke();

        lastPos.current = pos;
    }, [tool, color, size]);

    const onMouseUp = useCallback(() => {
        drawing.current = false;
        lastPos.current = null;
        const ctx = getCtx();
        if (ctx) ctx.globalCompositeOperation = 'source-over';
    }, []);

    const handleClear = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Resize canvas when pane size changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Preserve existing content via ImageData
        const ctx = canvas.getContext('2d');
        const snapshot = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        if (snapshot) ctx?.putImageData(snapshot, 0, 0);
    }, [pane?.size.width, pane?.size.height]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Canvas"
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
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] flex-wrap shrink-0">
                    {/* Tool buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setTool('pen')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                                tool === 'pen'
                                    ? 'bg-white/15 text-white/80 border border-white/20'
                                    : 'text-white/35 hover:text-white/60 hover:bg-white/10'
                            }`}
                        >
                            Stift
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            className={`p-1.5 rounded-lg transition-colors ${
                                tool === 'eraser'
                                    ? 'bg-white/15 text-white/80 border border-white/20'
                                    : 'text-white/35 hover:text-white/60 hover:bg-white/10'
                            }`}
                            title="Radierer"
                        >
                            <Eraser size={12} />
                        </button>
                    </div>

                    <div className="w-px h-4 bg-white/[0.08]" />

                    {/* Size control */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setSize(s => Math.max(1, s - 1))}
                            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                        >
                            <Minus size={10} />
                        </button>
                        <span className="text-[10px] text-white/35 w-4 text-center">{size}</span>
                        <button
                            onClick={() => setSize(s => Math.min(20, s + 1))}
                            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                        >
                            <Plus size={10} />
                        </button>
                    </div>

                    <div className="w-px h-4 bg-white/[0.08]" />

                    {/* Color palette */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {PALETTE.map(c => (
                            <button
                                key={c}
                                onClick={() => { setColor(c); setTool('pen'); }}
                                style={{ backgroundColor: c }}
                                className={`w-4 h-4 rounded-full transition-all ${
                                    color === c && tool === 'pen'
                                        ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-black/50 scale-110'
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="ml-auto">
                        <button
                            onClick={handleClear}
                            className="p-1.5 rounded hover:bg-red-500/20 text-white/25 hover:text-red-400 transition-colors"
                            title="Alles löschen"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>

                {/* Drawing surface */}
                <div className="flex-1 relative overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                    />
                </div>
            </div>
        </GlassPanel>
    );
}
