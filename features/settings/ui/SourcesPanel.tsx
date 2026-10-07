'use client';
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, FailureState, Hint, Input, Loading, Stack, Status, Text } from '@/components/os-kit';
import { corePost } from '@/lib/api/http';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { isLocalCore, SOURCE_GROUP_LABEL, STATUS_LABEL, useSources, type SourceEntry } from '@/lib/os-prototype/useSources';

/**
 * V1.6 Quellen-Seite (Einstellungen › Quellen).
 * Liste + Status 1:1 aus `GET /v3/connections` (CORE ist die Wahrheit).
 * „Verbinden“ nutzt die vorhandenen CORE-Flows `POST /v3/connections/{provider}/connect`
 * (OAuth-Start bzw. Zugangsdaten-Prüfung) – im Prototyp nur gegen einen lokalen CORE.
 * Zugangsdaten werden nie im Browser gespeichert; Felder werden nach dem Senden geleert.
 */
const STATUS_TONE: Record<string, 'safe' | 'neutral' | 'warning'> = { connected: 'safe', available: 'neutral', setup_required: 'warning' };

function ConnectForm({ entry, onDone }: { entry: SourceEntry; onDone: (msg: string, ok: boolean) => void }) {
  const fields = entry.action?.field_schema || [];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.default || ''])));
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await corePost(`/v3/connections/${encodeURIComponent(entry.id)}/connect`, values);
      onDone(`${entry.label} ist laut CORE verbunden.`, true);
    } catch (err) {
      onDone(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen.', false);
    } finally {
      setValues(Object.fromEntries(fields.map((f) => [f.name, f.default || ''])));
      setBusy(false);
    }
  };
  return (
    <form className="os-source-form" onSubmit={submit} data-testid={`source-form-${entry.id}`}>
      {fields.map((f) => f.type === 'select' ? (
        <label key={f.name} className="flex flex-col gap-1"><span className="os-text-meta os-tone-faint">{f.label}</span>
          <select className="os-input" value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
            {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ) : (
        <Input key={f.name} label={f.label} hideLabel={false} type={f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
          required={f.required} placeholder={f.placeholder} autoComplete={f.autocomplete || 'off'} value={values[f.name] || ''}
          onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
      ))}
      {entry.action?.note ? <Text variant="meta">{entry.action.note}</Text> : null}
      <Stack direction="row" gap={2}><Button size="sm" type="submit" disabled={busy}>{busy ? 'Wird geprüft …' : 'Prüfen und verbinden'}</Button></Stack>
    </form>
  );
}

export function SourcesPanel({ live, demo }: { live: boolean; demo: boolean }) {
  const qc = useQueryClient();
  const sources = useSources(live);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const local = isLocalCore();

  if (!live) {
    return (
      <Stack gap={3} data-testid="sources-panel">
        <Text tone="default">Quellen zeigt CORE erst mit einer Sitzung an.</Text>
        <Text variant="meta">{demo ? 'In der lokalen Vorschau ist nichts verbunden – und es wird auch nichts behauptet.' : 'Bitte anmelden.'} Verfügbar in CORE: Kalender, Cloud-Dateien (Google Drive, SharePoint, Nextcloud), E-Mail, Werkzeuge (Notion, MailerLite, Calendly) und Zahlungen.</Text>
      </Stack>
    );
  }
  if (sources.isLoading) return <Loading />;
  if (sources.isError) return <FailureState kind={classifyCoreFailure(sources.error)} compact subject="/v3/connections" />;
  const list = sources.data?.connections || [];
  if (!list.length) {
    return (
      <Stack gap={2} data-testid="sources-panel">
        <Text tone="default">Für dieses Konto liefert CORE keine Quellen.</Text>
        <Text variant="meta">{sources.data?.boundary ? 'Demo-Konten können keine echten Verbindungen speichern.' : 'Keine Quellen konfiguriert.'}</Text>
      </Stack>
    );
  }
  const groups = Array.from(new Set(list.map((s) => s.group)));
  const connected = list.filter((s) => s.status === 'connected').length;

  const startOAuth = async (entry: SourceEntry) => {
    try {
      const res = await corePost(`/v3/connections/${encodeURIComponent(entry.id)}/connect`, { return_to: window.location.href });
      const url = res?.authorization_url || res?.auth_url || res?.url;
      if (url && typeof url === 'string') { window.location.assign(url); return; }
      setMessage({ id: entry.id, text: 'CORE hat keinen Anmelde-Link geliefert.', ok: false });
    } catch (err) {
      setMessage({ id: entry.id, text: err instanceof Error ? err.message : 'Start fehlgeschlagen.', ok: false });
    }
  };

  return (
    <Stack gap={4} data-testid="sources-panel">
      <Stack direction="row" gap={3} align="center" wrap>
        <Text tone="default">{connected} von {list.length} Quellen verbunden</Text>
        <Text variant="meta">Status direkt aus CORE (/v3/connections). Das Morgenbriefing startet mit der ersten verbundenen Quelle.</Text>
      </Stack>
      {!local ? <Hint tone="warning" testId="sources-local-only">Verbinden ist im Prototyp nur gegen einen lokalen CORE (localhost) freigeschaltet.</Hint> : null}
      {groups.map((g) => (
        <section key={g} aria-label={SOURCE_GROUP_LABEL[g] || g}>
          <Text variant="eyebrow" className="mb-2">{SOURCE_GROUP_LABEL[g] || g}</Text>
          <div className="os-list">
            {list.filter((s) => s.group === g).map((s) => (
              <div key={s.id} className="os-source-row" data-testid={`source-${s.id}`} data-status={s.status}>
                <div className="os-list-row">
                  <Stack gap={0} className="min-w-0"><Text tone="default">{s.label}</Text><Text variant="meta">{s.detail}</Text></Stack>
                  <Stack direction="row" gap={2} align="center">
                    <Status tone={STATUS_TONE[s.status] || 'neutral'}>{STATUS_LABEL[s.status] || s.status}</Status>
                    {s.action && s.status !== 'connected' ? (
                      <Button size="sm" variant="ghost" disabled={!local} data-testid={`source-connect-${s.id}`}
                        onClick={() => (s.action?.kind === 'oauth' ? startOAuth(s) : setOpen(open === s.id ? null : s.id))}>
                        {s.action.kind === 'oauth' ? 'Anmelden …' : open === s.id ? 'Abbrechen' : 'Verbinden'}
                      </Button>
                    ) : null}
                  </Stack>
                </div>
                {open === s.id && local ? <ConnectForm entry={s} onDone={(text, ok) => { setMessage({ id: s.id, text, ok }); if (ok) { setOpen(null); qc.invalidateQueries({ queryKey: ['os', 'sources'] }); } }} /> : null}
                {message?.id === s.id ? <Hint tone={message.ok ? 'info' : 'warning'} testId={`source-msg-${s.id}`}>{message.text}</Hint> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </Stack>
  );
}
