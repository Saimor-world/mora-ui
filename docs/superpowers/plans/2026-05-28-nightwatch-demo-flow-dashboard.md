# Nightwatch + Demo-Flow + Dashboard-as-Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three independent epics — (A) Nightwatch operational, (B) Demo-Flow as guided product experience from WORLD→OS, (C) Larry Dashboard as standalone marketable product.

**Architecture:**
- Epic A: Server-side only (SSH to root@49.12.195.166). Python cron + email script.
- Epic B: Spans WORLD website, INTERFACE (SaimôrOS), CORE backend. The bridge already exists (`website-entry-claim` API + `StoredWebsiteEntryContext`). Goal: make it a clean, guided narrative with Nightwatch + Larry embedded.
- Epic C: larry-ui (`/root/larry-ui/`) gets standalone onboarding, own branding surface, and a public demo mode.

**Tech Stack:** Python 3 (Nightwatch), Next.js 15 (INTERFACE + larry-ui), FastAPI (CORE), smtplib + Resend SMTP, Docker + cron (server)

---

## Current State (READ THIS FIRST)

### Server layout
```
root@49.12.195.166
  /root/saimor/ops/          ← production docker-compose.yml, deploy.sh, Caddyfile
  /root/larry_nightwatch.py  ← Nightwatch monitor script (NOT in cron — this is the bug)
  /root/larry_email.py       ← Does NOT exist yet (to be created)
  /root/larry-ui/            ← Larry Dashboard Next.js app (docker: larry-ui container, port 3000)
  /root/larry/               ← Larry agent backend (docker: larry_v2 container, port 18789)
  /data/nightwatch/          ← status.json, incidents.json, history.json (written by nightwatch.py)
  /data/larry-canvas/        ← Canvas widget JSON files (written via /api/larry/canvas)
```

### INTERFACE layout (local: E:\saimor\INTERFACE)
```
lib/hooks/useSurfaceProfile.ts      ← surface detection (isPublicDemoSurface, isHqSurface, isLocalTruthSurface)
lib/os/companySurfaceFilter.ts      ← company filtering utility (just implemented)
app/api/auth/website-entry-claim/   ← POST: validates SAIMOR_ENTRY_SECRET, stores StoredWebsiteEntryContext
app/api/auth/website-entry-login/   ← POST: logs user in with demo token
app/entry/page.tsx                  ← Entry surface (website visitors land here)
components/home/HomeSurface.tsx     ← Home screen (shows website-entry card if websiteEntryContext present)
components/auth/WelcomeScreen.tsx   ← Login/entry screen
```

### Canvas API (already implemented in larry-ui)
- `POST /api/larry/canvas` — create/update widget `{ id, type, title, ...data }`
- `GET /api/larry/canvas` — list all widgets
- Widget types: `stat`, `chart`, `table`, `timeline`, `alert`, `markdown`
- Stored as JSON in `/data/larry-canvas/<id>.json`

### Nightwatch push_canvas (already in larry_nightwatch.py)
The script already has `push_canvas()` that pushes status table + incident alerts to Canvas.
It just never runs because there's no cron job.

### Demo Flow (current — broken)
1. User clicks demo on world website
2. WORLD calls `POST https://api.saimor.world/v3/entry/claim` with `SAIMOR_ENTRY_SECRET`
3. Gets back a short-lived token
4. Redirects to `https://hq.saimor.world/entry?token=...`
5. INTERFACE `/entry` page exchanges token for session
6. User lands on HomeSurface in demo mode
7. **Problem:** No guided narrative, no clean demo separation, Larry/Nightwatch not shown

---

## Epic A — Nightwatch Operational

### A-Task 1: Add Nightwatch to crontab + create log directory

**Files:**
- Modify: server crontab via `crontab -e` equivalent
- Create: `/root/logs/nightwatch.log` (via mkdir)

- [ ] **Step 1: Create log directory and test run**
```bash
ssh root@49.12.195.166 "mkdir -p /root/logs && python3 /root/larry_nightwatch.py --once >> /root/logs/nightwatch.log 2>&1 && tail -5 /root/logs/nightwatch.log"
```
Expected: Script runs, status.json is written, no Python exceptions.

