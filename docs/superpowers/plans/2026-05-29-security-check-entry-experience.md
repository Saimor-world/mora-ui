# Security Check Entry Experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current broken Security Check entry flow with a full-screen immersive experience, playground-based auth, and auto-opened dossier + Môra when the visitor lands in the OS.

**Architecture:** Five independent units — scoreBreakdown (pure utility), SecurityCheckPlaygroundLogin (auth), SecurityCheckEntry (full UI), useAutoOpenDossier (OS guided opening), HomeSurface fixes. Each is testable independently. Auth calls the existing `/v3/playground/guest-session` endpoint (no CORE changes needed).

**Tech Stack:** Next.js 15, React, Zustand (useNavStore, usePaneStore), `corePost` from `lib/api/coreClient`, TanStack Query, Jest + RTL

---

## Codebase Context

```
lib/api/coreClient.ts          corePost(path, body) — wraps fetch, unwraps { data } envelope
lib/store/navStore.ts          useNavStore → activeMode, setActiveMode(mode)
lib/store/paneStore.ts         openPane(request) / revealPane(id, request)
lib/websiteEntryContext.ts     WebsiteEntryContext type — has companyName, domain, score, level, tasks
lib/websiteEntryStorage.ts     saveWebsiteEntryContext(), StoredWebsiteEntryContext (adds storedAt)
lib/dossier/buildDossierContent.ts   already exists — WebsiteEntryContext → markdown
lib/hooks/useCreateDossierNode.ts    already exists — auto-creates 20-day OS node
components/home/HomeSurface.tsx      line ~291: openWebsiteDossier (currently broken)
                                     line ~232: dossierNodeId from useCreateDossierNode
apps/chat/index.tsx            ChatApp reads initialData.initialMessage → auto-sends it on open
```

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/dossier/scoreBreakdown.ts` | Create | Maps tasks → 4 ScoreDimension bars + narrative string |
| `components/entry/SecurityCheckPlaygroundLogin.tsx` | Create | Silent auth via /v3/playground/guest-session |
| `components/entry/SecurityCheckEntry.tsx` | Create | Full-screen entry UI (1920×1080, two-column) |
| `app/entry/page.tsx` | Modify | Route security-audit → SecurityCheckEntry |
| `lib/hooks/useAutoOpenDossier.ts` | Create | Fires once, opens dossier pane + Môra with context |
| `components/home/HomeSurface.tsx` | Modify | Add useAutoOpenDossier + fix openWebsiteDossier |
| `__tests__/lib/dossier/scoreBreakdown.test.ts` | Create | Unit tests |
| `__tests__/components/entry/SecurityCheckEntry.test.tsx` | Create | Smoke tests |
| `__tests__/lib/hooks/useAutoOpenDossier.test.tsx` | Create | Hook tests |

---

## Task 1: scoreBreakdown — pure mapping utility

**Files:**
- Create: `lib/dossier/scoreBreakdown.ts`
- Test: `__tests__/lib/dossier/scoreBreakdown.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/dossier/scoreBreakdown.test.ts`:

```ts
import { scoreBreakdown, buildScoreNarrative, type ScoreDimension } from '@/lib/dossier/scoreBreakdown';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

const base: WebsiteEntryContext = {
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [],
};

it('returns 4 dimensions always', () => {
    const dims = scoreBreakdown(base);
    expect(dims).toHaveLength(4);
    expect(dims.map(d => d.id)).toEqual(['ssl', 'headers', 'performance', 'availability']);
});

it('maps SSL task to critical ssl dimension', () => {
    const ctx = { ...base, tasks: [{ title: 'SSL-Zertifikat erneuern', priority: 'hoch' as const }] };
    const dims = scoreBreakdown(ctx);
    const ssl = dims.find(d => d.id === 'ssl')!;
    expect(ssl.status).toBe('critical');
    expect(ssl.barPercent).toBeLessThanOrEqual(25);
});

it('maps CSP/HSTS tasks to headers dimension as warn', () => {
    const ctx = { ...base, tasks: [{ title: 'CSP-Header einrichten', priority: 'mittel' as const }] };
    const dims = scoreBreakdown(ctx);
    const headers = dims.find(d => d.id === 'headers')!;
    expect(headers.status).toBe('warn');
});

