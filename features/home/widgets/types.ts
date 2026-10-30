/** A widget is supplied by an authorized source adapter, never inferred from industry. */
export type WidgetSize = 's' | 'm' | 'l';
export type WidgetState = 'ready' | 'stale' | 'unavailable';
export type WidgetContent =
  | { type: 'metric'; value: string; detail?: string; trend?: number[] }
  | { type: 'list' | 'appointments' | 'feed'; items: { id: string; title: string; detail?: string }[] }
  | { type: 'status'; label: string; detail?: string }
  | { type: 'approval'; title: string; detail?: string };

export interface SourceWidget {
  id: string;
  title: string;
  source: string;
  updatedAt: string | null;
  state: WidgetState;
  size: WidgetSize;
  demo: boolean;
  content: WidgetContent;
}

/** Disconnected sources are absent; stale data stays explicitly marked. */
export function widgetsFromSources(sources: Array<{ connected: boolean; widgets: SourceWidget[] }>): SourceWidget[] {
  return sources.filter(source => source.connected).flatMap(source => source.widgets);
}
