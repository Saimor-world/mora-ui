'use client';

/**
 * MÔRA-Jarvis, Phase 1: ein typisiertes Register aller OS-Funktionen.
 *
 * Jede Funktion ist eine OsAction mit Parameter-Prüfung, Stufe (tier) und –
 * wo möglich – Undo. Buttons, MÔRA-Zeile und CORE-ui_actions können dieselben
 * Aktionen aufrufen. Die Stufen werden hier im Client durchgesetzt:
 *   instant   – nur Ansicht, sofort, wird protokolliert
 *   undoable  – lokale Änderung, sofort, mit Zurück
 *   approval  – extern / Geld / Löschen / Teilen: nur mit Freigabe-Token
 *   never     – Wallet, XRPL, ORIGIN, Secrets: hart abgelehnt
 * Kein Netzwerkaufruf in diesem Modul; CORE bleibt unverändert.
 */

import { APP_REGISTRY, getAppManifest } from '@/lib/apps/appRegistry';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore, type LayoutPreset } from '@/lib/store/paneStore';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import { RITUAL_SCENE_ORDER, persistRitualSettings, resolveRitualSettings, type RitualSceneId } from '@/lib/os/ritualMode';
import { openVoiceOverlay, closeVoiceOverlay, isVoiceOverlayOpen } from '@/lib/os/openVoiceOverlay';
import { recordAction, type JarvisSource } from './undoLog';

export type ActionTier = 'instant' | 'undoable' | 'approval' | 'never';
export type ActionGroup = 'os' | 'universe' | 'settings' | 'mora' | 'work' | 'extern' | 'gesperrt';

export interface ActionOutcome {
    summary: string;
    undo?: () => void;
    /** CSS selector of the element the gold thread should point to. */
    target?: string;
}

export interface OsAction<P = Record<string, unknown>> {
    id: string;
    title: string;
    group: ActionGroup;
    tier: ActionTier;
    /** Returns typed params or null when invalid. */
    parse: (raw: unknown) => P | null;
    run?: (params: P) => ActionOutcome;
    /** Human description of the exact change, for approval cards. */
    describe?: (params: P) => string;
}

export type RunResult =
    | { status: 'done'; entryId: string; summary: string }
    | { status: 'needs_approval'; actionId: string; description: string }
    | { status: 'blocked'; reason: string }
    | { status: 'invalid'; reason: string };

const obj = (raw: unknown): Record<string, unknown> => (raw && typeof raw === 'object' ? raw as Record<string, unknown> : {});
const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);
const none = () => ({});

const APP_IDS = new Set(APP_REGISTRY.map((a) => a.id));
const LAYOUTS: LayoutPreset[] = ['focus_single', 'split_50_50', 'split_33_66', 'triple_columns', 'tile_quad'];

function snapshotPanes() {
    const s = usePaneStore.getState();
    return { panes: s.panes.map((p) => ({ ...p })), activePaneId: s.activePaneId, nextZIndex: s.nextZIndex };
}
function restorePanes(snap: ReturnType<typeof snapshotPanes>) {
    usePaneStore.setState({ panes: snap.panes, activePaneId: snap.activePaneId, nextZIndex: snap.nextZIndex });
}
function snapshotNav() {
    const n = useNavStore.getState();
    return { viewLevel: n.viewLevel, activeDepartmentId: n.activeDepartmentId, activeSpaceId: n.activeSpaceId, activeFolderId: n.activeFolderId };
}
function restoreNav(snap: ReturnType<typeof snapshotNav>) {
    useNavStore.setState(snap as any);
}

const paneTarget = (id: string) => {
    const type = usePaneStore.getState().getPane(id)?.type;
    return type ? `[data-pane-id="${id}"], .glass-panel-runtime[data-app-id="${type}"]` : `[data-pane-id="${id}"]`;
};