it('maps performance task to warn performance dimension', () => {
    const ctx = { ...base, tasks: [{ title: 'Ladezeit verbessern', priority: 'mittel' as const }] };
    const dims = scoreBreakdown(ctx);
    const perf = dims.find(d => d.id === 'performance')!;
    expect(perf.status).toBe('warn');
});

it('sets availability ok when no matching tasks', () => {
    const dims = scoreBreakdown(base);
    const avail = dims.find(d => d.id === 'availability')!;
    expect(avail.status).toBe('ok');
    expect(avail.barPercent).toBe(100);
});

it('buildScoreNarrative counts hoch tasks', () => {
    const ctx = { ...base, tasks: [
        { title: 'SSL erneuern', priority: 'hoch' as const },
        { title: 'CSP einrichten', priority: 'mittel' as const },
    ]};
    const narrative = buildScoreNarrative(ctx);
    expect(narrative).toContain('acme.de');
    expect(narrative).toContain('1');
});

it('buildScoreNarrative uses positive framing for score >= 80', () => {
    const ctx = { ...base, score: 85, tasks: [] };
    const narrative = buildScoreNarrative(ctx);
    expect(narrative).toContain('acme.de');
    expect(narrative).toMatch(/solide|gut/i);
});
```

- [ ] **Step 2: Run test to confirm FAIL**

```powershell
Set-Location "E:\saimor\INTERFACE"
npx jest --no-coverage "scoreBreakdown" 2>&1 | Select-Object -Last 6
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement scoreBreakdown**

Create `lib/dossier/scoreBreakdown.ts`:

```ts
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

export interface ScoreDimension {
    id: 'ssl' | 'headers' | 'performance' | 'availability';
    label: string;
    value: string;
    status: 'critical' | 'warn' | 'ok';
    barPercent: number;
}

const SSL_KEYWORDS     = ['ssl', 'zertifikat', 'certificate', 'tls', 'https'];
const HEADER_KEYWORDS  = ['header', 'csp', 'hsts', 'content-security', 'x-frame', 'xss'];
const PERF_KEYWORDS    = ['ladezeit', 'performance', 'lcp', 'fcp', 'geschwindigkeit', 'speed', 'load'];

function matchesAny(title: string, keywords: string[]): boolean {
    const low = title.toLowerCase();
    return keywords.some(k => low.includes(k));
}

export function scoreBreakdown(ctx: WebsiteEntryContext): ScoreDimension[] {
    const tasks = ctx.tasks ?? [];

    const sslTasks  = tasks.filter(t => matchesAny(t.title, SSL_KEYWORDS));
    const hdTasks   = tasks.filter(t => matchesAny(t.title, HEADER_KEYWORDS));
    const perfTasks = tasks.filter(t => matchesAny(t.title, PERF_KEYWORDS));

    const toStatus = (ts: typeof tasks): 'critical' | 'warn' | 'ok' => {
        if (ts.length === 0) return 'ok';
        if (ts.some(t => t.priority === 'hoch')) return 'critical';
        return 'warn';
    };

    const toBar = (status: 'critical' | 'warn' | 'ok'): number => {
        if (status === 'critical') return 20;
        if (status === 'warn')     return 50;
        return 100;
    };

    const sslStatus  = toStatus(sslTasks);
    const hdStatus   = toStatus(hdTasks);
    const perfStatus = toStatus(perfTasks);

    return [
        {
            id: 'ssl',
            label: 'SSL / Zertifikat',
            value: sslStatus === 'critical' ? 'Kritisch — Erneuerung nötig'
                 : sslStatus === 'warn'     ? 'Prüfung empfohlen'
                 :                            'Gültig',
            status: sslStatus,
            barPercent: toBar(sslStatus),
        },
        {
            id: 'headers',
            label: 'Security Headers',
            value: hdStatus === 'critical' ? 'Fehlen komplett'
                 : hdStatus === 'warn'     ? 'Teilweise vorhanden'
                 :                           'Vollständig',
            status: hdStatus,
            barPercent: toBar(hdStatus),
        },
        {
            id: 'performance',
            label: 'Performance',
            value: perfStatus === 'critical' ? 'Kritisch langsam'
                 : perfStatus === 'warn'     ? 'Optimierung nötig'
                 :                             'Im Zielbereich',
            status: perfStatus,
            barPercent: toBar(perfStatus),
        },
        {
            id: 'availability',
            label: 'Erreichbarkeit',
            value: 'Alles online',
            status: 'ok',
            barPercent: 100,
        },
    ];
}

export function buildScoreNarrative(ctx: WebsiteEntryContext): string {
    const domain = ctx.domain ?? ctx.companyName;
    const hochCount = (ctx.tasks ?? []).filter(t => t.priority === 'hoch').length;
    const totalCount = (ctx.tasks ?? []).length;
    const score = ctx.score ?? 0;

    if (score >= 80) {
        return `${domain} hat eine solide Basis — kleinere Verbesserungen sind möglich.`;
    }
    if (hochCount > 0) {
        return `${domain} ist online — hat aber ${hochCount} kritische Lücke${hochCount > 1 ? 'n' : ''}, die heute schließbar ist${hochCount > 1 ? '' : ''}.`;
    }
    if (totalCount > 0) {
        return `${domain} ist online — hat aber ${totalCount} Verbesserung${totalCount > 1 ? 'en' : ''}, die heute umsetzbar ist${totalCount > 1 ? '' : ''}.`;
    }
    return `${domain} wurde analysiert. Der Score zeigt Optimierungspotenzial.`;
}
```

