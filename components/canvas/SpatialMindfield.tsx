"use client";

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    ZoomIn,
    ZoomOut,
    Compass,
    Layers,
    Folder,
    FileText,
    ShieldCheck,
    HardDrive,
} from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useTree } from '@/lib/queries/useTree';
import { buildFabricLayout } from '@/lib/universe/fabricLayout';

interface SpatialNode {
    id: string;
    type: 'department' | 'space' | 'folder' | 'node' | 'file' | 'sentinel';
    title: string;
    subtitle?: string;
    x: number;
    y: number;
    color?: string;
    parentId?: string | null;
    data?: any;
}

interface SpatialMindfieldProps {
    className?: string;
    embedded?: boolean;
}

export function SpatialMindfield({ className = '', embedded = false }: SpatialMindfieldProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const { data: treeData = [] } = useTree(activeCompanyId);
    const openPane = usePaneStore((s) => s.openPane);

    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    const spatialNodes = useMemo<SpatialNode[]>(() => {
        const realNodes = buildFabricLayout(Array.isArray(treeData) ? treeData : []);
        if (embedded) return realNodes;

        return [
            { id: 'node-sentinel', type: 'sentinel' as const, title: 'Nightwatch Sentinel', subtitle: 'Systemschutz', x: 0, y: 0, color: '#10b981', parentId: null, data: { status: 'optimal', healthScore: 100 } },
            { id: 'node-files-hub', type: 'file' as const, title: 'Meine Dateien & Cloud', subtitle: 'Speicher', x: -260, y: -140, color: '#38bdf8', parentId: null },
            ...realNodes,
        ];
    }, [embedded, treeData]);
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-spatial-node]')) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y
        };
    }, [pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPan({
            x: dragStartRef.current.panX + dx,
            y: dragStartRef.current.panY + dy
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((prev) => Math.min(Math.max(0.4, prev + delta), 2.2));
    }, []);

    const handleResetView = useCallback(() => {
        setPan({ x: 0, y: 0 });
        setZoom(1);
    }, []);

    const handleNodeClick = useCallback((node: SpatialNode) => {
        setSelectedNodeId(node.id);

        if (node.type === 'sentinel') {
            openPane({
                id: 'nightwatch-main',
                type: 'nightwatch' as any,
                title: 'Nightwatch',
                size: { width: 780, height: 640 }
            });
            return;
        }

        if (node.id === 'node-files-hub' || node.type === 'file') {
            openPane({
                id: 'meine-dateien-main',
                type: 'meine-dateien' as any,
                title: 'Meine Dateien',
                size: { width: 960, height: 680 }
            });
            return;
        }

        if (node.type === 'department' || node.type === 'folder' || node.type === 'space') {
            openPane({
                id: 'finder-main',
                type: 'finder' as any,
                title: node.title,
                size: { width: 920, height: 620 }
            });
            return;
        }

        openPane({
            id: 'notes-main',
            type: 'notes' as any,
            title: node.title,
            size: { width: 860, height: 620 }
        });
    }, [openPane]);

    return (
        <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className={`relative w-full h-full overflow-hidden select-none ${embedded ? 'bg-transparent' : 'bg-[#090616]'} ${className}`}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            <div className={`absolute inset-0 pointer-events-none ${embedded ? 'opacity-10' : 'opacity-25'}`}>
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
                        backgroundSize: `${36 * zoom}px ${36 * zoom}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`
                    }}
                />
            </div>

            <div
                className={`absolute w-[600px] h-[600px] rounded-full pointer-events-none blur-3xl transition-transform ${embedded ? 'opacity-10' : 'opacity-20'}`}
                style={{
                    background: 'radial-gradient(circle, #38bdf8 0%, #a855f7 40%, transparent 70%)',
                    left: `calc(50% + ${pan.x}px - 300px)`,
                    top: `calc(50% + ${pan.y}px - 300px)`,
                    transform: `scale(${zoom})`
                }}
            />

            <div
                className="absolute inset-0 w-full h-full origin-center transition-transform duration-75 ease-out"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center'
                }}
            >
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <defs>
                        <linearGradient id="synapse-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#34d399" stopOpacity="0.4" />
                        </linearGradient>
                    </defs>
                    {(embedded ? spatialNodes : spatialNodes.slice(1)).map((node) => {
                        const centerX = containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : 960;
                        const centerY = containerRef.current?.clientHeight ? containerRef.current.clientHeight / 2 : 540;
                        const parent = node.parentId ? spatialNodes.find((candidate) => candidate.id === node.parentId) : null;
                        const startX = centerX + (parent?.x || 0);
                        const startY = centerY + (parent?.y || 0);
                        const targetX = centerX + node.x;
                        const targetY = centerY + node.y;

                        return (
                            <path
                                key={`edge-${node.id}`}
                                d={`M ${startX} ${startY} Q ${(startX + targetX) / 2 + 30} ${(startY + targetY) / 2 - 20} ${targetX} ${targetY}`}
                                fill="none"
                                stroke="url(#synapse-gradient)"
                                strokeWidth={hoveredNodeId === node.id ? 2.5 : 1.2}
                                strokeDasharray={hoveredNodeId === node.id ? '4 2' : 'none'}
                                opacity={hoveredNodeId === node.id ? 0.9 : 0.35}
                                className="transition-all duration-300"
                            />
                        );
                    })}
                </svg>

                {spatialNodes.map((node) => {
                    const centerX = containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : 960;
                    const centerY = containerRef.current?.clientHeight ? containerRef.current.clientHeight / 2 : 540;
                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;

                    return (
                        <div
                            key={node.id}
                            data-spatial-node="true"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNodeClick(node);
                            }}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 hover:scale-105"
                            style={{
                                left: `${centerX + node.x}px`,
                                top: `${centerY + node.y}px`,
                            }}
                        >
                            <div
                                className={`${embedded ? 'flex flex-col items-center gap-2 rounded-full border-0 bg-transparent p-2 shadow-none' : 'flex items-center gap-3.5 rounded-2xl border px-4 py-3 backdrop-blur-xl shadow-2xl'} transition-all ${
                                    isSelected || isHovered
                                        ? embedded
                                            ? 'border-transparent bg-transparent drop-shadow-[0_0_22px_rgba(125,211,252,0.72)]'
                                            : 'border-white/35 bg-white/12 shadow-[0_0_30px_rgba(56,189,248,0.35)]'
                                        : embedded
                                            ? 'border-transparent bg-transparent shadow-none'
                                            : 'border-white/10 bg-black/40 shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
                                }`}
                                style={{
                                    borderColor: isHovered ? (node.color || '#38bdf8') : undefined
                                }}
                            >
                                <div
                                    className={`${embedded ? 'h-14 w-14 rounded-full shadow-[0_0_28px_rgba(56,189,248,0.18)]' : 'h-9 w-9 rounded-xl'} flex shrink-0 items-center justify-center border backdrop-blur-md`}
                                    style={{
                                        background: `${node.color || '#38bdf8'}18`,
                                        borderColor: `${node.color || '#38bdf8'}35`,
                                        color: node.color || '#38bdf8'
                                    }}
                                >
                                    {node.type === 'sentinel' && <ShieldCheck size={18} />}
                                    {node.type === 'department' && <Compass size={20} />}
                                    {node.type === 'space' && <Layers size={18} />}
                                    {node.type === 'folder' && <Folder size={18} />}
                                    {node.type === 'file' && <HardDrive size={18} />}
                                    {node.type === 'node' && <FileText size={18} />}
                                </div>
                                <div className={`min-w-0 ${embedded ? 'rounded-full bg-slate-950/36 px-3 py-1 text-center backdrop-blur-md' : 'pr-2'}`}>
                                    <div className={`${embedded ? 'text-[11px] tracking-[0.04em]' : 'text-sm'} max-w-[180px] truncate font-semibold text-white/90`}>
                                        {node.title}
                                    </div>
                                    {node.subtitle && (
                                        <div className={`${embedded ? 'text-[9px]' : 'text-[11px]'} truncate font-mono text-white/45`}>
                                            {node.subtitle}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="absolute bottom-24 right-8 z-30 flex items-center gap-2 px-3 py-2 rounded-full border border-white/12 bg-black/60 backdrop-blur-2xl shadow-2xl">
                <button
                    onClick={() => setZoom((z) => Math.min(2.2, z + 0.2))}
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Heranzoomen"
                    aria-label="Zoom in"
                >
                    <ZoomIn size={16} />
                </button>
                <div className="text-[11px] font-mono text-white/55 px-1 min-w-[40px] text-center">
                    {Math.round(zoom * 100)}%
                </div>
                <button
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Herauszoomen"
                    aria-label="Zoom out"
                >
                    <ZoomOut size={16} />
                </button>
                <div className="w-px h-4 bg-white/15 mx-1" />
                <button
                    onClick={handleResetView}
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Ansicht zentrieren"
                    aria-label="Reset view"
                >
                    <Compass size={16} />
                </button>
            </div>
        </div>
    );
}
