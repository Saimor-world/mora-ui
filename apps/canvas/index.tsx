'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Plus, X, StickyNote } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';

interface Sticky {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

const COLORS = ['bg-yellow-500/20 border-yellow-500/30', 'bg-blue-500/20 border-blue-500/30', 'bg-emerald-500/20 border-emerald-500/30', 'bg-purple-500/20 border-purple-500/30', 'bg-pink-500/20 border-pink-500/30'];
let colorIdx = 0;

function StickyCard({ sticky, onUpdate, onDelete }: { sticky: Sticky; onUpdate: (id: string, text: string) => void; onDelete: (id: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const stickyRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: sticky.x, y: sticky.y });

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setIsDragging(true);
    const onMove = (me: MouseEvent) => setPos({ x: me.clientX - offsetRef.current.x, y: me.clientY - offsetRef.current.y });
    const onUp = () => { setIsDragging(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div ref={stickyRef} onMouseDown={onMouseDown}
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: 180, zIndex: isDragging ? 100 : 1 }}
      className={`rounded-xl border p-3 cursor-move shadow-xl backdrop-blur-md ${sticky.color} ${isDragging ? 'scale-105' : ''} transition-transform`}>
      <div className="flex items-start justify-between gap-1 mb-2">
        <StickyNote size={10} className="text-white/30 mt-0.5 shrink-0" />
        <button onClick={() => onDelete(sticky.id)} className="text-white/20 hover:text-red-400 transition-colors shrink-0"><X size={11} /></button>
      </div>
      <textarea value={sticky.text} onChange={e => onUpdate(sticky.id, e.target.value)}
        className="w-full bg-transparent text-xs text-white/70 placeholder:text-white/20 resize-none focus:outline-none min-h-[60px]"
        placeholder="Notiz…" rows={4} />
    </div>
  );
}

export default function CanvasApp({ paneId }: AppProps) {
  const [stickies, setStickies] = useState<Sticky[]>([]);

  const addSticky = useCallback(() => {
    const color = COLORS[colorIdx % COLORS.length];
    colorIdx++;
    setStickies(prev => [...prev, {
      id: `s-${Date.now()}`,
      text: '',
      x: 40 + Math.random() * 300,
      y: 40 + Math.random() * 200,
      color,
    }]);
  }, []);

  const updateSticky = useCallback((id: string, text: string) => {
    setStickies(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  }, []);

  const deleteSticky = useCallback((id: string) => {
    setStickies(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#040a07]/80" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button onClick={addSticky}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.09] text-white/50 hover:text-white/80 hover:bg-white/[0.1] transition-all text-xs">
          <Plus size={11} />Sticky
        </button>
        {stickies.length > 0 && <span className="text-[10px] text-white/20">{stickies.length} Karten</span>}
      </div>
      {stickies.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <StickyNote size={32} className="mx-auto mb-3 text-white/10" />
            <p className="text-xs text-white/15">Klicke auf „Sticky" um Notizzettel hinzuzufügen</p>
          </div>
        </div>
      )}
      {stickies.map(s => (
        <StickyCard key={s.id} sticky={s} onUpdate={updateSticky} onDelete={deleteSticky} />
      ))}
    </div>
  );
}