- [ ] **Step 2: Add to crontab**
```bash
ssh root@49.12.195.166 "(crontab -l 2>/dev/null; echo '*/5 * * * * /usr/bin/python3 /root/larry_nightwatch.py --once >> /root/logs/nightwatch.log 2>&1') | crontab -"
```

- [ ] **Step 3: Verify crontab**
```bash
ssh root@49.12.195.166 "crontab -l | grep nightwatch"
```
Expected: `*/5 * * * * /usr/bin/python3 /root/larry_nightwatch.py --once >> /root/logs/nightwatch.log 2>&1`

- [ ] **Step 4: Verify Canvas data appears (wait 5 min or trigger manually)**
```bash
ssh root@49.12.195.166 "curl -s http://localhost:3000/api/larry/canvas | python3 -m json.tool | head -20"
```
Expected: JSON with `widgets` array containing `nightwatch-status` and/or `nightwatch-incidents`.

---

### A-Task 2: Create Nightwatch daily summary email script

**Files:**
- Create: `/root/nightwatch_email.py`

- [ ] **Step 1: Write the email script**

Create `/root/nightwatch_email.py` on the server (use heredoc via SSH or write locally and SCP):

```python
#!/usr/bin/env python3
"""Nightwatch Daily Summary Email — reads /data/nightwatch/ and sends HTML email via Resend SMTP."""
import json, smtplib, os, sys
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

STATUS_FILE    = Path('/data/nightwatch/status.json')
INCIDENTS_FILE = Path('/data/nightwatch/incidents.json')

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.resend.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', 'resend')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'contact@saimor.world')
SMTP_TO   = os.environ.get('SMTP_TO', 'm.f4hrlaender@gmail.com')

def load_json(path, default):
    try:
        return json.loads(path.read_text())
    except Exception:
        return default

def send_email(subject: str, body_html: str, body_text: str):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = f'Nightwatch <{SMTP_FROM}>'
    msg['To']      = SMTP_TO
    msg.attach(MIMEText(body_text, 'plain', 'utf-8'))
    msg.attach(MIMEText(body_html, 'html', 'utf-8'))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as srv:
        srv.starttls()
        srv.login(SMTP_USER, SMTP_PASS)
        srv.sendmail(SMTP_FROM, [SMTP_TO], msg.as_string())

def main():
    status    = load_json(STATUS_FILE, {})
    incidents = load_json(INCIDENTS_FILE, [])
    targets    = status.get('targets', [])
    containers = status.get('containers', [])
    overall    = status.get('overall', 'UNKNOWN')
    last_check = status.get('last_check', 'unbekannt')
    open_incidents = [i for i in incidents if i.get('status') == 'open']

    emoji = {'OK': '✅', 'WARN': '⚠️', 'CRIT': '🚨'}.get(overall, '❓')
    date_str = datetime.now().strftime('%d.%m.%Y %H:%M')
    running = sum(1 for c in containers if c.get('running'))
    total   = len(containers)

    domain_rows = ''.join(
        f'<tr><td>{"✅" if t.get("status")=="OK" else "🔴"} {t.get("label","—")}</td>'
        f'<td>{t.get("status","—")}</td>'
        f'<td>{t.get("response_ms","—")}ms</td>'
        f'<td>{t.get("ssl_days","—")}d</td></tr>'
        for t in targets
    )
    incident_html = ''
    if open_incidents:
        rows = ''.join(
            f'<tr><td>🚨 {i.get("target_label","—")}</td><td>{i.get("message","—")}</td><td>{i.get("opened_at","—")}</td></tr>'
            for i in open_incidents
        )
        incident_html = f'''<h3 style="color:#ef4444">Offene Incidents ({len(open_incidents)})</h3>
        <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px">
          <tr style="background:#1f1f1f;color:#fff"><th>Service</th><th>Beschreibung</th><th>Seit</th></tr>{rows}</table>'''

    html = f'''<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;padding:24px;max-width:700px">
    <div style="background:#111;border:1px solid #333;border-radius:12px;padding:24px">
      <h1 style="margin:0 0 4px">Nightwatch {emoji}</h1>
      <p style="color:#666;font-size:13px;margin:0 0 20px">SAIMÔR Infrastruktur · {date_str} · Check: {last_check}</p>
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:14px;flex:1;text-align:center">
          <div style="font-size:24px">{emoji}</div><div style="color:#999;font-size:11px">Status</div>
          <div style="font-weight:600">{overall}</div></div>
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:14px;flex:1;text-align:center">
          <div style="font-size:24px">{"🚨" if open_incidents else "✅"}</div><div style="color:#999;font-size:11px">Incidents</div>
          <div style="font-weight:600">{len(open_incidents)} offen</div></div>
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:14px;flex:1;text-align:center">
          <div style="font-size:24px">{"🟢" if running==total else "⚠️"}</div><div style="color:#999;font-size:11px">Container</div>
          <div style="font-weight:600">{running}/{total}</div></div>
      </div>
      {incident_html}
      <h3 style="margin:20px 0 8px;font-size:15px">Domains</h3>
      <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px">
        <tr style="background:#1f1f1f;color:#fff"><th>Domain</th><th>Status</th><th>Response</th><th>SSL</th></tr>
        {domain_rows or '<tr><td colspan="4" style="color:#666;text-align:center">Keine Daten</td></tr>'}
      </table>
      <p style="margin-top:20px;font-size:11px;color:#555">
        <a href="https://larry.saimor.world/nightwatch" style="color:#a78bfa">Dashboard öffnen</a>
      </p>
    </div></body></html>'''

    text = f'NIGHTWATCH {overall} — {date_str}\nIncidents: {len(open_incidents)}\nContainer: {running}/{total}\nDomains: {", ".join(t["label"]+"="+t["status"] for t in targets)}\nhttps://larry.saimor.world/nightwatch'
    subject = f'{"🚨 ALERT: " + str(len(open_incidents)) + " Incident(s) — " if open_incidents else ""}{emoji} Nightwatch {overall} — {date_str}'

    send_email(subject, html, text)
    print(f'Email gesendet: {subject}')

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: SCP script to server**
```bash
# From local machine:
scp E:\saimor\OPERATIONS\SCRIPTS\dev-tools\nightwatch_email.py root@49.12.195.166:/root/nightwatch_email.py
```
Or write directly via SSH heredoc (see below for PowerShell-safe approach).

- [ ] **Step 3: Test email script (dry run)**
```bash
ssh root@49.12.195.166 "SMTP_PASS=re_88akpMje_5pUf71roErnjW1vPjUjPyEth python3 /root/nightwatch_email.py"
```
Expected: `Email gesendet: ✅ Nightwatch OK — DD.MM.YYYY HH:MM`
Check inbox at m.f4hrlaender@gmail.com.

- [ ] **Step 4: Add daily email cron (7:30 Uhr)**
```bash
ssh root@49.12.195.166 "(crontab -l 2>/dev/null; echo '30 7 * * * SMTP_PASS=re_88akpMje_5pUf71roErnjW1vPjUjPyEth /usr/bin/python3 /root/nightwatch_email.py >> /root/logs/nightwatch-email.log 2>&1') | crontab -"
```

- [ ] **Step 5: Verify final crontab**
```bash
ssh root@49.12.195.166 "crontab -l"
```
Expected: Both nightwatch entries present.

---

### A-Task 3: Improve Nightwatch page — disable VAPI call button, show email status

**Files:**
- Modify: `/root/larry-ui/app/nightwatch/page.tsx` (684 lines, complex React component)

The nightwatch page already has domain status, container status, response time charts, incident tracking, and Docker stats. The main improvements needed:

- [ ] **Step 1: Read the full nightwatch page**
```bash
ssh root@49.12.195.166 "cat /root/larry-ui/app/nightwatch/page.tsx"
```

- [ ] **Step 2: Find the VAPI/phone call trigger UI**
Search for `Phone`, `notify_call`, or `VAPI` references in the page. These should be replaced with "Email-Alert" status indicator showing last email sent.

- [ ] **Step 3: Add "Last Email" status chip to header section**
In the header/status area of the page, add:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
  <Mail size={12} />
  <span>Daily 07:30 · letzter Check: {rel(status?.last_check ?? null)}</span>
</div>
```

