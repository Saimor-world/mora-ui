'use client';

import './connectors.css';
import React, { useCallback, useEffect, useState } from 'react';
import { coreGet, corePost } from '@/lib/api/coreClient';

type Msg = { ok: boolean; text: string } | null;

function errText(e: unknown): string {
    const any = e as { detail?: unknown; message?: string };
    const d = any?.detail;
    return typeof d === 'string' ? d : any?.message || 'Hat nicht geklappt.';
}

function Actions({ busy, onTest, onSave, saveLabel = 'Verbinden' }: { busy: boolean; onTest: () => void; onSave: () => void; saveLabel?: string }) {
    return (
        <div className="uv2-cform__row">
            <button type="button" className="uv2-pill" disabled={busy} onClick={onTest}>Nur testen</button>
            <button type="button" className="uv2-pill uv2-pill--gold" disabled={busy} onClick={onSave}>{busy ? 'Prüfe …' : saveLabel}</button>
        </div>
    );
}

/** GitHub nur lesen: fine-grained Token, wird von CORE geprüft und verschlüsselt gespeichert. */
export function GithubConnect() {
    const [token, setToken] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);
    const [repos, setRepos] = useState<Array<{ name: string; private: boolean }>>([]);
    const loadRepos = useCallback(async () => {
        try { const r = await coreGet('/v3/connectors/github/repos', { isOptional: true }); setRepos(r?.repos ?? []); } catch { setRepos([]); }
    }, []);
    useEffect(() => { void loadRepos(); }, [loadRepos]);
    const run = async (testOnly: boolean) => {
        setBusy(true); setMsg(null);
        try {
            const r = await corePost('/v3/connectors/github', { token, test_only: testOnly });
            setMsg({ ok: true, text: r?.stored ? `Verbunden als ${r.login}.` : `Token gültig${r?.login ? ` (${r.login})` : ''}, nichts gespeichert.` });
            if (r?.stored) { setToken(''); void loadRepos(); }
        } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
    };
    return (
        <div className="uv2-cform" data-testid="connect-github">
            <label>Fine-grained Token (nur Lesen)<input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" /></label>
            <Actions busy={busy || token.length < 20} onTest={() => void run(true)} onSave={() => void run(false)} />
            {msg && <span className="uv2-cform__msg" data-ok={msg.ok ? '' : undefined}>{msg.text}</span>}
            {repos.length > 0 && <div className="uv2-cform__list">{repos.slice(0, 6).map((r) => <span key={r.name}>{r.name}{r.private ? ' · privat' : ''}</span>)}</div>}
        </div>
    );
}

/** CalDAV (iCloud, Fastmail, Nextcloud, mailbox.org …) mit App-Passwort. */
export function CaldavConnect() {
    const [url, setUrl] = useState('');
    const [username, setUsername] = useState('');
    const [pw, setPw] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);
    const run = async (testOnly: boolean) => {
        setBusy(true); setMsg(null);
        try {
            const r = await corePost('/v3/connectors/caldav', { url, username, app_password: pw, test_only: testOnly });
            setMsg({ ok: true, text: r?.stored ? 'Kalender verbunden.' : 'Anmeldung klappt, nichts gespeichert.' });
            if (r?.stored) setPw('');
        } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
    };
    return (
        <div className="uv2-cform" data-testid="connect-caldav">
            <label>CalDAV-Adresse<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://caldav.icloud.com/" /></label>
            <label>Benutzer<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
            <label>App-Passwort<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" /></label>
            <Actions busy={busy || !url || !username || pw.length < 8} onTest={() => void run(true)} onSave={() => void run(false)} />
            {msg && <span className="uv2-cform__msg" data-ok={msg.ok ? '' : undefined}>{msg.text}</span>}
        </div>
    );
}

/** Wache: HTTPS-Dienste beobachten. */
export function MonitorConnect() {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);
    const [list, setList] = useState<Array<{ name: string; url: string; last?: { ok: boolean; ms: number } }>>([]);
    const load = useCallback(async () => {
        try { const r = await coreGet('/v3/connectors/nightwatch/monitors', { isOptional: true }); setList(r?.monitors ?? []); } catch { setList([]); }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const run = async (testOnly: boolean) => {
        setBusy(true); setMsg(null);
        try {
            const r = await corePost('/v3/connectors/nightwatch/monitors', { name, url, test_only: testOnly });
            const p = r?.probe;
            setMsg({ ok: Boolean(p?.ok), text: `${p?.ok ? 'Erreichbar' : 'Nicht erreichbar'}${p?.ms != null ? ` · ${p.ms} ms` : ''}${r?.stored ? ' · beobachtet' : ''}` });
            if (r?.stored) { setName(''); setUrl(''); void load(); }
        } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
    };
    return (
        <div className="uv2-cform" data-testid="connect-monitor">
            <div className="uv2-cform__row">
                <label style={{ flex: 1 }}>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="hq" /></label>
                <label style={{ flex: 2 }}>Adresse<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hq.saimor.world" /></label>
            </div>
            <Actions busy={busy || !name || !url} onTest={() => void run(true)} onSave={() => void run(false)} saveLabel="Beobachten" />
            {msg && <span className="uv2-cform__msg" data-ok={msg.ok ? '' : undefined}>{msg.text}</span>}
            {list.length > 0 && <div className="uv2-cform__list">{list.map((m) => <span key={m.url}>{m.last?.ok ? '●' : '○'} {m.name} · {m.url.replace('https://', '')}</span>)}</div>}
        </div>
    );
}

/** Telegram läuft als Server-Bot: hier nur ehrlicher Status, kein Token im Browser. */
export function TelegramStatus() {
    const [s, setS] = useState<{ bot_configured: boolean; allowlist_configured: boolean } | null>(null);
    useEffect(() => { void coreGet('/v3/connectors/telegram/status', { isOptional: true }).then(setS).catch(() => setS(null)); }, []);
    return (
        <div className="uv2-cform__list" data-testid="connect-telegram">
            <span>Bot auf dem Server: {s?.bot_configured ? 'eingerichtet' : 'fehlt'}</span>
            <span>Nur deine Telegram-ID erlaubt: {s?.allowlist_configured ? 'ja' : 'fehlt'}</span>
            <span>Der Bot-Zugang wird nur auf dem Server hinterlegt, nie hier im Browser.</span>
        </div>
    );
}
