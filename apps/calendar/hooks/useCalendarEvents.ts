import { useState, useEffect, useCallback } from 'react';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { normalizeList } from '@/lib/api/http';
import { broadcastCommunicationSync } from '@/lib/integrations/communicationEvents';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration?: number;
  color?: string;
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await coreGet('/v3/calendar/events', {
        isOptional: true,
        throwAuthErrors: true,
      });
      if (data == null) {
        setAvailable(false);
        return;
      }
      setEvents(normalizeList<CalendarEvent>(data, ['events', 'appointments', 'calendar', 'data']));
      setAvailable(true);
      broadcastCommunicationSync('calendar-fetch');
    } catch (requestError) {
      console.warn('[Calendar] load failed', requestError);
      // Keep the last confirmed snapshot. Unavailable is not an empty day.
      setAvailable(false);
      setError('Der Kalender konnte gerade nicht aktualisiert werden.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addEvent = useCallback(async (title: string, date: string, time?: string) => {
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: CalendarEvent = { id: tempId, title, date, time, color: 'bg-emerald-500' };
    setEvents((previous) => [...previous, optimistic]);
    setError(null);

    try {
      const saved = await corePost('/v3/calendar/events', {
        title,
        date,
        time,
        duration: 60,
        color: 'bg-emerald-500',
      }, { throwAuthErrors: true });
      if (!saved || typeof saved !== 'object') {
        throw new Error('Calendar persistence was not confirmed');
      }
      setEvents((previous) => previous.map((event) => event.id === tempId ? saved as CalendarEvent : event));
      setAvailable(true);
      broadcastCommunicationSync('calendar-create');
    } catch (requestError) {
      console.warn('[Calendar] create failed', requestError);
      setEvents((previous) => previous.filter((event) => event.id !== tempId));
      setError('Der Termin konnte nicht gespeichert werden.');
      throw requestError;
    }
  }, []);

  return {
    events,
    isLoading,
    isRefreshing,
    available,
    error,
    refresh: () => load(true),
    addEvent,
  };
}
