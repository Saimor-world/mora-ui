'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, X } from 'lucide-react';
import type { CalendarEvent } from '../hooks/useCalendarEvents';

interface Props {
  selectedDate: Date;
  events: CalendarEvent[];
  onAddEvent: (title: string) => void;
}

export function CalendarEventPanel({ selectedDate, events, onAddEvent }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');

  const dateEvents = events.filter(
    e => new Date(e.date).toDateString() === selectedDate.toDateString()
  );

  const handleAdd = () => {
    if (!title.trim()) return;
    onAddEvent(title.trim());
    setTitle('');
    setShowForm(false);
  };

  return (
    <div className="border-t border-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-emerald-100">
          {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <button
          onClick={() => setShowForm(true)}
          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="space-y-1.5 max-h-28 overflow-y-auto">
        {dateEvents.length === 0 ? (
          <p className="text-[11px] text-emerald-500/40 py-2 text-center">Keine Termine</p>
        ) : (
          dateEvents.map(ev => (
            <div key={ev.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <div className={`w-1 h-6 rounded-full ${ev.color || 'bg-emerald-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-100 truncate">{ev.title}</p>
                {ev.time && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-500/50">
                    <Clock size={8} /><span>{ev.time}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 flex items-center gap-1.5 overflow-hidden"
          >
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Neuer Termin..."
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/30"
              autoFocus
            />
            <button onClick={handleAdd} disabled={!title.trim()} className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30 disabled:opacity-50 transition-colors">
              +
            </button>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