export const ACTIONS: OsAction<any>[] = [
    // ── OS / Fenster ─────────────────────────────────────────────────────
    {
        id: 'os.openApp', title: 'App öffnen', group: 'os', tier: 'instant',
        parse: (raw) => { const app = str(obj(raw).app, 40); return app && APP_IDS.has(app) ? { app } : null; },
        run: ({ app }: { app: string }) => {
            const m = getAppManifest(app)!;
            const before = snapshotPanes();
            usePaneStore.getState().openPane({ id: `${app}-main`, type: app as any, title: m.name, size: m.defaultSize ?? { width: 860, height: 620 } });
            return { summary: `${m.name} geöffnet`, undo: () => restorePanes(before), target: paneTarget(`${app}-main`) };
        },
    },
    {
        id: 'os.focusPane', title: 'Fenster nach vorn', group: 'os', tier: 'instant',
        parse: (raw) => { const id = str(obj(raw).paneId); return id && usePaneStore.getState().getPane(id) ? { paneId: id } : null; },
        run: ({ paneId }: { paneId: string }) => {
            const before = snapshotPanes();
            const s = usePaneStore.getState();
            if (s.getPane(paneId)?.minimized) s.restorePane(paneId); else s.focusPane(paneId);
            return { summary: `${s.getPane(paneId)?.title ?? 'Fenster'} vorn`, undo: () => restorePanes(before), target: paneTarget(paneId) };
        },
    },
    {
        id: 'os.minimizePane', title: 'Fenster ablegen', group: 'os', tier: 'undoable',
        parse: (raw) => { const id = str(obj(raw).paneId); return id && usePaneStore.getState().getPane(id) ? { paneId: id } : null; },
        run: ({ paneId }: { paneId: string }) => {
            const before = snapshotPanes();
            const title = usePaneStore.getState().getPane(paneId)?.title ?? 'Fenster';
            usePaneStore.getState().minimizePane(paneId);
            return { summary: `${title} abgelegt`, undo: () => restorePanes(before) };
        },
    },
    {
        id: 'os.closePane', title: 'Fenster schließen', group: 'os', tier: 'undoable',
        parse: (raw) => { const id = str(obj(raw).paneId); return id && usePaneStore.getState().getPane(id) ? { paneId: id } : null; },
        run: ({ paneId }: { paneId: string }) => {
            const before = snapshotPanes();
            const title = usePaneStore.getState().getPane(paneId)?.title ?? 'Fenster';
            usePaneStore.getState().removePane(paneId);
            return { summary: `${title} geschlossen`, undo: () => restorePanes(before) };
        },
    },
    {
        id: 'os.closeAll', title: 'Alle Fenster schließen', group: 'os', tier: 'undoable', parse: none,
        run: () => { const before = snapshotPanes(); usePaneStore.getState().closeAllPanes(); return { summary: `${before.panes.length} Fenster geschlossen`, undo: () => restorePanes(before) }; },
    },
    {
        id: 'os.layout', title: 'Fenster anordnen', group: 'os', tier: 'undoable',
        parse: (raw) => { const p = str(obj(raw).preset) as LayoutPreset | null; return p && LAYOUTS.includes(p) ? { preset: p } : null; },
        run: ({ preset }: { preset: LayoutPreset }) => { const before = snapshotPanes(); usePaneStore.getState().applyLayoutPreset(preset); return { summary: 'Fenster angeordnet', undo: () => restorePanes(before) }; },
    },
    // ── Universe ─────────────────────────────────────────────────────────
    {
        id: 'universe.focusPlanet', title: 'Planet betreten', group: 'universe', tier: 'instant',
        parse: (raw) => { const id = str(obj(raw).departmentId); return id ? { departmentId: id } : null; },
        run: ({ departmentId }: { departmentId: string }) => {
            const before = snapshotNav();
            useNavStore.getState().navigateToDepartment(departmentId);
            return { summary: 'Planet betreten', undo: () => restoreNav(before), target: `[data-testid="territory-${departmentId}"]` };
        },
    },
    {
        id: 'universe.home', title: 'Zum Kern', group: 'universe', tier: 'instant', parse: none,
        run: () => { const before = snapshotNav(); useNavStore.getState().navigateToCore(); return { summary: 'Zurück zum Kern', undo: () => restoreNav(before) }; },
    },
    {
        id: 'universe.highlight', title: 'Hervorheben', group: 'universe', tier: 'instant',
        parse: (raw) => { const id = str(obj(raw).targetId); return id ? { targetId: id } : null; },
        run: ({ targetId }: { targetId: string }) => {
            dispatchMoraPresence({ action: 'highlight', targetId, source: 'ai' });
            const els = typeof document !== 'undefined' ? Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="territory-${targetId.replace(/["\\]/g, '')}"]`)) : [];
            const raw = els.map((e) => e.getAttribute('data-planet-name') || e.getAttribute('aria-label') || '').find(Boolean) || '';
            const name = raw.replace(/\s+auswählen$/, '').trim().slice(0, 40);
            return { summary: name ? `${name} hervorgehoben` : 'Hervorgehoben', target: `[data-testid="territory-${targetId}"]` };
        },
    },
    // ── Einstellungen ────────────────────────────────────────────────────
    {
        id: 'settings.scene', title: 'Szene wechseln', group: 'settings', tier: 'undoable',
        parse: (raw) => { const s = str(obj(raw).scene) as RitualSceneId | null; return s && RITUAL_SCENE_ORDER.includes(s) ? { scene: s } : null; },
        run: ({ scene }: { scene: RitualSceneId }) => {
            const prev = resolveRitualSettings(null);
            persistRitualSettings(null, { ritualSceneId: scene, ritualAutoTime: false });
            const label: Record<RitualSceneId, string> = { flow: 'Morgen', build: 'Tag', lounge: 'Abend', night: 'Nacht' };
            return { summary: `Szene → ${label[scene]}`, undo: () => persistRitualSettings(null, { ritualSceneId: prev.sceneId, ritualAutoTime: prev.autoTime }) };
        },
    },
    {
        id: 'settings.autoTime', title: 'Licht folgt der Uhr', group: 'settings', tier: 'undoable',
        parse: (raw) => (typeof obj(raw).on === 'boolean' ? { on: obj(raw).on as boolean } : null),
        run: ({ on }: { on: boolean }) => {
            const prev = resolveRitualSettings(null);
            persistRitualSettings(null, { ritualAutoTime: on });
            return { summary: on ? 'Licht folgt der Uhr' : 'Licht fest', undo: () => persistRitualSettings(null, { ritualAutoTime: prev.autoTime }) };
        },
    },
    // ── MÔRA ─────────────────────────────────────────────────────────────
    {
        id: 'mora.voice', title: 'Sprechen', group: 'mora', tier: 'instant', parse: none,
        run: () => { const was = isVoiceOverlayOpen(); openVoiceOverlay(); return { summary: 'Zuhören', undo: was ? undefined : () => closeVoiceOverlay() }; },
    },
    {
        id: 'mora.search', title: 'Suchen', group: 'mora', tier: 'instant',
        parse: (raw) => ({ query: str(obj(raw).query, 300) ?? '' }),
        run: ({ query }: { query: string }) => {
            const before = snapshotPanes();
            usePaneStore.getState().openPane({ id: 'search-main', type: 'search', title: 'Suche', size: { width: 780, height: 560 }, data: { query } });
            return { summary: query ? `Suche „${query}“` : 'Suche offen', undo: () => restorePanes(before), target: paneTarget('search-main') };
        },
    },
    // ── Freigabe nötig (nur beschrieben; Ausführung bleibt in den Apps) ──
    ...([
        ['extern.mail.send', 'Mail senden'],
        ['extern.calendar.create', 'Termin anlegen'],
        ['extern.file.share', 'Datei teilen'],
        ['work.task.delete', 'Aufgabe löschen'],
        ['work.file.delete', 'Datei löschen'],
        ['team.invite', 'Ins Team einladen'],
        ['team.post', 'Im Teamraum schreiben'],
        ['finance.checkout', 'Kauf auslösen'],
        ['begleiter.unpair', 'Handy trennen'],
    ] as const).map(([id, title]): OsAction<{ detail: string }> => ({
        id, title, group: 'extern', tier: 'approval',
        parse: (raw) => ({ detail: str(obj(raw).detail, 500) ?? '' }),
        describe: ({ detail }) => (detail ? `${title}: ${detail}` : title),
    })),
    // ── Nie ──────────────────────────────────────────────────────────────
    ...(['wallet.sign', 'wallet.send', 'xrpl.transact', 'origin.mint', 'origin.transfer', 'secrets.read'] as const).map((id): OsAction => ({
        id, title: 'Gesperrt', group: 'gesperrt', tier: 'never', parse: () => ({}),
    })),
];

