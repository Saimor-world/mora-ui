import { currentMailDraftScope, mailDraftQuestion, replyTarget, useMailDraftStore } from '@/lib/mail/mailDraft';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';

const target = { messageId: 'message-a', to: 'sender@example.invalid', subject: 'Re: Planung' };
describe('mail working drafts', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessionGeneration: 10 });
    useNavStore.setState({ activeCompanyId: 'company-a' });
    useMailDraftStore.setState({ drafts: {} });
    localStorage.clear();
  });

  it('keeps the draft when its editor closes, without browser persistence', () => {
    const scope = currentMailDraftScope();
    const store = useMailDraftStore.getState();
    store.startReply(scope, target, 'Mein noch nicht gesendeter Text');
    store.edit(scope, { open: false });
    store.edit(scope, { open: true });
    expect(useMailDraftStore.getState().drafts[scope].body).toBe('Mein noch nicht gesendeter Text');
    expect(JSON.stringify(localStorage)).not.toContain('Mein noch nicht gesendeter Text');
  });

  it('does not replace an existing draft with an assistant suggestion', () => {
    const scope = currentMailDraftScope(), store = useMailDraftStore.getState();
    store.startReply(scope, target, 'Selbst geschriebene Antwort');
    expect(store.startReply(scope, target, 'Vorschlag')).toBe(false);
    expect(useMailDraftStore.getState().drafts[scope].body).toBe('Selbst geschriebene Antwort');
  });

  it('can fill an untouched reply while preserving manually edited headers', () => {
    const scope = currentMailDraftScope(), store = useMailDraftStore.getState();
    store.startReply(scope, target);
    store.edit(scope, { subject: 'Eigener Betreff' });
    expect(store.startReply(scope, target, 'Vorschlag')).toBe(true);
    expect(useMailDraftStore.getState().drafts[scope]).toMatchObject({ subject: 'Eigener Betreff', body: 'Vorschlag' });
  });

  it('separates companies, rejects stale edits and purges a previous session', () => {
    const scope = currentMailDraftScope(), store = useMailDraftStore.getState();
    store.startReply(scope, target, 'Firma A');
    useNavStore.setState({ activeCompanyId: 'company-b' });
    const nextScope = currentMailDraftScope();
    expect(useMailDraftStore.getState().drafts[nextScope]).toBeUndefined();
    store.edit(scope, { body: 'Späte Änderung' });
    expect(useMailDraftStore.getState().drafts[scope].body).toBe('Firma A');
    store.startReply(nextScope, target, 'Firma B');
    useSessionStore.setState({ sessionGeneration: 11 });
    expect(useMailDraftStore.getState().drafts).toEqual({});
  });

  it('locks an in-flight send across editor remounts and retains a failed draft', () => {
    const scope = currentMailDraftScope(), store = useMailDraftStore.getState();
    store.startReply(scope, target, 'Antwort');
    const snapshot = store.beginSend(scope)!;
    expect(store.beginSend(scope)).toBeNull();
    store.edit(scope, { body: 'Versehentliche Änderung', open: false });
    expect(useMailDraftStore.getState().drafts[scope].body).toBe('Antwort');
    store.finishSend(scope, snapshot.revision, 'Verbindung fehlt');
    expect(useMailDraftStore.getState().drafts[scope]).toMatchObject({ body: 'Antwort', sending: false, error: 'Verbindung fehlt' });
    const retry = store.beginSend(scope)!;
    store.finishSend(scope, retry.revision);
    expect(useMailDraftStore.getState().drafts[scope]).toMatchObject({ body: '', to: '', open: false });
  });

  it('extracts a reply address without accepting a malformed header', () => {
    expect(replyTarget({ id: 'a', subject: 'Planung', from_addr: 'Eine Person <person@example.invalid>' }).to).toBe('person@example.invalid');
    expect(replyTarget({ id: 'a', subject: 'AW: Planung', from_addr: 'person@example.invalid\r\nBcc: other@example.invalid' })).toMatchObject({ to: '', subject: 'AW: Planung' });
  });

  it('labels missing or shortened mail content instead of claiming a complete source', () => {
    const question = mailDraftQuestion({ from_addr: 'a@example.invalid', subject: 'Plan', snippet: 'Nur ein Auszug' });
    expect(question).toContain('Nur Vorschau; vollständiger Text fehlt');
    expect(question).toContain('Nur ein Auszug');
    const long = mailDraftQuestion({ from_addr: 'a@example.invalid', subject: 'Plan', snippet: '', body_text: 'x'.repeat(12000) });
    expect(long).toContain('auf 10.000 Zeichen gekürzt');
    expect(long.length).toBeLessThan(11500);
  });
});