- [ ] **Step 4: Run test to confirm PASS**

```powershell
npx jest --no-coverage "scoreBreakdown" 2>&1 | Select-Object -Last 6
```
Expected: `Tests: 7 passed`

- [ ] **Step 5: Commit**

```powershell
git add lib/dossier/scoreBreakdown.ts __tests__/lib/dossier/scoreBreakdown.test.ts
git commit -m "feat(dossier): scoreBreakdown — task-derived 4-dimension score bars + narrative"
```

---

## Task 2: SecurityCheckPlaygroundLogin — silent auth

**Files:**
- Create: `components/entry/SecurityCheckPlaygroundLogin.tsx`

No separate test file — this component is tested as part of SecurityCheckEntry in Task 3.

- [ ] **Step 1: Create the component**

Create `components/entry/SecurityCheckPlaygroundLogin.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { corePost } from '@/lib/api/coreClient';
import { useNavStore } from '@/lib/store/navStore';
import { saveWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

interface Props {
    context: WebsiteEntryContext;
    onReady: () => void;
    onError: () => void;
}

/**
 * Silently authenticates the visitor as a playground guest.
 * Uses /v3/playground/guest-session (shared playground tenant).
 * Saves websiteEntryContext to localStorage, sets activeMode = 'personal_demo'.
 * Calls onReady on success, onError on failure.
 * Renders nothing — invisible auth layer.
 */
export function SecurityCheckPlaygroundLogin({ context, onReady, onError }: Props) {
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        async function run() {
            try {
                // Derive a stable visitor identity from domain + random suffix
                let visitorId = typeof window !== 'undefined'
                    ? localStorage.getItem('saimor_visitor_id')
                    : null;
                if (!visitorId) {
                    visitorId = `visitor_${Math.random().toString(36).slice(2, 10)}`;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('saimor_visitor_id', visitorId);
                    }
                }

                const sessionSuffix = Math.random().toString(36).slice(2, 8);
                const domain = context.domain ?? 'demo';
                const email = `visitor-${sessionSuffix}@${domain}`;

                // Auth: creates/joins shared playground tenant, sets mora_public_token cookie
                await corePost('/v3/playground/guest-session', {
                    email,
                    name: context.companyName,
                    visitor_id: visitorId,
                });

                // Persist the scan context so HomeSurface can read it
                saveWebsiteEntryContext(context, { openOnHome: true });

                // Mark this session as a personal demo (not generic playground)
                useNavStore.getState().setActiveMode('personal_demo');

                onReady();
            } catch {
                onError();
            }
        }

        void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -Last 10
```
Expected: no output (clean).

- [ ] **Step 3: Commit**

```powershell
git add components/entry/SecurityCheckPlaygroundLogin.tsx
git commit -m "feat(entry): SecurityCheckPlaygroundLogin — silent playground auth for security check visitors"
```

---

## Task 3: SecurityCheckEntry — full-screen entry UI

