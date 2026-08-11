'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Play } from 'lucide-react';
import { corePost, coreGet } from '@/lib/api/coreClient';
import { toast } from 'sonner';

/**
 * Checks if there is an active real (non-preview) CORE session.
 * Returns the user's email if logged in as a real user, null otherwise.
 */
async function detectRealSession(): Promise<string | null> {
    try {
        const profile = await coreGet('/v3/auth/me', { isOptional: true }) as any;
        if (!profile) return null;
        const email: string = profile?.email ?? profile?.data?.email ?? '';
        // Preview sessions use the internal @preview.saimor.local domain
        if (email.endsWith('@preview.saimor.local')) return null;
        if (!email) return null;
        return email;
    } catch {
        return null;
    }
}

type WebsitePreviewSession = {
    active_company_id?: string;
    guided_demo_company_id?: string;
};

export function WebsiteEntryTokenLogin({
    token,
    onSuccess,
    redirectOnSuccess = true,
}: {
    token: string;
    onSuccess?: (session: WebsitePreviewSession) => void;
    redirectOnSuccess?: boolean;
}) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'checking' | 'confirm' | 'logging-in' | 'success' | 'error'>('idle');
    const [realEmail, setRealEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!token || status !== 'idle') return;

        async function check() {
            setStatus('checking');
            const email = await detectRealSession();
            if (email) {
                // Real user is logged in — show confirmation screen before destroying session
                setRealEmail(email);
                setStatus('confirm');
            } else {
                setStatus('logging-in');
                void runLogin();
            }
        }

        void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function runLogin() {
        setStatus('logging-in');
            try {
                // HARD RESET: Clear all existing session indicators to avoid collisions
                // 1. Server-side logout (removes session from DB/cookie)
                try {
                    await corePost('/v3/auth/logout', {}, { skipAuth: true, isOptional: true });
                } catch {
                    // Ignore logout errors (e.g. if already logged out)
                }

                // 2. Client-side purge — clear with both path-only AND domain variants
                // to handle cookies set with domain=.saimor.world in production.
                const cookieClearFull = (name: string) => {
                    const base = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                    document.cookie = base;
                    document.cookie = base + ' domain=.saimor.world;';
                    document.cookie = base + ' domain=saimor.world;';
                };
                cookieClearFull('mora_auth_token');
                cookieClearFull('mora_session');
                localStorage.removeItem('saimor_dev_token');
                localStorage.removeItem('saimor_auth_token');
                localStorage.removeItem('last_company_id');
                localStorage.removeItem('last_workspace');

                // Wait a tiny bit for cookies to propagate
                await new Promise(r => setTimeout(r, 100));

                // 3. The /v3/entry/website-preview endpoint creates the preview tenant
                // and sets the 'mora_auth_token' cookie.
                const res = await corePost('/v3/entry/website-preview', { token }, { skipAuth: true });
                
                if (res && (res as any).success) {
                    setStatus('success');
                    toast.success('Security-Check Vorschau-Raum bereit. Myzel-Struktur wird geladen...');

                    // Let the caller do any pre-redirect setup (e.g. set activeMode).
                    onSuccess?.(res as WebsitePreviewSession);

                    // Force a full refresh/redirect to ensure all stores (authStore, etc.)
                    // pick up the new session from the cookie.
                    if (redirectOnSuccess) {
                        window.location.href = '/home';
                    }
                } else {
                    throw new Error('Login response invalid');
                }
            } catch (err) {
                console.error('[WebsiteEntryTokenLogin] Error:', err);
                setStatus('error');
                toast.error('HQ Preview konnte nicht erstellt werden. Der Link ist eventuell abgelaufen.');
            }
        }

    if (status === 'idle' || status === 'checking') return null;
    if (status === 'success' && !redirectOnSuccess) return null;

    // Confirmation screen — shown when a real user is already logged in
    if (status === 'confirm' && realEmail) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d0921]/95 backdrop-blur-xl p-6 text-center">
                <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-white/[0.04] p-8 space-y-6">
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300/70">Bereits eingeloggt</p>
                        <h3 className="text-xl font-light text-white">Du bist als</h3>
                        <p className="text-sm font-mono text-emerald-300 bg-emerald-400/10 rounded-lg px-3 py-2">{realEmail}</p>
                        <h3 className="text-xl font-light text-white">eingeloggt.</h3>
                    </div>
                    <p className="text-sm text-white/45 leading-relaxed">
                        Der Security Check öffnet einen isolierten 20-Tage-Preview-Account und loggt dich aus deinem echten HQ aus.
                    </p>
                    <div className="grid gap-3">
                        <button
                            onClick={() => { void runLogin(); }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-400 transition-all"
                        >
                            <Play size={14} />
                            Demo trotzdem öffnen (ausloggen)
                        </button>
                        <button
                            onClick={() => { router.push('/home'); }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <LogOut size={14} />
                            In meinem echten HQ bleiben
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d0921] p-6 text-center">
            <div className="relative mb-8 h-24 w-24">
                <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-xl" />
                <div className="flex h-full w-full items-center justify-center rounded-full border border-emerald-500/30 bg-black/40">
                    <Loader2 className="animate-spin text-emerald-400" size={32} />
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-xl font-medium text-white">SAIMÔR HQ</h3>
                <p className="max-w-xs text-sm leading-relaxed text-white/45">
                    {status === 'logging-in' && 'Dein personalisierter Workspace wird generiert...'}
                    {status === 'success' && 'Vorbereitung abgeschlossen. Willkommen im HQ.'}
                    {status === 'error' && 'Fehler beim Laden der Preview.'}
                </p>
            </div>

            {status === 'error' && (
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                    Erneut versuchen
                </button>
            )}
        </div>
    );
}
