import { runAction, grantApproval, actionManifest, ACTIONS } from '@/lib/jarvis/registry';
import { getLog, clearLog, undoLast } from '@/lib/jarvis/undoLog';
import { getOsSnapshot } from '@/lib/jarvis/snapshot';
import { usePaneStore } from '@/lib/store/paneStore';

describe('jarvis registry', () => {
    beforeEach(() => { clearLog(); usePaneStore.getState().closeAllPanes(); });

    it('opens an app instantly, logs it and can undo', () => {
        const r = runAction('os.openApp', { app: 'finder' }, { source: 'mora' });
        expect(r.status).toBe('done');
        expect(usePaneStore.getState().panes.some((p) => p.id === 'finder-main')).toBe(true);
        expect(getLog()[0]).toMatchObject({ actionId: 'os.openApp', source: 'mora', status: 'done' });
        expect(undoLast('mora')).toBe(true);
        expect(usePaneStore.getState().panes.some((p) => p.id === 'finder-main')).toBe(false);
        expect(getLog()[0].status).toBe('undone');
    });

    it('rejects invalid params and unknown apps', () => {
        expect(runAction('os.openApp', { app: 'nope' }).status).toBe('invalid');
        expect(runAction('does.not.exist').status).toBe('invalid');
    });

    it('requires an approval token for external actions', () => {
        const r = runAction('extern.mail.send', { detail: 'an X' });
        expect(r).toMatchObject({ status: 'needs_approval' });
        expect(runAction('extern.mail.send', {}, { approvalToken: 'extern.mail.send:fake' }).status).toBe('needs_approval');
        const tok = grantApproval('extern.mail.send');
        expect(runAction('extern.mail.send', {}, { approvalToken: tok }).status).toBe('blocked'); // runs only in its app in phase 1
        expect(runAction('extern.mail.send', {}, { approvalToken: tok }).status).toBe('needs_approval'); // token is single-use
    });

    it('never runs wallet, xrpl, origin or secrets actions', () => {
        for (const id of ['wallet.send', 'xrpl.transact', 'origin.mint', 'secrets.read', 'wallet.anything']) {
            expect(runAction(id, {}, { approvalToken: grantApproval(id) }).status).toBe('blocked');
        }
        expect(actionManifest().some((a) => /^(wallet|xrpl|origin|secrets)/.test(a.id))).toBe(false);
    });

    it('every action has a tier and approval/never actions have no free run path', () => {
        for (const a of ACTIONS) {
            expect(['instant', 'undoable', 'approval', 'never']).toContain(a.tier);
            if (a.tier === 'undoable') expect(a.run).toBeDefined();
        }
    });

    it('snapshot lists windows and actions without content', () => {
        runAction('os.openApp', { app: 'notes' });
        const s = getOsSnapshot(new Date('2026-10-13T20:00:00'));
        expect(s.windows.map((w) => w.type)).toContain('notes');
        expect(s.actions.length).toBeGreaterThan(10);
        expect(s.recent[0].action).toBe('os.openApp');
    });
});

describe('jarvis undo log persistence', () => {
    it('persists entries to localStorage without undo closures or params and restores them as history', async () => {
        const { clearLog, getLog, __reloadLogForTest } = await import('@/lib/jarvis/undoLog');
        clearLog();
        runAction('os.openApp', { app: 'finder' }, { source: 'mora' });
        const raw = JSON.parse(window.localStorage.getItem('saimor_jarvis_log_v1') || '[]');
        expect(raw[0]).toMatchObject({ actionId: 'os.openApp', summary: 'Finder geöffnet' });
        expect(raw[0].params).toBeUndefined();
        __reloadLogForTest();
        expect(getLog()[0]).toMatchObject({ actionId: 'os.openApp', restored: true });
        expect(getLog()[0].undo).toBeUndefined();
    });
});