**Files:**
- Create: `components/entry/SecurityCheckEntry.tsx`
- Test: `__tests__/components/entry/SecurityCheckEntry.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/entry/SecurityCheckEntry.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SecurityCheckEntry } from '@/components/entry/SecurityCheckEntry';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

jest.mock('@/components/entry/SecurityCheckPlaygroundLogin', () => ({
    SecurityCheckPlaygroundLogin: ({ onReady }: any) => {
        // Simulate immediate success in tests
        React.useEffect(() => { onReady(); }, [onReady]);
        return null;
    },
}));

const mockCtx: WebsiteEntryContext = {
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    level: 'Mittel',
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [
        { title: 'SSL-Zertifikat erneuern', priority: 'hoch' },
        { title: 'CSP-Header einrichten', priority: 'mittel' },
    ],
};

it('shows company greeting', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByText(/Acme GmbH/)).toBeInTheDocument();
});

it('shows score number', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByTestId('entry-score')).toHaveTextContent('62');
});

it('shows score narrative', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByTestId('entry-narrative')).toHaveTextContent('acme.de');
});

it('shows 4 dimension bars', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getAllByTestId('score-dimension')).toHaveLength(4);
});

it('shows CTA button', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByRole('button', { name: /Workspace öffnen/i })).toBeInTheDocument();
});

it('CTA redirects to /home after auth ready', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });

    render(<SecurityCheckEntry context={mockCtx} />);

    await waitFor(() => {
        const btn = screen.getByRole('button', { name: /Workspace öffnen/i });
        btn.click();
        expect(window.location.href).toBe('/home');
    });

    Object.defineProperty(window, 'location', { value: originalLocation });
});
```

- [ ] **Step 2: Run test to confirm FAIL**

```powershell
npx jest --no-coverage "SecurityCheckEntry" 2>&1 | Select-Object -Last 6
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SecurityCheckEntry**

Create `components/entry/SecurityCheckEntry.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { SecurityCheckPlaygroundLogin } from './SecurityCheckPlaygroundLogin';
import { scoreBreakdown, buildScoreNarrative } from '@/lib/dossier/scoreBreakdown';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

interface Props {
    context: WebsiteEntryContext;
}

const STATUS_COLORS = {
    critical: { bar: 'bg-gradient-to-r from-red-500 to-red-300', text: 'text-red-300', border: 'border-red-500/20 bg-red-500/5' },
    warn:     { bar: 'bg-gradient-to-r from-amber-500 to-amber-300', text: 'text-amber-300', border: 'border-amber-400/15 bg-amber-500/4' },
    ok:       { bar: 'bg-gradient-to-r from-emerald-500 to-emerald-300', text: 'text-emerald-300', border: 'border-emerald-400/15 bg-emerald-500/4' },
};

