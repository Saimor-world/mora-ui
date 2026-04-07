'use client';
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { CalendarGrid } from './components/CalendarGrid';
import { CalendarEventPanel } from './components/CalendarEventPanel';

export default function CalendarApp({ paneId }: AppProps) {
  const { events, addEvent } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#030806]/95 overflow-hidden">
      <div className="flex-1 p-4 overflow-hidden">
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          events={events}
          onNavigate={setCurrentDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {selectedDate && (
        <CalendarEventPanel
          selectedDate={selectedDate}
          events={events}
          onAddEvent={(title) => addEvent(title, selectedDate.toISOString().split('T')[0])}
        />
      )}

      <div className="px-4 pb-3 flex items-center gap-2 text-[10px] text-white/20 border-t border-white/5 pt-2">
        <Sparkles size={10} className="text-amber-500/40" />
        <span>Termine werden als Einträge im Mycelium gespeichert</span>
      </div>
    </div>
  );
}
