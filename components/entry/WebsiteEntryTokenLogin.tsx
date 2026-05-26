'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';

export function WebsiteEntryTokenLogin({ token }: { token: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'logging-in' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (!token || status !== 'idle') return;

        async function login() {
            setStatus('logging-in');
            try {
                // HARD RESET: Clear all existing session indicators to avoid collisions
                // 1. Server-side logout (removes session from DB/cookie)
                try {
                    await corePost('/v3/auth/logout', {}, { skipAuth: true, isOptional: true });
                } catch {
                    // Ignore logout errors (e.g. if already logged out)
                }

                // 2. Client-side purge
                document.cookie = 'mora_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                document.cookie = 'mora_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
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
                    toast.success('HQ Preview bereit. Myzel-Struktur wird geladen...');
                    
                    // Force a full refresh/redirect to ensure all stores (authStore, etc.) 
                    // pick up the new session from the cookie.
                    window.location.href = '/home';
                } else {
                    throw new Error('Login response invalid');
                }
            } catch (err) {
                console.error('[WebsiteEntryTokenLogin] Error:', err);
                setStatus('error');
                toast.error('HQ Preview konnte nicht erstellt werden. Der Link ist eventuell abgelaufen.');
            }
        }

        void login();
    }, [token, status, router]);

    if (status === 'idle') return null;

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