- [ ] **Step 4: Deploy larry-ui after edit**
```bash
ssh root@49.12.195.166 "cd /root/larry-ui && npm run build && docker restart larry-ui"
```
Wait ~30s, then verify: `curl -sf -o /dev/null -w '%{http_code}' https://larry.saimor.world/nightwatch`
Expected: 200

---

## Epic B — Demo-Flow (WORLD → OS with guided narrative)

**Context:** The bridge already exists. What's missing is a guided, narrative demo experience.

### Current flow
1. `WORLD website` → POST `/v3/entry/claim` (CORE) → returns `{ token, redirect_url }`
2. Visitor redirected to `hq.saimor.world/entry?token=...`
3. INTERFACE `/entry/page.tsx` → exchanges token → session → HomeSurface

### Target flow
1. Same bridge (don't touch it)
2. New: `/entry` page shows a **Demo Welcome Screen** (not the login screen) with:
   - Company logo + name from `websiteEntryContext`
   - Score badge
   - 3-step narrative: "OS erkunden → Dokumente → Mit Mora sprechen"
   - "Workspace öffnen" CTA
3. HomeSurface in demo mode shows:
   - Clear "Demo-Modus" indicator (subtle chip, not intrusive)
   - Larry Dashboard link card in Mora-Suggestions
   - Nightwatch status mini-widget in Tageslage panel
4. Demo mode detection: use `surfaceProfile.isPublicDemoSurface` (already computed)

---

### B-Task 1: Demo Welcome Screen on `/entry`

**Files:**
- Modify: `E:\saimor\INTERFACE\app\entry\page.tsx`
- Create: `E:\saimor\INTERFACE\components\entry\DemoWelcomeCard.tsx`

- [ ] **Step 1: Read the current entry page**
```powershell
Get-Content "E:\saimor\INTERFACE\app\entry\page.tsx"
```

- [ ] **Step 2: Read websiteEntryContext type**
```powershell
Get-Content "E:\saimor\INTERFACE\lib\websiteEntryStorage.ts"
```

- [ ] **Step 3: Write test first**

Create `E:\saimor\INTERFACE\__tests__\components\entry\DemoWelcomeCard.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoWelcomeCard } from '@/components/entry/DemoWelcomeCard';

const mockCtx = {
  companyName: 'Acme GmbH',
  domain: 'acme.de',
  score: 82,
  tasks: [{ title: 'Website analysieren', priority: 'high' }],
  id: 'test-123',
};

it('shows company name and score', () => {
  render(<DemoWelcomeCard context={mockCtx} onOpen={jest.fn()} />);
  expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
  expect(screen.getByText('82')).toBeInTheDocument();
});

it('calls onOpen when CTA clicked', async () => {
  const onOpen = jest.fn();
  const { getByRole } = render(<DemoWelcomeCard context={mockCtx} onOpen={onOpen} />);
  getByRole('button', { name: /Workspace öffnen/i }).click();
  expect(onOpen).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 4: Run test to confirm fail**
```powershell
Set-Location "E:\saimor\INTERFACE"
npx jest --no-coverage --testPathPattern="DemoWelcomeCard" 2>&1 | Select-Object -Last 10
```
Expected: FAIL — module not found.

- [ ] **Step 5: Create DemoWelcomeCard component**

Create `E:\saimor\INTERFACE\components\entry\DemoWelcomeCard.tsx`:
```tsx
'use client';
import React from 'react';
import { Globe, FileText, Mic, ArrowRight } from 'lucide-react';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';

const STEPS = [
  { icon: <Globe size={14} />, label: 'OS erkunden', detail: 'Deine Organisation als lebendige Topographie' },
  { icon: <FileText size={14} />, label: 'Dokumente & Ordner', detail: 'Inhalte direkt im Workspace bearbeiten' },
  { icon: <Mic size={14} />, label: 'Mit Môra sprechen', detail: 'KI-Steuerung per Sprache oder Text' },
];

interface Props {
  context: StoredWebsiteEntryContext;
  onOpen: () => void;
}

export const DemoWelcomeCard: React.FC<Props> = ({ context, onOpen }) => (
  <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/60 p-8 backdrop-blur-2xl shadow-[0_40px_160px_rgba(0,0,0,0.6)] max-w-md w-full">
    <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-violet-300/70 via-cyan-200/55 to-amber-200/50" />

    {/* Header */}
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/55 mb-1">Demo-Workspace</div>
        <h1 className="text-[22px] font-light text-white/92 leading-tight">{context.companyName}</h1>
        {context.domain && (
          <div className="text-[12px] text-white/38 mt-0.5">{context.domain}</div>
        )}
      </div>
      {context.score !== undefined && (
        <div className="shrink-0 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[15px] font-medium text-amber-200/90">
          {context.score}
        </div>
      )}
    </div>

    {/* Steps */}
    <div className="flex flex-col gap-2 mb-7">
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-4 py-3">
          <div className="shrink-0 rounded-lg bg-violet-500/15 p-2 text-violet-300">{step.icon}</div>
          <div>
            <div className="text-[12px] font-medium text-white/78">{step.label}</div>
            <div className="text-[11px] text-white/38">{step.detail}</div>
          </div>
          <div className="ml-auto text-white/20 text-[10px]">{i + 1}</div>
        </div>
      ))}
    </div>

    {/* CTA */}
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-violet-600/80 hover:bg-violet-500/90 border border-violet-400/30 px-6 py-3.5 text-[13px] font-medium text-white transition-all"
    >
      Workspace öffnen
      <ArrowRight size={14} />
    </button>
  </div>
);
```

- [ ] **Step 6: Run test to confirm pass**
```powershell
npx jest --no-coverage --testPathPattern="DemoWelcomeCard" 2>&1 | Select-Object -Last 10
```
Expected: PASS — 2 tests.

- [ ] **Step 7: Integrate DemoWelcomeCard into /entry/page.tsx**

Read entry page first, then add: if `websiteEntryContext` is set AND user is not yet authenticated, show `DemoWelcomeCard` centered on screen instead of or above the standard login form.

Pattern in entry page:
```tsx
import { DemoWelcomeCard } from '@/components/entry/DemoWelcomeCard';
// In render, before returning standard entry UI:
if (websiteEntryContext && !session) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05040d]">
      <DemoWelcomeCard
        context={websiteEntryContext}
        onOpen={() => { /* proceed to login/auto-login */ }}
      />
    </div>
  );
}
```

- [ ] **Step 8: Commit**
```powershell
Set-Location "E:\saimor\INTERFACE"
git add components/entry/DemoWelcomeCard.tsx __tests__/components/entry/DemoWelcomeCard.test.tsx app/entry/page.tsx
git commit -m "feat(entry): DemoWelcomeCard — guided narrative for website-entry demo flow"
```

---

### B-Task 2: Demo-Modus Indicator in HomeSurface

**Files:**
- Modify: `E:\saimor\INTERFACE\components\home\HomeSurface.tsx`

When `surfaceProfile.isPublicDemoSurface` is true, show:
1. A subtle "Demo-Modus" chip in the briefing strip header
2. A "Larry Dashboard" suggestion card pointing to `https://larry.saimor.world`
3. Nightwatch status mini-chip in the Tageslage panel