export function SecurityCheckEntry({ context }: Props) {
    const [authReady, setAuthReady] = useState(false);
    const [authError, setAuthError] = useState(false);
    const [waiting, setWaiting] = useState(false);

    const dimensions = scoreBreakdown(context);
    const narrative  = buildScoreNarrative(context);
    const domain     = context.domain ?? context.companyName;

    function handleCta() {
        if (authReady) {
            window.location.href = '/home';
        } else {
            setWaiting(true);
        }
    }

    function handleReady() {
        setAuthReady(true);
        if (waiting) window.location.href = '/home';
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#05040d] text-white">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute top-[-200px] left-[-100px] h-[600px] w-[700px] rounded-full bg-violet-600/[0.10] blur-[140px]" />
            <div className="pointer-events-none absolute bottom-[-200px] right-[-100px] h-[500px] w-[600px] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Silent auth */}
            <SecurityCheckPlaygroundLogin
                context={context}
                onReady={handleReady}
                onError={() => setAuthError(true)}
            />

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-14 pt-7">
                <div className="text-[15px] font-semibold tracking-[0.08em] text-white/85">
                    SAIM<span className="text-violet-400/85">Ô</span>R
                </div>
                <div className="font-mono text-[11px] text-white/20">
                    hq.saimor.world · Security Check Entry
                </div>
            </div>

            {/* Two-column layout */}
            <div className="relative z-10 grid min-h-[calc(100vh-72px)] grid-cols-2">

                {/* ── Left: Personal + Score ── */}
                <div className="flex flex-col justify-center px-14 py-12">
                    {/* Eyebrow */}
                    <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/18 bg-violet-500/8 px-4 py-1.5">
                        <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-violet-400/80" />
                        <span className="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Dein Workspace ist bereit</span>
                    </div>

                    {/* Greeting */}
                    <h1 className="mb-1.5 text-[50px] font-light leading-[1.08] tracking-[-0.03em] text-white/92">
                        Hallo,<br />{context.companyName}.
                    </h1>
                    <p className="mb-10 font-mono text-[13px] text-white/25">{domain}</p>

                    {/* Score */}
                    <div className="mb-4 flex items-end gap-3">
                        <span data-testid="entry-score" className="bg-gradient-to-br from-amber-400 to-red-400 bg-clip-text text-[72px] font-black leading-none text-transparent">
                            {context.score ?? '—'}
                        </span>
                        <div className="pb-2">
                            <div className="text-[18px] font-light text-white/18">/ 100</div>
                            <div className="mt-1 text-[11px] text-amber-300/65">⚠ {context.level ?? 'Mittleres Risiko'}</div>
                        </div>
                    </div>

                    {/* Narrative */}
                    <p data-testid="entry-narrative" className="mb-2 max-w-[440px] text-[16px] font-light leading-[1.55] tracking-[-0.01em] text-white/75">
                        {narrative}
                    </p>
                    <p className="mb-6 max-w-[420px] text-[12px] leading-relaxed text-white/30">
                        Der Score misst Sicherheit, Performance und Erreichbarkeit — jede Dimension mit konkreten Befunden.
                    </p>

                    {/* Dimension bars */}
                    <div className="mb-9 flex flex-col gap-3">
                        {dimensions.map(dim => (
                            <div key={dim.id} data-testid="score-dimension" className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-white/48">{dim.label}</span>
                                    <span className={`text-[11px] font-semibold ${STATUS_COLORS[dim.status].text}`}>
                                        {dim.value}
                                    </span>
                                </div>
                                <div className="h-[4px] overflow-hidden rounded-full bg-white/[0.05]">
                                    <div
                                        className={`h-full rounded-full ${STATUS_COLORS[dim.status].bar}`}
                                        style={{ width: `${dim.barPercent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleCta}
                            disabled={authError}
                            className="inline-flex items-center gap-2.5 rounded-[14px] border border-violet-400/30 bg-violet-600/85 px-7 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-violet-500/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {waiting ? 'Wird vorbereitet…' : 'Workspace öffnen'}&nbsp;→
                        </button>
                        <span className="text-[11px] text-white/20">
                            {authError ? 'Fehler — bitte neu laden.' : 'Kein Account · Demo-Space'}
                        </span>
                    </div>
                </div>

                {/* ── Right: What is SAIMÔR ── */}
                <div className="flex flex-col justify-center border-l border-white/[0.05] px-14 py-12">
                    <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-white/20">Was dich erwartet</p>
                    <h2 className="mb-3 text-[28px] font-light leading-[1.3] tracking-[-0.02em] text-white/88">
                        Dein Scan-Ergebnis<br />
                        als{' '}
                        <span className="bg-gradient-to-r from-cyan-300/90 to-violet-300/90 bg-clip-text text-transparent">
                            lebender Workspace.
                        </span>
                    </h2>
                    <p className="mb-9 max-w-[420px] text-[13px] leading-[1.75] text-white/38">
                        SAIMÔR OS verbindet dein Dossier, KI und Struktur zu einem echten Workspace — gebaut um deine Findings.
                    </p>

                    {/* Feature tiles */}
                    <div className="mb-8 flex flex-col gap-2.5">
                        {[
                            { icon: '🌐', title: 'Universe — Org als Karte', desc: 'Bereiche, Verbindungen, Signale. Kein Organigramm — eine lebende Topographie.' },
                            { icon: '📁', title: 'Finder — Dossier liegt drin', desc: 'Alle Findings als Dokument. Öffne es, bearbeite es, frag Môra dazu.' },
                            { icon: '✦',  title: 'Môra — kennt deinen Score', desc: 'Frag sie nach Maßnahmen — sie antwortet mit deinen konkreten Daten.' },
                        ].map(f => (
                            <div key={f.title} className="flex items-start gap-3.5 rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-4 py-3.5">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border border-violet-400/18 bg-violet-500/10 text-[13px]">
                                    {f.icon}
                                </div>
                                <div>
                                    <div className="mb-0.5 text-[13px] font-medium text-white/80">{f.title}</div>
                                    <div className="text-[11px] leading-relaxed text-white/32">{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Môra strip */}
                    <div className="flex items-center gap-3.5 rounded-[14px] border border-violet-500/18 bg-violet-500/7 px-5 py-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-violet-400/28 bg-violet-500/20 text-[15px]">
                            ✦
                        </div>
                        <p className="text-[12px] leading-relaxed text-white/40">
                            <span className="font-medium text-violet-300/85">Môra kennt bereits dein Ergebnis.</span>
                            <br />Frag sie: „Was sind meine drei dringendsten Maßnahmen?"
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/[0.04] px-14 py-5 text-[10px] text-white/15">
                <span>© 2026 SAIMÔR · Demo-Space · Keine echten Daten gespeichert</span>
                <div className="flex gap-5">
                    <a href="https://saimor.world/de/datenschutz" className="hover:text-white/40">Datenschutz</a>
                    <a href="https://saimor.world" className="hover:text-white/40">saimor.world</a>
                </div>
            </div>
        </main>
    );
}
```

- [ ] **Step 4: Run test to confirm PASS**

```powershell
npx jest --no-coverage "SecurityCheckEntry" 2>&1 | Select-Object -Last 8
```
Expected: `Tests: 6 passed`

- [ ] **Step 5: TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -Last 10
```
Expected: no output.

- [ ] **Step 6: Commit**

```powershell
git add components/entry/SecurityCheckEntry.tsx __tests__/components/entry/SecurityCheckEntry.test.tsx
git commit -m "feat(entry): SecurityCheckEntry — full-screen immersive security check experience"
```

---

## Task 4: entry/page.tsx — route security-audit to new component

**Files:**
- Modify: `app/entry/page.tsx`

The current routing (line ~34-49) shows `DemoWelcomeCardClient` for ALL `websiteContext` cases.
We want: `security-audit` → `SecurityCheckEntry`, others → `DemoWelcomeCardClient`.

- [ ] **Step 1: Read the current routing block**

```powershell
Get-Content "E:\saimor\INTERFACE\app\entry\page.tsx" | Select-Object -First 55
```

- [ ] **Step 2: Add import and route**

In `app/entry/page.tsx`, add import after the `DemoWelcomeCardClient` import line:

```tsx
import { SecurityCheckEntry } from '@/components/entry/SecurityCheckEntry';
```

Replace the `websiteContext` route block (the `if (websiteContext)` check) with:

```tsx
    // Security audit: full immersive entry experience
    if (websiteContext && websiteContext.entity === 'security-audit') {
        return <SecurityCheckEntry context={websiteContext} />;
    }

    // Other website contexts (digital-blueprint etc): guided welcome card
    if (websiteContext) {
        return (
            <main className="min-h-screen bg-[#05040d] text-white">
                {token ? <WebsiteEntryTokenLogin token={token} /> : null}
                <WebsiteEntryPersistence context={websiteContext} />
                <div className="flex min-h-screen items-center justify-center px-6 py-10">
                    <DemoWelcomeCardClient context={websiteContext} />
                </div>
            </main>
        );
    }
```

Note: `SecurityCheckEntry` handles its own auth internally via `SecurityCheckPlaygroundLogin` — no `WebsiteEntryTokenLogin` or `WebsiteEntryPersistence` needed for the security-audit branch.

- [ ] **Step 3: TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -Last 10
```
Expected: no output.

- [ ] **Step 4: Run full test suite**

```powershell
npx jest --no-coverage 2>&1 | Select-Object -Last 8
```
Expected: all pass, no regressions.

- [ ] **Step 5: Commit**

```powershell
git add app/entry/page.tsx
git commit -m "feat(entry): route security-audit to SecurityCheckEntry"
```

---

## Task 5: useAutoOpenDossier — guided OS entry

**Files:**
- Create: `lib/hooks/useAutoOpenDossier.ts`
- Test: `__tests__/lib/hooks/useAutoOpenDossier.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/hooks/useAutoOpenDossier.test.tsx`:

```tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAutoOpenDossier } from '@/lib/hooks/useAutoOpenDossier';
import { usePaneStore } from '@/lib/store/paneStore';

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: jest.fn(),
}));

const mockRevealPane = jest.fn();
const mockGetPane    = jest.fn().mockReturnValue(null);

const mockContext = {
    id: 'ctx-auto-1',
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [{ title: 'SSL erneuern', priority: 'hoch' as const }],
    storedAt: new Date().toISOString(),
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
    (usePaneStore as jest.Mock).mockImplementation((selector?: any) => {
        const store = { revealPane: mockRevealPane, getPane: mockGetPane };
        return selector ? selector(store) : store;
    });
});

afterEach(() => {
    jest.useRealTimers();
});

it('does not open pane when context is null', () => {
    renderHook(() => useAutoOpenDossier(null, 'node-123'));
    act(() => jest.runAllTimers());
    expect(mockRevealPane).not.toHaveBeenCalled();
});

it('does not open pane when nodeId is null', () => {
    renderHook(() => useAutoOpenDossier(mockContext, null));
    act(() => jest.runAllTimers());
    expect(mockRevealPane).not.toHaveBeenCalled();
});

it('opens dossier pane after 800ms with nodeId', () => {
    renderHook(() => useAutoOpenDossier(mockContext, 'node-abc'));
    act(() => jest.advanceTimersByTime(800));
    expect(mockRevealPane).toHaveBeenCalledWith(
        'dossier-main',
        expect.objectContaining({ type: 'document', data: { nodeId: 'node-abc' } })
    );
});

it('opens chat pane after 1400ms with initialMessage', () => {
    renderHook(() => useAutoOpenDossier(mockContext, 'node-abc'));
    act(() => jest.advanceTimersByTime(1400));
    expect(mockRevealPane).toHaveBeenCalledWith(
        'chat-main',
        expect.objectContaining({
            type: 'chat',
            data: expect.objectContaining({ initialMessage: expect.stringContaining('acme.de') }),
        })
    );
});

it('does not fire again if already opened (localStorage flag)', () => {
    localStorage.setItem('saimor_dossier_auto_opened_ctx-auto-1', '1');
    renderHook(() => useAutoOpenDossier(mockContext, 'node-abc'));
    act(() => jest.runAllTimers());
    expect(mockRevealPane).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to confirm FAIL**

```powershell
npx jest --no-coverage "useAutoOpenDossier" 2>&1 | Select-Object -Last 6
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `lib/hooks/useAutoOpenDossier.ts`:

```ts
import { useEffect, useRef } from 'react';
import { usePaneStore } from '@/lib/store/paneStore';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';

const FLAG_PREFIX = 'saimor_dossier_auto_opened_';

/**
 * Opens the dossier pane and Môra chat once per websiteEntryContext.id
 * when the visitor lands in the OS after a Security Check.
 * Uses localStorage to ensure it only fires on the first visit.
 */
export function useAutoOpenDossier(
    context: StoredWebsiteEntryContext | null,
    dossierNodeId: string | null
): void {
    const { revealPane } = usePaneStore();
    const fired = useRef(false);

    useEffect(() => {
        if (!context || !dossierNodeId || fired.current) return;

        const flagKey = `${FLAG_PREFIX}${context.id ?? context.companyName}`;
        if (typeof window !== 'undefined' && localStorage.getItem(flagKey)) return;

        fired.current = true;
        if (typeof window !== 'undefined') localStorage.setItem(flagKey, '1');

        const domain      = context.domain ?? context.companyName;
        const firstTask   = context.tasks?.find(t => t.priority === 'hoch') ?? context.tasks?.[0];
        const taskHint    = firstTask ? ` Dringendster Punkt: ${firstTask.title}.` : '';
        const moraMessage = `Was sind meine drei dringendsten Maßnahmen für ${domain}?`;

        // 1. Open dossier pane after short delay (let OS settle)
        const t1 = setTimeout(() => {
            revealPane('dossier-main', {
                type: 'document',
                title: `${context.companyName} — Dossier`,
                size: { width: 760, height: 620 },
                data: { nodeId: dossierNodeId },
            });
        }, 800);

        // 2. Open Môra chat with context-aware initial question
        const t2 = setTimeout(() => {
            revealPane('chat-main', {
                type: 'chat',
                title: 'Môra',
                size: { width: 860, height: 680 },
                data: { initialMessage: moraMessage },
            });
        }, 1400);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context?.id, dossierNodeId]);
}
```

- [ ] **Step 4: Run test to confirm PASS**

```powershell
npx jest --no-coverage "useAutoOpenDossier" 2>&1 | Select-Object -Last 8
```
Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```powershell
git add lib/hooks/useAutoOpenDossier.ts __tests__/lib/hooks/useAutoOpenDossier.test.tsx
git commit -m "feat(dossier): useAutoOpenDossier — guided OS entry: auto-open dossier + Môra on first visit"
```

---

## Task 6: HomeSurface — add hook + fix openWebsiteDossier

**Files:**
- Modify: `components/home/HomeSurface.tsx`

Two changes:
1. Add `useAutoOpenDossier(websiteEntryContext, dossierNodeId)` call
2. Fix `openWebsiteDossier` to open the real node instead of broken URL-check pane

- [ ] **Step 1: Add import**

In `components/home/HomeSurface.tsx`, find the `useCreateDossierNode` import line and add below it:

```tsx
import { useAutoOpenDossier } from '@/lib/hooks/useAutoOpenDossier';
```

- [ ] **Step 2: Add hook call**

Find the line:
```tsx
    const { nodeId: dossierNodeId } = useCreateDossierNode(websiteEntryContext);
```

Add immediately after it:
```tsx
    useAutoOpenDossier(websiteEntryContext, dossierNodeId);
```

- [ ] **Step 3: Fix openWebsiteDossier**

Find the `openWebsiteDossier` useCallback (around line 291). Replace the entire callback with:

```tsx
    const openWebsiteDossier = useCallback(() => {
        if (!websiteEntryContext) return;
        if (dossierNodeId) {
            // Node exists — open the real dossier document
            revealPane('dossier-main', {
                type: 'document',
                title: `${websiteEntryContext.companyName} — Dossier`,
                size: { width: 760, height: 620 },
                data: { nodeId: dossierNodeId },
            });
        } else if (websiteEntryContext.domain) {
            // Fallback — live URL check (while node is still being created)
            revealPane('website-dossier-current', {
                type: 'website-dossier',
                title: `${websiteEntryContext.companyName} Dossier`,
                size: { width: 1040, height: 720 },
                data: { url: `https://${websiteEntryContext.domain}` },
            });
        }
    }, [revealPane, websiteEntryContext, dossierNodeId]);
```

- [ ] **Step 4: Add mock + test for useAutoOpenDossier in HomeSurface test file**

In `__tests__/components/home/HomeSurface.test.tsx`, add alongside the existing `useCreateDossierNode` mock:

```tsx
jest.mock('@/lib/hooks/useAutoOpenDossier', () => ({
    useAutoOpenDossier: jest.fn(),
}));
```

- [ ] **Step 5: Run HomeSurface tests**

```powershell
npx jest --no-coverage "HomeSurface" 2>&1 | Select-Object -Last 8
```
Expected: all 29 pass.

- [ ] **Step 6: Run full suite**

```powershell
npx jest --no-coverage 2>&1 | Select-Object -Last 8
```
Expected: 0 new failures.

- [ ] **Step 7: TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -Last 10
```
Expected: no output.

- [ ] **Step 8: Commit**

```powershell
git add components/home/HomeSurface.tsx __tests__/components/home/HomeSurface.test.tsx
git commit -m "feat(home): auto-open dossier + fix openWebsiteDossier → real node"
```

---

## Task 7: Push + Deploy

- [ ] **Step 1: Push**

```powershell
git push origin main
```

- [ ] **Step 2: Deploy**

```bash
ssh root@49.12.195.166 "cd /root/saimor/ops && bash deploy-ui.sh 2>&1 | tail -10"
```

- [ ] **Step 3: Verify SHA + health**

```bash
ssh root@49.12.195.166 "cat /root/saimor/ops/DEPLOYED_REVISIONS.txt | grep ui_sha && docker inspect saimor-ui-1 --format '{{.State.Health.Status}}'"
```
Expected: latest SHA + `healthy`.

- [ ] **Step 4: Smoke test**

Open `https://saimor.world/de/einstieg/security-check` in a private window, complete a scan, click "OS öffnen". Verify:
- ✅ Full-screen entry page shows with company name + score bars
- ✅ Clicking "Workspace öffnen" redirects to /home
- ✅ Dossier pane opens automatically after ~800ms
- ✅ Môra chat opens with pre-filled question after ~1400ms
- ✅ "Dossier öffnen" in amber card opens the real node

---

## Notes for Executor

- **Test command:** `npx jest --no-coverage "<pattern>"` from `E:\saimor\INTERFACE`
- **Baseline:** 699 passing before this plan
- **Deploy:** `ssh root@49.12.195.166 "cd /root/saimor/ops && bash deploy-ui.sh 2>&1 | tail -10"`
- **Do not modify:** VAPI/phone call logic anywhere in the codebase
- **SecurityCheckEntry** handles its own auth — do NOT add `WebsiteEntryTokenLogin` to the security-audit branch in entry/page.tsx
- **`revealPane`** in HomeSurface is a `useCallback` wrapper around `usePaneStore().openPane` — use it, don't call `openPane` directly
- **Wall feature** is Phase 2 (separate plan) — the existing "Auf die Wall" stub button stays as-is
