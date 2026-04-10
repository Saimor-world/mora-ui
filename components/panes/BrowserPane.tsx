'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useIntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';
import {
    ArrowLeft,
    ArrowRight,
    ExternalLink,
    Globe,
    Mail,
    Calendar,
    RefreshCw,
    ShieldCheck,
    Bell,
} from 'lucide-react';

interface BrowserPaneProps {
    id: string;
}

const START_URL = 'about:saimor-connect';

const normalizeUrl = (value: string) => {
    const next = value.trim();
    if (!next) return START_URL;
    if (next === START_URL) return START_URL;
    if (next.startsWith('/')) return next;
    if (/^https?:\/\//i.test(next)) return next;
    return `https://${next}`;
};

const providerUrl = (provider?: string) => {
    switch ((provider || '').toLowerCase()) {
        case 'outlook':
        case 'office365':
            return 'https://outlook.office.com/mail/';
        case 'gmail':
        default:
            return 'https://mail.google.com/';
    }
};

export const BrowserPane: React.FC<BrowserPaneProps> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const { overview, browserBridge, loadOverview } = useIntegrationsOverview();

    const initialUrl = useMemo(
        () => normalizeUrl(typeof pane?.data?.initialUrl === 'string' ? pane.data.initialUrl : START_URL),
        [pane?.data?.initialUrl]
    );

    const [address, setAddress] = useState(initialUrl);
    const [history, setHistory] = useState<string[]>([initialUrl]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [iframeKey, setIframeKey] = useState(0);

    useEffect(() => {
        setAddress(initialUrl);
        setHistory([initialUrl]);
        setHistoryIndex(0);
        setIframeKey((value) => value + 1);
    }, [initialUrl]);

    const committedUrl = history[historyIndex] || START_URL;
    const isInternalStart = committedUrl === START_URL;

    const navigate = useCallback((nextUrl: string, replace: boolean = false) => {
        const normalized = normalizeUrl(nextUrl);
        setAddress(normalized);
        if (replace) {
            setHistory((prev) => {
                const copy = [...prev];
                copy[historyIndex] = normalized;
                return copy;
            });
        } else {
            const nextHistory = [...history.slice(0, historyIndex + 1), normalized];
            setHistory(nextHistory);
            setHistoryIndex(nextHistory.length - 1);
        }
        setIframeKey((value) => value + 1);
    }, [history, historyIndex]);

    const goBack = useCallback(() => {
        if (historyIndex === 0) return;
        setHistoryIndex((value) => value - 1);
        setAddress(history[historyIndex - 1] || START_URL);
        setIframeKey((value) => value + 1);
    }, [history, historyIndex]);

    const goForward = useCallback(() => {
        if (historyIndex >= history.length - 1) return;
        setHistoryIndex((value) => value + 1);
        setAddress(history[historyIndex + 1] || START_URL);
        setIframeKey((value) => value + 1);
    }, [history, historyIndex]);

    const refresh = useCallback(() => {
        setIframeKey((value) => value + 1);
        if (isInternalStart) {
            void loadOverview();
        }
    }, [isInternalStart, loadOverview]);

    const openMailPane = useCallback(() => {
        openPane({
            id: 'mail-main',
            type: 'mail',
            title: 'Post',
            size: { width: 960, height: 720 },
        });
    }, [openPane]);

    const openIntegrationsPane = useCallback(() => {
        openPane({
            id: 'integrations-main',
            type: 'integrations',
            title: 'Integrationen',
            size: { width: 980, height: 740 },
        });
    }, [openPane]);

    const openExternal = useCallback(() => {
        if (typeof window === 'undefined' || isInternalStart) return;
        window.open(committedUrl, '_blank', 'noopener,noreferrer');
    }, [committedUrl, isInternalStart]);

    const openProvider = useCallback((url: string) => {
        navigate(url);
    }, [navigate]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Browser"
            paneId={id}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full flex-col bg-[#05110f]">
                <div className="border-b border-white/8 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={goBack}
                            disabled={historyIndex === 0}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-35"
                        >
                            <ArrowLeft size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={goForward}
                            disabled={historyIndex >= history.length - 1}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-35"
                        >
                            <ArrowRight size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={refresh}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.06]"
                        >
                            <RefreshCw size={15} />
                        </button>
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/8 bg-black/25 px-3 py-2.5">
                            <Globe size={15} className="text-cyan-300/70" />
                            <input
                                value={address}
                                onChange={(event) => setAddress(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        navigate(address);
                                    }
                                }}
                                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                                placeholder="about:saimor-connect oder URL eingeben"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(address)}
                            className="rounded-xl border border-cyan-400/18 bg-cyan-500/[0.12] px-3 py-2 text-xs uppercase tracking-[0.18em] text-cyan-50 transition-colors hover:bg-cyan-500/[0.18]"
                        >
                            Oeffnen
                        </button>
                        <button
                            type="button"
                            onClick={openExternal}
                            disabled={isInternalStart}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-35"
                        >
                            <ExternalLink size={15} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    {isInternalStart ? (
                        <div className="grid h-full grid-cols-[1.15fr_0.85fr] gap-6 p-6">
                            <div className="rounded-[28px] border border-cyan-400/12 bg-[linear-gradient(160deg,rgba(5,18,22,0.78),rgba(4,10,13,0.45))] p-6 backdrop-blur-xl">
                                <div className="text-[10px] uppercase tracking-[0.26em] text-cyan-200/52">Browser Connect</div>
                                <h2 className="mt-3 text-[28px] font-light text-white">Lokale Konten und Kommunikation</h2>
                                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/58">
                                    Dieser Browser ist die lokale Bruecke fuer Mail, Kalender, Browser-Benachrichtigungen und spaetere OAuth- oder Passkey-Flows.
                                    Auf HQ bleibt das die Demo-Schale, auf localhost wird daraus die echte Wahrheitsflaeche.
                                </p>

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => openProvider(providerUrl(overview?.mail?.provider))}
                                        className="rounded-[22px] border border-emerald-400/14 bg-emerald-500/[0.08] px-4 py-4 text-left transition-all hover:border-emerald-300/28 hover:bg-emerald-500/[0.14]"
                                    >
                                        <div className="flex items-center gap-2 text-emerald-100">
                                            <Mail size={17} />
                                            <span className="text-sm font-medium">Mail</span>
                                        </div>
                                        <div className="mt-2 text-xs text-white/56">
                                            {overview?.mail?.email || 'Postfach verbinden oder Mail im Browser oeffnen'}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openProvider('https://calendar.google.com/')}
                                        className="rounded-[22px] border border-orange-400/14 bg-orange-500/[0.08] px-4 py-4 text-left transition-all hover:border-orange-300/28 hover:bg-orange-500/[0.14]"
                                    >
                                        <div className="flex items-center gap-2 text-orange-100">
                                            <Calendar size={17} />
                                            <span className="text-sm font-medium">Kalender</span>
                                        </div>
                                        <div className="mt-2 text-xs text-white/56">
                                            {overview?.calendar?.email || 'Kalender verbinden oder direkt oeffnen'}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openMailPane}
                                        className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition-all hover:border-white/18 hover:bg-white/[0.06]"
                                    >
                                        <div className="flex items-center gap-2 text-white/86">
                                            <Mail size={17} />
                                            <span className="text-sm font-medium">Post im OS</span>
                                        </div>
                                        <div className="mt-2 text-xs text-white/52">
                                            Mail-App direkt in SAIMOR oeffnen.
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openIntegrationsPane}
                                        className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition-all hover:border-white/18 hover:bg-white/[0.06]"
                                    >
                                        <div className="flex items-center gap-2 text-white/86">
                                            <ShieldCheck size={17} />
                                            <span className="text-sm font-medium">Integrationen</span>
                                        </div>
                                        <div className="mt-2 text-xs text-white/52">
                                            Browser, Mail, Kalender und Local Truth verwalten.
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="mb-3 flex items-center gap-2 text-white/82">
                                        <Bell size={16} className="text-cyan-300" />
                                        <span className="text-sm font-medium">Browser-Status</span>
                                    </div>
                                    <div className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/70">
                                        {browserBridge.permission === 'granted'
                                            ? 'Benachrichtigungen freigegeben'
                                            : browserBridge.permission === 'denied'
                                                ? 'Benachrichtigungen blockiert'
                                                : browserBridge.permission === 'default'
                                                    ? 'Benachrichtigungen noch nicht freigegeben'
                                                    : 'Browser-Freigaben hier nicht verfuegbar'}
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Mail</div>
                                    <div className="mt-2 text-lg text-white">
                                        {overview?.mail?.configured ? (overview.mail.email || 'Verbunden') : 'Noch nicht verbunden'}
                                    </div>
                                    <div className="mt-2 text-xs leading-relaxed text-white/56">
                                        {overview?.capabilities?.mail_local_mode
                                            ? 'Lokaler Mail-Modus aktiv. Die echte Verbindung wird im lokalen Wahrheitsmodus gepflegt.'
                                            : 'Mail kann hier fuer localhost vorbereitet und spaeter direkt im OS genutzt werden.'}
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Local Truth</div>
                                    <div className="mt-2 text-lg text-white">
                                        {overview?.runtime?.local_truth?.configured_model || overview?.runtime?.local_truth?.recommended_model || 'gemma4:e2b'}
                                    </div>
                                    <div className="mt-2 text-xs leading-relaxed text-white/56">
                                        {overview?.runtime?.local_truth?.available
                                            ? 'Lokale Runtime ist vorbereitet. Browser, Mail und Kalender koennen an dieselbe Wahrheitsinstanz haengen.'
                                            : 'Die lokale Runtime wird vorbereitet und ueber localhost zur eigentlichen Produktionswahrheit.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <iframe
                            key={iframeKey}
                            src={committedUrl}
                            className="h-full w-full border-0 bg-[#071311]"
                            title="SAIMOR Browser"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
                            referrerPolicy="strict-origin-when-cross-origin"
                        />
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};
