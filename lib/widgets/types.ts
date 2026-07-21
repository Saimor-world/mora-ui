// Widget system — shared types.
//
// Built on react-grid-layout: a surface (Home, Department) owns a list of
// widget instances, each carrying its grid geometry (x/y/w/h in grid units).
// react-grid-layout handles free drag, resize, collision and compaction; we
// persist the geometry per surface so a user's desktop arrangement sticks.

export type WidgetSurface = 'home' | 'department' | 'universe';

/** A placed widget. `i` is the react-grid-layout item key (instance id). */
export interface WidgetInstance {
    i: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

// ── Live data threaded from the host surface (single source of truth) ─────────
// HomeSurface already computes mail/calendar previews + presence from the real
// backend. Rather than each widget re-polling its own hooks, the surface passes
// the truth down so the Desktop shows exactly what the Cockpit shows.

import type { IntegrationConnectionState } from '@/lib/integrations/connectionState';

export interface WidgetMailItem { id: string; subject: string; from: string; snippet?: string; date?: string }
export interface WidgetCalItem { id: string; title: string; date?: string; time?: string; location?: string }
export interface WidgetFeedItem { id: string; sourceTitle: string; title: string; summary?: string; published?: string; link?: string; imageUrl?: string }

export interface WidgetData {
    mailPreview?: WidgetMailItem[];
    calendarPreview?: WidgetCalItem[];
    feedPreview?: WidgetFeedItem[];
    mailState: IntegrationConnectionState;
    calendarState: IntegrationConnectionState;
    cloudState: IntegrationConnectionState;
    rssState: IntegrationConnectionState;
    onlineCount?: number;
}

/** Handlers + live data a widget may use. All optional — a widget degrades gracefully. */
export interface WidgetContext {
    surface: WidgetSurface;
    departmentId?: string | null;
    /** Live truth from the host surface (mail/calendar previews, presence). */
    data?: WidgetData;
    openMora?: () => void;
    /** Open the MÔRA chat pane directly on the Signale tab. */
    openSignals?: () => void;
    openFinder?: () => void;
    openCalendar?: () => void;
    openMail?: () => void;
    openTeam?: () => void;
    openIntegrations?: () => void;
    /** Open integrations pane focused on RSS feeds. */
    openFeed?: () => void;
    /** Open the App Library pane (NOT integrations). */
    openApps?: () => void;
    openNightwatch?: () => void;
    /** Saimôr Desk / dash.saimor.world — ops dashboard */
    openDashboard?: () => void;
    /** Open a larry.* workspace artifact in the document pane */
    openLarryNode?: (nodeId: string, title?: string) => void;
    goExplore?: () => void;
    /** Grid cell size — widgets adapt their internal layout to fit. */
    gridSize?: { w: number; h: number };
    /** Compact rendering (universe glance panels, small cells). */
    compact?: boolean;
    /** Home lock-screen: rich fixed rows, no inner scroll — opens sheet via Alle anzeigen. */
    homeGlance?: boolean;
    /** Max list rows before truncation (default 3 on homeGlance). */
    glanceLimit?: number;
}

export interface WidgetDefinition {
    type: string;
    label: string;
    /** One-line description shown in the add palette. */
    hint: string;
    icon: React.ReactNode;
    defaultW: number;
    defaultH: number;
    minW: number;
    minH: number;
    surfaces: WidgetSurface[];
    /** The widget body. Receives the live context. */
    render: (props: { context: WidgetContext }) => React.ReactNode;
}

/** Grid column counts per react-grid-layout breakpoint. */
export const WIDGET_GRID_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const;
export const WIDGET_GRID_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
export const WIDGET_ROW_HEIGHT = 58;
