'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { corePost } from '@/lib/api/coreClient';
import { CLOUD_OAUTH_MESSAGE } from '@/lib/integrations/calendarOAuth';

type DirectProvider = 'nextcloud' | 'extcloud';

interface DirectCloudConnectClientProps {
    provider: DirectProvider;
    label?: string;
    baseUrl?: string;
    username?: string;
    rootPath?: string;
}

const PROVIDER_LABEL: Record<DirectProvider, string> = {
    nextcloud: 'Nextcloud',
    extcloud: 'Extcloud',
};

function toSecurityUrl(baseUrl: string): string | null {
    const value = (baseUrl || '').trim();
    if (!/^https?:\/\//i.test(value)) return null;
    try {
        const url = new URL(value);
        return `${url.origin}/settings/user/security`;
    } catch {
        return null;
    }
}

export default function DirectCloudConnectClient({
    provider,
    label = '',
    baseUrl = '',
    username = '',
    rootPath = '/Saimor HQ',
}: DirectCloudConnectClientProps) {
    const [nextLabel, setNextLabel] = useState(
        label || (provider === 'extcloud' ? 'Saimor HQ Extcloud' : 'Meine Nextcloud')
    );
    const [nextBaseUrl, setNextBaseUrl] = useState(baseUrl);
    const [nextUsername, setNextUsername] = useState(username);
    const [nextAppPassword, setNextAppPassword] = useState('');
    const [nextRootPath, setNextRootPath] = useState(rootPath || '/');
    const [isSaving, setIsSaving] = useState(false);
    const [isDone, setIsDone] = useState(false);

    const securityUrl = useMemo(() => toSecurityUrl(nextBaseUrl), [nextBaseUrl]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!window.location.search) return;
        // Remove query payload from address bar/history in the popup.
        window.history.replaceState({}, document.title, '/oauth/cloud/direct');
    }, []);

    const finish = (status: string) => {
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                    {
                        type: CLOUD_OAUTH_MESSAGE,
                        provider,
                        status,
                    },
                    window.location.origin
                );
            }
        } finally {
            window.setTimeout(() => window.close(), 300);
        }
    };

    const save = async () => {
        setIsSaving(true);
        try {
            await corePost('/v3/integrations/cloud', {
                provider,
                label: nextLabel,
                base_url: nextBaseUrl,
                username: nextUsername,
                app_password: nextAppPassword,
                root_path: nextRootPath,
            });
            setIsDone(true);
            toast.success(`${PROVIDER_LABEL[provider]} verbunden`);
            finish('configured');
        } catch (error: any) {
            toast.error(error?.message || 'Cloud-Verbindung konnte nicht gespeichert werden');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#04110e] px-6 py-8 text-emerald-50">
            <div className="mx-auto w-full max-w-2xl rounded-3xl border border-emerald-400/15 bg-black/35 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2.5 text-emerald-200">
                        <ShieldCheck size={18} />
                    </div>
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/70">Cloud Connect</div>
                        <h1 className="mt-2 text-xl font-medium">{PROVIDER_LABEL[provider]} im sicheren Fenster verbinden</h1>
                        <p className="mt-2 text-sm leading-relaxed text-emerald-50/65">
                            Dieses Fenster ist nur fuer die Verbindung gedacht. Nach erfolgreichem Speichern schliesst es automatisch.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <label className="block space-y-1.5 text-xs text-white/60">
                        <span>Label</span>
                        <input
                            value={nextLabel}
                            onChange={(event) => setNextLabel(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                            placeholder="Meine Cloud"
                        />
                    </label>
                    <label className="block space-y-1.5 text-xs text-white/60">
                        <span>{PROVIDER_LABEL[provider]} URL</span>
                        <input
                            value={nextBaseUrl}
                            onChange={(event) => setNextBaseUrl(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                            placeholder="https://cloud.example.com"
                        />
                    </label>
                    <label className="block space-y-1.5 text-xs text-white/60">
                        <span>Nutzername</span>
                        <input
                            value={nextUsername}
                            onChange={(event) => setNextUsername(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                            placeholder="dein-user"
                        />
                    </label>
                    <label className="block space-y-1.5 text-xs text-white/60">
                        <span>App-Passwort</span>
                        <input
                            type="password"
                            value={nextAppPassword}
                            onChange={(event) => setNextAppPassword(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                            placeholder={`${PROVIDER_LABEL[provider]} App-Passwort`}
                        />
                    </label>
                    <label className="block space-y-1.5 text-xs text-white/60">
                        <span>Startordner im privaten Bereich</span>
                        <input
                            value={nextRootPath}
                            onChange={(event) => setNextRootPath(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                            placeholder="/Saimor HQ"
                        />
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void save()}
                        disabled={isSaving || !nextBaseUrl.trim() || !nextUsername.trim() || !nextAppPassword.trim()}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/14 px-4 py-2 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {isDone ? 'Verbunden' : 'Verbinden'}
                    </button>
                    {securityUrl ? (
                        <a
                            href={securityUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/75 transition-colors hover:bg-white/[0.08]"
                        >
                            <ExternalLink size={13} />
                            App-Passwort in {PROVIDER_LABEL[provider]} öffnen
                        </a>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
