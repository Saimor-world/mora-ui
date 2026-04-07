'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '../hooks/useCalendarEvents';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const WEEK_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  currentDate: Date;
  selectedDate: Date | null;
  events: CalendarEvent[];
  onNavigate: (d: Date) => void;
  onSelectDate: (d: Date) => void;
}

function generateDays(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  const startDow = firstDay.getDay() || 7;
  for (let i = 1; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export function CalendarGrid({ currentDate, selectedDate, events, onNavigate, onSelectDate }: Props) {
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => selectedDate?.toDateString() === d.toDateString();
  const getEventsForDate = (d: Date) =>
    events.filter(e => new Date(e.date).toDateString() === d.toDateString());

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-base font-light text-emerald-50">
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onNavigate(new Date())}
            className="px-2 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-colors"
          >
            Heute
          </button>
          <button
            onClick={() => onNavigate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[10px] text-emerald-500/50 uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {generateDays(currentDate).map((date, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: date ? 1.05 : 1 }}
            onClick={() => date && onSelectDate(date)}
            className={[
              'aspect-square rounded-lg flex flex-col items-center justify-start p-1 cursor-pointer transition-all',
              !date ? 'opacity-0 pointer-events-none' : '',
              date && isToday(date) ? 'bg-emerald-500/20 border border-emerald-500/30' : '',
              date && isSelected(date) ? 'bg-amber-500/20 border border-amber-500/30' : '',
              date && !isToday(date) && !isSelected(date) ? 'hover:bg-white/5 border border-transparent' : '',
            ].join(' ')}
          >
            {date && (
              <>
                <span className={`text-xs ${isToday(date) ? 'text-emerald-400 font-semibold' : 'text-emerald-100'}`}>
                  {date.getDate()}
                </span>
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {getEventsForDate(date).slice(0, 3).map(ev => (
                    <div key={ev.id} className={`w-1 h-1 rounded-full ${ev.color || 'bg-emerald-500'}`} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
