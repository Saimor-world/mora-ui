'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react';
import {
  useCompleteCompanyRevolut,
  useSyncFinanceConnection,
} from '@/lib/queries/useFinanceSources';

type Status = 'reading' | 'completing' | 'syncing' | 'done' | 'error';

export default function RevolutBusinessCallbackPage() {
  const started = useRef(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('reading');
  const [message, setMessage] = useState('Revolut-Freigabe wird übernommen.');
  const complete = useCompleteCompanyRevolut(companyId);
  const sync = useSyncFinanceConnection(companyId);

  useEffect(() => {
    if (started.current || typeof window === 'undefined') return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || '';
    const connectionId = window.sessionStorage.getItem('saimor_revolut_connection_id') || '';
    const storedCompanyId = window.sessionStorage.getItem('saimor_revolut_company_id') || '';

    // Authorization codes are short-lived credentials. Remove them from browser
    // history immediately after capturing them in this closure.
    window.history.replaceState({}, '', '/finance/revolut/callback');

    if (!code || !connectionId || !storedCompanyId) {
      setStatus('error');
      setMessage('Die Revolut-Rückkehr konnte keiner offenen SAIMÔR-Freigabe zugeordnet werden.');
      return;
    }

    setCompanyId(storedCompanyId);
    setStatus('completing');

    void (async () => {
      try {
        // The hook receives companyId from React state on the next render, but
        // mutateAsync itself does not depend on companyId for the request body.
        await complete.mutateAsync({ connectionId, code });
        setStatus('syncing');
        setMessage('READ-Zugriff bestätigt. Konten und Transaktionen werden jetzt synchronisiert.');
        await sync.mutateAsync(connectionId);
        window.sessionStorage.removeItem('saimor_revolut_connection_id');
        window.sessionStorage.removeItem('saimor_revolut_company_id');
        setStatus('done');
        setMessage('Revolut Business ist read-only mit SAIMÔR Finance verbunden.');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Revolut Business konnte nicht verbunden werden.');
      }
    })();
    // Intentionally run once for the redirect credential.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const working = status === 'reading' || status === 'completing' || status === 'syncing';

  return (
    <main className="min-h-screen bg-[#080a0c] px-5 py-16 text-white">
      <section className="mx-auto max-w-xl rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-7 shadow-2xl">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-100/48">
          <ShieldCheck size={13} /> SAIMÔR Finance · Revolut Business
        </div>

        <div className="mt-7 flex items-start gap-4">
          {working && <LoaderCircle className="mt-1 animate-spin text-emerald-200/70" size={24} />}
          {status === 'done' && <CheckCircle2 className="mt-1 text-emerald-200/80" size={24} />}
          {status === 'error' && <CircleAlert className="mt-1 text-amber-200/80" size={24} />}
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.04em]">
              {status === 'done' ? 'Revolut ist verbunden.' : status === 'error' ? 'Freigabe nicht abgeschlossen.' : 'Verbindung wird geprüft.'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/45">{message}</p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-white/[0.06] bg-black/20 p-4 text-[11px] leading-relaxed text-white/36">
          SAIMÔR fordert für diesen Connector ausschließlich <strong className="font-medium text-white/60">READ</strong> an.
          Der Authorization Code wird nicht gespeichert. Zahlungs-, Transfer- und Exchange-Funktionen sind in diesem Finance-Connector nicht implementiert.
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border border-emerald-300/18 bg-emerald-400/[0.045] px-4 py-2.5 text-xs font-medium text-emerald-100/76"
        >
          Zurück zu SAIMÔR
        </Link>
      </section>
    </main>
  );
}