const BY_ID = new Map(ACTIONS.map((a) => [a.id, a]));
const NEVER_PREFIX = /^(wallet|xrpl|origin|secrets?)\b/i;

export function getAction(id: string): OsAction<any> | undefined { return BY_ID.get(id); }

/** Approval tokens are minted only by an explicit user confirmation in the UI. */
const approvals = new Set<string>();
export function grantApproval(actionId: string): string {
    const token = `${actionId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    approvals.add(token);
    return token;
}

export const JARVIS_ACTION_EVENT = 'saimor:jarvis-action';
export interface JarvisActionEventDetail { entryId: string; actionId: string; summary: string; target?: string; source: JarvisSource; undoable: boolean }

export function runAction(id: string, raw: unknown = {}, opts: { source?: JarvisSource; approvalToken?: string } = {}): RunResult {
    const source = opts.source ?? 'user';
    if (NEVER_PREFIX.test(id)) return { status: 'blocked', reason: 'Wallet, XRPL, ORIGIN und Secrets sind für MÔRA gesperrt.' };
    const action = BY_ID.get(id);
    if (!action) return { status: 'invalid', reason: `Unbekannte Aktion ${id}` };
    if (action.tier === 'never') return { status: 'blocked', reason: 'gesperrt' };
    const params = action.parse(raw);
    if (params === null) return { status: 'invalid', reason: 'Parameter ungültig' };
    if (action.tier === 'approval') {
        const tok = opts.approvalToken;
        if (!tok || !tok.startsWith(`${id}:`) || !approvals.has(tok)) {
            return { status: 'needs_approval', actionId: id, description: action.describe?.(params) ?? action.title };
        }
        approvals.delete(tok);
        if (!action.run) return { status: 'blocked', reason: 'Freigegeben, aber diese Aktion läuft in Phase 1 nur in ihrer App.' };
    }
    if (!action.run) return { status: 'invalid', reason: 'nicht ausführbar' };
    const outcome = action.run(params);
    const entry = recordAction({ actionId: id, title: action.title, tier: action.tier, source, summary: outcome.summary, params, undo: outcome.undo });
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<JarvisActionEventDetail>(JARVIS_ACTION_EVENT, {
            detail: { entryId: entry.id, actionId: id, summary: outcome.summary, target: outcome.target, source, undoable: Boolean(outcome.undo) },
        }));
    }
    return { status: 'done', entryId: entry.id, summary: outcome.summary };
}

/** Log + show an action that ran outside the registry (e.g. CORE ui_actions). */
export function announceAction(actionId: string, summary: string, target: string | undefined, source: JarvisSource) {
    const entry = recordAction({ actionId, title: summary, tier: 'instant', source, summary, params: null });
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<JarvisActionEventDetail>(JARVIS_ACTION_EVENT, { detail: { entryId: entry.id, actionId, summary, target, source, undoable: false } }));
    }
}

/** JSON manifest for CORE/agents: what MÔRA may call, with tiers. */
export function actionManifest() {
    return ACTIONS.filter((a) => a.tier !== 'never').map((a) => ({ id: a.id, title: a.title, group: a.group, tier: a.tier }));
}
