'use client';

import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { getEffectiveRitualScene, resolveRitualSettings } from '@/lib/os/ritualMode';
import { isVoiceOverlayOpen } from '@/lib/os/openVoiceOverlay';
import { getLog } from './undoLog';
import { actionManifest } from './registry';

/** Compact, secret-free picture of what the OS shows right now (titles and ids only). */
export function getOsSnapshot(now: Date = new Date()) {
    const nav = useNavStore.getState();
    const panes = usePaneStore.getState();
    const ritual = resolveRitualSettings(null);
    return {
        at: now.toISOString(),
        hour: now.getHours() + now.getMinutes() / 60,
        view: { level: nav.viewLevel, companyId: nav.activeCompanyId, departmentId: nav.activeDepartmentId, spaceId: nav.activeSpaceId, folderId: nav.activeFolderId },
        windows: panes.panes.map((p) => ({ id: p.id, type: p.type, title: p.title, minimized: Boolean(p.minimized), front: p.id === panes.activePaneId })),
        scene: { effective: getEffectiveRitualScene(ritual, now), autoTime: ritual.autoTime },
        voiceOpen: isVoiceOverlayOpen(),
        recent: getLog().slice(0, 10).map((e) => ({ action: e.actionId, summary: e.summary, source: e.source, status: e.status })),
        actions: actionManifest(),
    };
}
export type OsSnapshot = ReturnType<typeof getOsSnapshot>;
