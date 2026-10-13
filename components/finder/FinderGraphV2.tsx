'use client';

import React, { useRef } from 'react';
import { FileText, Folder, Home, Maximize2, Minus, Plus } from 'lucide-react';
import { PlanetSphere } from '@/components/universe/PlanetSphere';
import { planetGlyph } from '@/components/universe/OrganizationField';

export interface GraphNode { id: string; name: string; type?: string }

interface Props {
    center: string;
    inFolder: boolean;
    folders: GraphNode[];
    files: GraphNode[];
    selectedId: string | null;
    highlightIds: string[];
    zoom: number;
    pan: { x: number; y: number };
    onZoom: (z: number) => void;
    onPan: (p: { x: number; y: number }) => void;
    onFolder: (e: React.MouseEvent, id: string) => void;
    onFolderMenu: (e: React.MouseEvent, n: GraphNode) => void;
    onFile: (n: GraphNode) => void;
    onFileMenu: (e: React.MouseEvent, n: GraphNode) => void;
    onFileHover?: (n: GraphNode | null) => void;
}

const KIND: Record<string, string> = { department: 'Bereich', space: 'Raum', folder: 'Ordner' };

/** Finder-Graph im Universe-Stil: Kern, Bahnen, echte Planetenkörper für Bereiche, Inhalte als Sterne. */
export function FinderGraphV2(p: Props) {
    const drag = useRef<{ on: boolean; x: number; y: number; pan: { x: number; y: number } }>({ on: false, x: 0, y: 0, pan: { x: 0, y: 0 } });
    const nf = Math.max(p.folders.length, 1);
    const files = p.files.slice(0, 14);
    const pos = (i: number, n: number, rx: number, ry: number, off = 0) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2 + off;
        return { x: 50 + Math.cos(a) * rx, y: 50 + Math.sin(a) * ry };
    };
    const folderPos = p.folders.map((_, i) => pos(i, nf, 27, 30));
    const filePos = files.map((_, i) => pos(i, Math.max(files.length, 1), p.folders.length ? 42 : 30, p.folders.length ? 41 : 32, Math.PI / Math.max(files.length, 1)));
    const kinds = Array.from(new Set(p.folders.map((f) => (f.type === 'department' || !p.inFolder ? 'department' : f.type ?? 'folder'))));

    return (
        <div
            className="uv2-fg"
            data-testid="finder-graph-v2"
            onWheel={(e) => { e.preventDefault(); p.onZoom(Math.max(0.4, Math.min(2.5, p.zoom - e.deltaY * 0.001))); }}
            onMouseDown={(e) => { if (e.button === 0) drag.current = { on: true, x: e.clientX, y: e.clientY, pan: p.pan }; }}
            onMouseMove={(e) => { if (drag.current.on) p.onPan({ x: drag.current.pan.x + e.clientX - drag.current.x, y: drag.current.pan.y + e.clientY - drag.current.y }); }}
            onMouseUp={() => { drag.current.on = false; }}
            onMouseLeave={() => { drag.current.on = false; }}
        >
            <div className="uv2-fg__world" style={{ transform: `translate(${p.pan.x}px, ${p.pan.y}px) scale(${p.zoom})` }}>
                <svg className="uv2-fg__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                    <ellipse cx="50" cy="50" rx="27" ry="30" className="uv2-fg__orbit" />
                    {files.length > 0 && <ellipse cx="50" cy="50" rx={p.folders.length ? 42 : 30} ry={p.folders.length ? 41 : 32} className="uv2-fg__orbit" data-outer="" />}
                    {folderPos.map((q, i) => (
                        <path key={p.folders[i].id} d={`M50,50 Q${(50 + q.x) / 2 + (q.y - 50) * 0.18},${(50 + q.y) / 2 - (q.x - 50) * 0.18} ${q.x},${q.y}`} className="uv2-fg__link" data-on={p.selectedId === p.folders[i].id ? '' : undefined} />
                    ))}
                    {filePos.map((q, i) => (p.highlightIds.includes(files[i].id) ? <path key={files[i].id} d={`M50,50 L${q.x},${q.y}`} className="uv2-fg__link" data-on="" /> : null))}
                </svg>

                <div className="uv2-fg__core" style={{ left: '50%', top: '50%' }}>
                    <span className="uv2-fg__coreOrb">{p.inFolder ? <Folder /> : <Home />}</span>
                    <span className="uv2-fg__label" data-core="">{p.center}</span>
                </div>

                {p.folders.map((f, i) => {
                    const q = folderPos[i];
                    const isDept = f.type === 'department' || !p.inFolder;
                    return (
                        <button
                            key={f.id}
                            type="button"
                            className="uv2-fg__node"
                            data-selected={p.selectedId === f.id ? '' : undefined}
                            style={{ left: `${q.x}%`, top: `${q.y}%` }}
                            onClick={(e) => p.onFolder(e, f.id)}
                            onContextMenu={(e) => p.onFolderMenu(e, f)}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={f.name}
                        >
                            {isDept ? (
                                <span className="uv2-fg__planet"><PlanetSphere name={f.name} size={58} seed={i + 2} glyph={planetGlyph(f.name)} /></span>
                            ) : (
                                <span className="uv2-fg__orb"><Folder /></span>
                            )}
                            <span className="uv2-fg__label">{f.name}</span>
                        </button>
                    );
                })}

                {files.map((f, i) => {
                    const q = filePos[i];
                    return (
                        <button
                            key={f.id}
                            type="button"
                            className="uv2-fg__star"
                            data-on={p.highlightIds.includes(f.id) ? '' : undefined}
                            style={{ left: `${q.x}%`, top: `${q.y}%` }}
                            onClick={() => p.onFile(f)}
                            onContextMenu={(e) => p.onFileMenu(e, f)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseEnter={() => p.onFileHover?.(f)}
                            onMouseLeave={() => p.onFileHover?.(null)}
                            title={f.name}
                        >
                            <i />
                            <span className="uv2-fg__label" data-small="">{f.name}</span>
                        </button>
                    );
                })}
            </div>

            <div className="uv2-fg__legend">
                {kinds.map((k) => <span key={k}><i data-k={k} />{KIND[k] ?? 'Ordner'}</span>)}
                {p.files.length > 0 && <span><i data-k="file" /><FileText />{p.files.length} Inhalte</span>}
            </div>
            <div className="uv2-fg__zoom" role="group" aria-label="Zoom">
                <button type="button" aria-label="Kleiner" onClick={() => p.onZoom(Math.max(0.4, p.zoom - 0.15))}><Minus /></button>
                <span>{Math.round(p.zoom * 100)} %</span>
                <button type="button" aria-label="Größer" onClick={() => p.onZoom(Math.min(2.5, p.zoom + 0.15))}><Plus /></button>
                <button type="button" aria-label="Einpassen" onClick={() => { p.onZoom(1); p.onPan({ x: 0, y: 0 }); }}><Maximize2 /></button>
            </div>
        </div>
    );
}
