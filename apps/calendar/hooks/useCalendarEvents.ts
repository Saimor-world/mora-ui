import { useState, useEffect, useCallback } from 'react';
import { coreGet, corePost } from '@/lib/api/coreClient';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  duration?: number;
  color?: string;
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    coreGet<CalendarEvent[]>('/v3/calendar/events', { isOptional: true }).then((data) => {
      setEvents(Array.isArray(data) ? data : []);
      setIsLoading(false);
    });
  }, []);

  const addEvent = useCallback(async (title: string, date: string, time?: string) => {
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: CalendarEvent = { id: tempId, title, date, time, color: 'bg-emerald-500' };
    setEvents(prev => [...prev, optimistic]);

    const saved = await corePost<CalendarEvent>('/v3/calendar/events', { title, date, time, duration: 60, color: 'bg-emerald-500' });
    if (saved) {
      setEvents(prev => prev.map(e => e.id === tempId ? saved : e));
    } else {
      setEvents(prev => prev.filter(e => e.id !== tempId));
    }
  }, []);

  return { events, isLoading, addEvent };
}
