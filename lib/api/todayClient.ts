import { coreGet } from './http';

export type TodaySourceStatus = 'ok' | 'unknown';
export type TodayStatus = 'ok' | 'degraded' | 'unknown';

export type TodayMailItem = {
  id: string;
  subject?: string;
  from_addr?: string;
  date?: string;
  snippet?: string;
  read?: boolean;
};

export type TodayCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration?: number;
  location?: string;
};

export type TodayTask = {
  id: string;
  title: string;
  status: 'backlog' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | null;
  due_date?: string | null;
};

export type TodayIncident = {
  id: string;
  title: string;
  summary?: string;
  severity?: 'info' | 'warning' | 'critical' | string;
  status?: string;
  acked?: boolean;
  host?: string | null;
};

export type TodaySnapshot = {
  status: TodayStatus;
  date: string;
  timezone: string;
  generated_at: string;
  mail: {
    status: TodaySourceStatus;
    inbox_loaded: number | null;
    items: TodayMailItem[];
  };
  calendar: {
    status: TodaySourceStatus;
    date: string;
    count: number | null;
    next_event: TodayCalendarEvent | null;
    events: TodayCalendarEvent[];
  };
  tasks: {
    status: TodaySourceStatus;
    counts: {
      open: number | null;
      in_progress: number | null;
      due_today: number | null;
      overdue: number | null;
    };
    items: TodayTask[];
    due_today: TodayTask[];
    overdue: TodayTask[];
  };
  nightwatch: {
    status: TodaySourceStatus;
    open_incidents: number | null;
    health_score: number | null;
    incidents: TodayIncident[];
  };
};

export async function fetchTodaySnapshot(companyId?: string | null): Promise<TodaySnapshot | null> {
  const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return coreGet(`/v3/today${query}`, { isOptional: true }) as Promise<TodaySnapshot | null>;
}
