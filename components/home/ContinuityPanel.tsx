"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ContinuityRequest = (operation: "list" | "scan" | "approve", body?: { id: string; proposal_hash: string }) => Promise<unknown>;
type Thread = {
  id: string; state: "open" | "approved" | "unavailable"; proposal_hash: string; task_id: string | null;
  proposal: { statement: string; suggestion: string; expires_at: string;
    action: { title: string; due_date: string; visibility: "private"; type: "task.create_internal" };
    evidence: { provider: string; observed_at: string };
    confidence: { level: string; limitation: string };
  };
};
function threadsFrom(value: unknown): Thread[] {
  if (!Array.isArray(value)) throw new Error("Der Stand ist nicht verfügbar.");
  for (const item of value) {
    if (!item || typeof item.id !== "string" || !["open", "approved", "unavailable"].includes(item.state)
      || typeof item.proposal_hash !== "string" || typeof item.proposal?.statement !== "string"
      || typeof item.proposal?.suggestion !== "string" || !Number.isFinite(Date.parse(item.proposal?.expires_at))
      || typeof item.proposal?.action?.title !== "string" || !Number.isFinite(Date.parse(item.proposal?.action?.due_date))
      || item.proposal?.action?.type !== "task.create_internal" || item.proposal?.action?.visibility !== "private"
      || typeof item.proposal?.evidence?.provider !== "string" || !Number.isFinite(Date.parse(item.proposal?.evidence?.observed_at))
      || typeof item.proposal?.confidence?.limitation !== "string") {
      throw new Error("Der Stand ist nicht verfügbar.");
    }
  }
  return value as Thread[];
}
export function ContinuityPanel({ request }: { request: ContinuityRequest }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const generation = useRef(0);
  const run = useCallback(async (operation: "list" | "scan" | "approve", thread?: Thread) => {
    const current = ++generation.current;
    setBusy(true);
    setMessage("");
    setSelected(null);
    try {
      if (operation === "approve" && thread) {
        const receipt = await request("approve", { id: thread.id, proposal_hash: thread.proposal_hash });
        if (!receipt || typeof receipt !== "object" || !("task_id" in receipt) || typeof receipt.task_id !== "string") {
          throw new Error("Bestätigung unklar. Bitte den Stand neu laden, bevor du erneut bestätigst.");
        }
      }
      if (operation === "scan") await request("scan");
      const rows = threadsFrom(await request("list"));
      if (current !== generation.current) return;
      setThreads(rows);
      if (operation === "approve") setMessage("Deine private Aufgabe ist in SAIMÔR gespeichert.");
    } catch (error) {
      if (current !== generation.current) return;
      setThreads(null);
      setMessage(error instanceof Error ? error.message : "Der Stand ist nicht verfügbar.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, [request]);
  useEffect(() => {
    void run("list");
    return () => { generation.current += 1; };
  }, [run]);

  return <section aria-label="Kalender-Fäden" aria-busy={busy}>
    <h3>Deine Kalender-Fäden</h3>
    <p>Private Vorbereitungsaufgaben für bevorstehende Termine. In YORI und OS derselbe Stand.</p>
    <div>
      <button type="button" disabled={busy} onClick={() => void run("scan")}>Kalender prüfen</button>{" "}
      <button type="button" disabled={busy} onClick={() => void run("list")}>Stand laden</button>
    </div>
    {busy ? <p role="status">Wird geprüft …</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {threads?.length === 0 ? <p>Keine vorbereiteten Vorschläge geladen. Das sagt nichts über externe Reminder aus.</p> : null}
    {threads?.slice(0, 8).map(thread => <article key={thread.id}>
      <h4>{thread.proposal.action.title}</h4>
      {thread.state === "approved" ? <p>Aufgabe gespeichert · nur für dich</p> :
        thread.state === "unavailable" ? <p>Vorschlag nicht mehr aktuell. Bitte Kalender erneut prüfen.</p> :
        selected === thread.id ? <div>
          <p>{thread.proposal.statement}</p>
          <p>{thread.proposal.suggestion}</p>
          <p>Fällig: {new Date(thread.proposal.action.due_date).toLocaleString("de-DE")}</p>
          <p>Quelle: {thread.proposal.evidence.provider} · beobachtet {new Date(thread.proposal.evidence.observed_at).toLocaleString("de-DE")}</p>
          <p>Beleglage: {thread.proposal.confidence.level === "high" ? "hoch" : "eingeschränkt"}. {thread.proposal.confidence.limitation}</p>
          <p>Es wird eine private interne Aufgabe angelegt. Dein Google-Kalender bleibt unverändert.</p>
          <button type="button" disabled={busy || Date.now() >= Date.parse(thread.proposal.expires_at)}
            onClick={() => void run("approve", thread)}>Private Aufgabe bestätigen</button>{" "}
          <button type="button" onClick={() => setSelected(null)}>Zurück</button>
        </div> : <button type="button" disabled={busy} onClick={() => setSelected(thread.id)}>Vorschlag prüfen</button>}
    </article>)}
    {threads && threads.length > 8 ? <p>Die acht zuletzt aktualisierten Fäden werden angezeigt.</p> : null}
  </section>;
}

