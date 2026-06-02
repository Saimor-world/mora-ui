import {
  navigationOutcomeToActionEvent,
  isIntakeEvent,
  getWorkSessionPlanId,
  getIntakeRoute,
  getIntakeFileName,
  getConfirmationToken,
  getPendingFileId,
  getIntakeRouteMode,
  getIntakeRouteReason,
  canActOnPendingEvent,
} from '@/lib/actionCenter/events';

const evt = (payload: any, extra: any = {}): any => ({ action_id: 'a', status: 'done', intent: '', payload, timestamp: '2026-06-01T00:00:00.000Z', ...extra });

describe('isIntakeEvent', () => {
  it('detects file-intake events by tool name or intent', () => {
    expect(isIntakeEvent(evt({ tool_name: 'create_node_from_file' }))).toBe(true);
    expect(isIntakeEvent(evt({}, { intent: 'create_node_from_file' }))).toBe(true);
    expect(isIntakeEvent(evt({ tool_name: 'other' }))).toBe(false);
  });
});

describe('getWorkSessionPlanId', () => {
  it('returns the plan id for work-session events only', () => {
    expect(getWorkSessionPlanId(evt({ tool_name: 'work_session_plan', plan_id: 'p1' }))).toBe('p1');
    expect(getWorkSessionPlanId(evt({ tool_name: 'work_session_plan' }))).toBeNull();
    expect(getWorkSessionPlanId(evt({ tool_name: 'other', plan_id: 'p1' }))).toBeNull();
  });
});

describe('getIntakeRoute', () => {
  it('joins intake_context names into a path', () => {
    expect(getIntakeRoute(evt({ intake_context: { target_department_name: 'Vertrieb', target_folder_name: 'Angebote' } }))).toBe('Vertrieb > Angebote');
  });
  it('falls back to suggested_location then route_suggestion', () => {
    expect(getIntakeRoute(evt({ intake_context: { suggested_location: 'Irgendwo' } }))).toBe('Irgendwo');
    expect(getIntakeRoute(evt({ route_suggestion: { location: 'X' } }))).toBe('X');
    expect(getIntakeRoute(evt({}))).toBeNull();
  });
});

describe('getIntakeFileName', () => {
  it('prefers filename, then file_name, then name, then intake_context.filename', () => {
    expect(getIntakeFileName(evt({ filename: 'a.pdf' }))).toBe('a.pdf');
    expect(getIntakeFileName(evt({ file_name: 'b.pdf' }))).toBe('b.pdf');
    expect(getIntakeFileName(evt({ name: 'c.pdf' }))).toBe('c.pdf');
    expect(getIntakeFileName(evt({ intake_context: { filename: 'd.pdf' } }))).toBe('d.pdf');
    expect(getIntakeFileName(evt({}))).toBeNull();
  });
});

describe('token + file id accessors', () => {
  it('reads confirmation_token and file_id', () => {
    expect(getConfirmationToken(evt({ confirmation_token: 't' }))).toBe('t');
    expect(getPendingFileId(evt({ file_id: 'f' }))).toBe('f');
    expect(getConfirmationToken(evt({}))).toBeNull();
  });
});

describe('getIntakeRouteMode', () => {
  it('reads route_mode from route_suggestion or intake_context', () => {
    expect(getIntakeRouteMode(evt({ route_suggestion: { route_mode: 'auto' } }))).toBe('auto');
    expect(getIntakeRouteMode(evt({ intake_context: { route_mode: 'manual' } }))).toBe('manual');
  });
});

describe('getIntakeRouteReason', () => {
  it('truncates long reasons to 70 chars with an ellipsis', () => {
    const long = 'x'.repeat(100);
    const out = getIntakeRouteReason(evt({ route_suggestion: { route_reason: long } }))!;
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBe(71);
  });
  it('returns null when no reason present', () => {
    expect(getIntakeRouteReason(evt({}))).toBeNull();
  });
});

describe('canActOnPendingEvent', () => {
  it('requires pending_confirmation status and a token', () => {
    expect(canActOnPendingEvent(evt({ confirmation_token: 't' }, { status: 'pending_confirmation' }))).toBe(true);
    expect(canActOnPendingEvent(evt({}, { status: 'pending_confirmation' }))).toBe(false);
    expect(canActOnPendingEvent(evt({ confirmation_token: 't' }, { status: 'done' }))).toBe(false);
  });
});

describe('navigationOutcomeToActionEvent', () => {
  it('wraps a navigation outcome as a done action event', () => {
    const out = navigationOutcomeToActionEvent({ targetType: 'folder', folderId: 'f1', message: 'Geöffnet' } as any);
    expect(out.status).toBe('done');
    expect(out.message).toBe('Geöffnet');
    expect(out.payload.folderId).toBe('f1');
  });
});
