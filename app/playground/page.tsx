'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';

export default function PlaygroundPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'initializing' | 'success' | 'error'>('initializing');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        async function initPlayground() {
            try {
                // Get or generate visitor_id
                let visitorId = localStorage.getItem('saimor_visitor_id');
                if (!visitorId) {
                    visitorId = `visitor_${Math.random().toString(36).substring(2, 10)}`;
                    localStorage.setItem('saimor_visitor_id', visitorId);
                }

                // Call guest session endpoint
                const res = await corePost('/v3/playground/guest-session', {
                    visitor_id: visitorId,
                    visitor_name: 'Gast'
                }, { skipAuth: true });

                if (res && res.session_token) {
                    // Set playground storage keys (does not touch real mora_session!)
                    localStorage.setItem('saimor_active_mode', 'public_playground');
                    localStorage.setItem('saimor_playground_session', res.session_token);
                    localStorage.setItem('saimor_tenant', res.tenant_id);
                    localStorage.setItem('saimor_role', res.role);
                    
                    // Clear cached company ID to force loading the public company
                    localStorage.removeItem('last_company_id');

                    setStatus('success');
                    toast.success('Website-HQ erfolgreich geladen. Myzel-Struktur wird gestartet...');
                    
                    // Redirect to home
                    router.push('/home');
                } else {
                    throw new Error('No session token returned');
                }
            } catch (err) {
                console.error('[PlaygroundPage] Initialization failed:', err);
                setStatus('error');
                toast.error('Verbindung zum Website-HQ fehlgeschlagen.');
            }
        }

        void initPlayground();
    }, [router]);

    return (
        <main className="min-h-screen bg-[#05040d] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] animate-pulse delay-700" />

            <div className="relative z-10 max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="relative h-20 w-20">
                        <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20 blur-md" />
                        <div className="flex h-full w-full items-center justify-center rounded-full border border-cyan-500/30 bg-black/40">
                            {status === 'initializing' ? (
                                <Loader2 className="animate-spin text-cyan-400" size={32} />
                            ) : status === 'success' ? (
                                <div className="h-4 w-4 rounded-full bg-emerald-400 animate-pulse" />
                            ) : (
                                <span className="text-red-400 text-2xl font-bold">!</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 font-medium">SAIMÔR OS</p>
                    <h1 className="text-3xl font-light tracking-wide text-white">Website-HQ betreten</h1>
                    <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
                        {status === 'initializing' && 'Der oeffentliche Playground / Website-HQ wird initialisiert. Bitte warten...'}
                        {status === 'success' && 'Workspace bereit. Du wirst weitergeleitet...'}
                        {status === 'error' && 'Das Website-HQ konnte nicht erreicht werden. Bitte versuche es spaeter noch einmal.'}
                    </p>
                </div>

                {status === 'error' && (
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                        Erneut versuchen
                    </button>
                )}
            </div>
        </main>
    );
}
