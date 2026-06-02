import type { ActionEvent } from '@/lib/hooks/useActionEvents';
import { NAVIGATION_ACTION_INTENT, type NavigationOutcome } from '@/lib/utils/searchOpen';

/**
 * Pure accessors/derivations over ActionEvent payloads used by the Action
 * Center. Extracted verbatim from apps/action-center/index.tsx so the payload
 * shape handling is independently tested.
 */

export function navigationOutcomeToActionEvent(detail: NavigationOutcome): ActionEvent {
    return {
        action_id: `nav-${Date.now()}-${detail.targetType}-${detail.nodeId || detail.folderId || detail.spaceId || detail.departmentId || detail.label || 'target'}`,
        status: 'done',
        intent: NAVIGATION_ACTION_INTENT,
        actor_role: 'system',
        message: detail.message,
        error: null,
        payload: {
            ...detail,
            tool_name: NAVIGATION_ACTION_INTENT,
        },
        timestamp: new Date().toISOString(),
    };
}

export function isIntakeEvent(evt: ActionEvent): boolean {
    const tool = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : '';
    return tool === 'create_node_from_file' || evt.intent === 'create_node_from_file';
}

export function getWorkSessionPlanId(evt: ActionEvent): string | null {
    const tool = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : '';
    const isWorkSession = tool === 'work_session_plan' || evt.intent === 'work_session_plan';
    if (!isWorkSession) return null;
    const id = evt.payload?.plan_id;
    return typeof id === 'string' && id.length > 0 ? id : null;
}

export function getNavigationOutcome(evt: ActionEvent): NavigationOutcome | null {
    const tool = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : '';
    const intent = tool || evt.intent || '';
    if (intent !== NAVIGATION_ACTION_INTENT) return null;
    return evt.payload as unknown as NavigationOutcome;
}

export function getIntakeRoute(evt: ActionEvent): string | null {
    const ic = evt.payload?.intake_context as Record<string, unknown> | undefined;
    if (ic) {
        const path = [ic.target_department_name, ic.target_space_name, ic.target_folder_name]
            .filter(Boolean)
            .join(' > ');
        if (path) return path;
        if (typeof ic.suggested_location === 'string') return ic.suggested_location;
    }
    const rs = evt.payload?.route_suggestion as Record<string, unknown> | undefined;
    if (rs) {
        const path = [rs.department_name, rs.space_name, rs.folder_name]
            .filter(Boolean)
            .join(' > ');
        if (path) return path;
        if (typeof rs.location === 'string') return rs.location;
    }
    return null;
}

export function getIntakeFileName(evt: ActionEvent): string | null {
    const p = evt.payload;
    if (typeof p?.filename === 'string') return p.filename;
    if (typeof p?.file_name === 'string') return p.file_name;
    if (typeof p?.name === 'string') return p.name;
    const ic = p?.intake_context as Record<string, unknown> | undefined;
    if (typeof ic?.filename === 'string') return ic.filename;
    return null;
}

export function getConfirmationToken(evt: ActionEvent): string | null {
    return typeof evt.payload?.confirmation_token === 'string' ? evt.payload.confirmation_token : null;
}

export function getPendingFileId(evt: ActionEvent): string | null {
    return typeof evt.payload?.file_id === 'string' ? evt.payload.file_id : null;
}

export function getIntakeRouteMode(evt: ActionEvent): string | null {
    const rs = evt.payload?.route_suggestion as Record<string, unknown> | undefined;
    if (typeof rs?.route_mode === 'string') return rs.route_mode;
    const ic = evt.payload?.intake_context as Record<string, unknown> | undefined;
    if (typeof ic?.route_mode === 'string') return ic.route_mode;
    return null;
}

export function getIntakeRouteReason(evt: ActionEvent): string | null {
    const rs = evt.payload?.route_suggestion as Record<string, unknown> | undefined;
    const icRaw = evt.payload?.intake_context as Record<string, unknown> | undefined;
    const raw = (typeof rs?.route_reason === 'string' && rs.route_reason.trim())
        ? rs.route_reason
        : (typeof icRaw?.route_reason === 'string' && icRaw.route_reason.trim())
            ? icRaw.route_reason
            : null;
    if (!raw) return null;
    const MAX = 70;
    return raw.length > MAX ? `${raw.slice(0, MAX)}…` : raw;
}

export function canActOnPendingEvent(evt: ActionEvent): boolean {
    return evt.status === 'pending_confirmation' && !!getConfirmationToken(evt);
}