- [ ] **Step 1: Write test for demo mode indicator**

Add to existing `__tests__/components/home/HomeSurface.test.tsx`:
```tsx
it('shows Demo-Modus chip when isPublicDemoSurface', () => {
  // Mock useSurfaceProfile to return isPublicDemoSurface: true
  jest.mocked(useSurfaceProfile).mockReturnValue({
    ...defaultSurfaceProfile,
    isPublicDemoSurface: true,
  });
  render(<HomeSurface />, { wrapper: TestWrapper });
  expect(screen.getByTestId('demo-mode-chip')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm fail**
```powershell
npx jest --no-coverage --testPathPattern="HomeSurface.test" 2>&1 | Select-Object -Last 5
```

- [ ] **Step 3: Add demo chip to HomeSurface briefing strip**

In `HomeSurface.tsx`, after the `useSurfaceProfile()` call, add:
```tsx
const { isPublicDemoSurface } = useSurfaceProfile();
```

In the briefing strip JSX (after `data-testid="briefing-strip"`), add before the `<h1>`:
```tsx
{isPublicDemoSurface && (
  <div
    data-testid="demo-mode-chip"
    className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-violet-300/80"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
    Demo-Modus
  </div>
)}
```

- [ ] **Step 4: Add Larry Dashboard to moraSuggestions when demo mode**

In `moraSuggestions` useMemo, add as first item when `isPublicDemoSurface`:
```tsx
if (isPublicDemoSurface) {
  suggestions.unshift({
    id: 'larry-dashboard',
    title: 'Larry Dashboard',
    description: 'Echtzeit-Überblick über alle KI-Agenten, Infrastruktur und Systemstatus.',
    icon: <Activity size={15} />,
    onClick: () => window.open('https://larry.saimor.world', '_blank'),
    actionText: 'Dashboard öffnen',
    tone: 'amber',
  });
}
```

- [ ] **Step 5: Run tests**
```powershell
npx jest --no-coverage --testPathPattern="HomeSurface" 2>&1 | Select-Object -Last 10
```
Expected: All pass.

- [ ] **Step 6: Commit**
```powershell
git add components/home/HomeSurface.tsx __tests__/components/home/HomeSurface.test.tsx
git commit -m "feat(home): demo-mode chip + Larry Dashboard suggestion in public demo surface"
```

---

### B-Task 3: Push + CI/CD

- [ ] **Push to trigger deploy**
```powershell
Set-Location "E:\saimor\INTERFACE"
git push origin main
```
GitHub Actions runs: lint → typecheck → tests → build → SSH deploy.

- [ ] **Verify deploy after ~5 min**
```bash
ssh root@49.12.195.166 "curl -sf -o /dev/null -w '%{http_code}' https://hq.saimor.world/entry"
```
Expected: 200

---

## Epic C — Larry Dashboard as Standalone Marketable Product

**Context:** larry-ui is at `/root/larry-ui/`. It's a Next.js app running in Docker. Currently it's an internal tool. Goal: make it self-contained and presentable.

### C-Task 1: Dashboard Public Landing / About Page

**Files:**
- Modify: `/root/larry-ui/app/page.tsx` (Dashboard homepage)
- Create: `/root/larry-ui/app/about/page.tsx`

The homepage already has agents, calendar, missions, containers, canvas widgets. What's missing for "marketability":

- [ ] **Step 1: Read current homepage**
```bash
ssh root@49.12.195.166 "wc -l /root/larry-ui/app/page.tsx"
```
The homepage is already built. Add to the header section a product tagline + "Produktinfo" link.

- [ ] **Step 2: Create about/page.tsx — product positioning**

SSH to server, create `/root/larry-ui/app/about/page.tsx`:
```tsx
export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6">
      <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(192,132,252,0.7)' }}>
        SAIMÔR Larry Dashboard
      </div>
      <h1 className="text-4xl font-bold text-white mb-4">
        KI-Infrastruktur.<br />Echtzeit. Kontrolliert.
      </h1>
      <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Larry Dashboard ist ein intelligentes Betriebszentrum für KI-gestützte Teams.
        Überwache Agenten, verwalte Missionen, behalte System und Infrastruktur im Blick —
        alles in einem Interface.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-10">
        {[
          { icon: '🤖', label: 'KI-Agenten', detail: 'Larry, Atlas, Forge, Scout — orchestriert' },
          { icon: '🛡️', label: 'Nightwatch', detail: 'Infrastruktur-Monitor, 24/7, Auto-Healing' },
          { icon: '📊', label: 'Canvas', detail: 'Live-Visualisierungen von Agenten gepusht' },
          { icon: '📋', label: 'Missionen', detail: 'Aufgaben mit KI-Unterstützung tracken' },
        ].map(f => (
          <div key={f.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-white text-sm">{f.label}</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.detail}</div>
          </div>
        ))}
      </div>
      <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
        style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
        ← Zurück zum Dashboard
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Add nav link in Sidebar or NavBar**

In `/root/larry-ui/components/Sidebar.tsx` or NavBar, add link to `/about`.

- [ ] **Step 4: Build and deploy**
```bash
ssh root@49.12.195.166 "cd /root/larry-ui && npm run build && docker restart larry-ui && sleep 15 && curl -sf -o /dev/null -w '%{http_code}' https://larry.saimor.world/about"
```
Expected: 200

---

### C-Task 2: Nightwatch in Demo Flow (Homepage Nightwatch Card)

The Dashboard homepage already has a `Nightwatch` type (`type Nightwatch = { status?: ...; open_count?: number }`) and presumably fetches it. Ensure the Nightwatch status card is prominent on the homepage.

- [ ] **Step 1: Find Nightwatch data fetching in homepage**
```bash
ssh root@49.12.195.166 "grep -n 'nightwatch\|Nightwatch\|nw\b' /root/larry-ui/app/page.tsx | head -20"
```

- [ ] **Step 2: Ensure Nightwatch API endpoint exists in larry-ui**
```bash
ssh root@49.12.195.166 "ls /root/larry-ui/app/api/ | grep -i night"
```
If missing: create `/root/larry-ui/app/api/nightwatch/route.ts` that reads `/data/nightwatch/status.json` and `/data/nightwatch/incidents.json`.

```ts
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [status, incidents] = await Promise.all([
      readFile('/data/nightwatch/status.json', 'utf8').then(JSON.parse).catch(() => null),
      readFile('/data/nightwatch/incidents.json', 'utf8').then(JSON.parse).catch(() => []),
    ])
    const open_count = (incidents as any[]).filter((i: any) => i.status === 'open').length
    return NextResponse.json({ status, incidents, open_count })
  } catch (e) {
    return NextResponse.json({ status: null, incidents: [], open_count: 0, error: String(e) })
  }
}
```

- [ ] **Step 3: Add Nightwatch status card to homepage if not present**

In `/root/larry-ui/app/page.tsx`, in the status/infrastructure section, add a Nightwatch summary card showing overall status + open incident count. Reference the existing `Nightwatch` type and styling patterns in that file.

- [ ] **Step 4: Deploy and verify**
```bash
ssh root@49.12.195.166 "cd /root/larry-ui && npm run build && docker restart larry-ui"
```

---

## Execution Order

Run epics in this order:
1. **Epic A first** — quick wins, server-only, no CI needed, immediately observable
2. **Epic B** — requires INTERFACE CI (5 min per push), test-driven
3. **Epic C** — server-side, deploy after B

## Notes for Executor

- **SMTP password** for cron/email script: `re_88akpMje_5pUf71roErnjW1vPjUjPyEth` (Resend API key — stored in `/root/saimor/ops/.env` as `SMTP_PASS`)
- **Email recipient**: `m.f4hrlaender@gmail.com`
- **Server**: `root@49.12.195.166` (SSH key configured)
- **Larry UI deploy**: `cd /root/larry-ui && npm run build && docker restart larry-ui` (takes ~2 min)
- **INTERFACE deploy**: push to `main` → GitHub Actions auto-deploys (takes ~4 min)
- **Test command**: `npx jest --no-coverage --testPathPattern="<pattern>"` from `E:\saimor\INTERFACE`
- **Baseline tests**: 81 passing before this plan. Run full suite after each epic to check for regressions.
- **Surface profile hook**: `useSurfaceProfile()` from `@/lib/hooks/useSurfaceProfile` — returns `{ isPublicDemoSurface, isLocalTruthSurface, isHqSurface, companySwitcherEnabled, ... }`
- **Don't touch**: VAPI/Tower call logic in nightwatch.py (user confirmed: phone calls should stay)
- **Demo companies**: `company.is_demo === true` marks demo data — don't create new demo detection logic, use existing `isPublicDemoSurface`
