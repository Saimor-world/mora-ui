'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, User, ShieldCheck } from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';
import { clearWebsiteEntryActiveContext } from '@/lib/websiteEntryStorage';
import { useNavStore } from '@/lib/store/navStore';
import { getQueryClient } from '@/lib/queryClient';

export default function PlaygroundPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try { clearWebsiteEntryActiveContext(); } catch {}

        // ── Audit session fast-path ──────────────────────────────────────────
        // When arriving from saimor.world after a security scan, the URL contains
        // audit_session (the playground token) and node (the dossier node ID).
        // We skip the email form entirely and set the session directly.
        const params = new URLSearchParams(window.location.search);
        const auditSession = params.get('audit_session');
        const nodeId = params.get('node');

        if (auditSession) {
            useNavStore.getState().setActiveMode('public_playground');
            localStorage.setItem('saimor_active_mode', 'public_playground');
            localStorage.setItem('saimor_playground_session', auditSession);
            // Clear any cached 401 from a previous unauthenticated profile fetch
            try { getQueryClient().clear(); } catch {}
            localStorage.setItem('saimor_tenant', 'tenant-public-playground');
            localStorage.setItem('saimor_role', 'demo');
            localStorage.removeItem('last_company_id');

            const destination = nodeId
                ? `/home?open_node=${encodeURIComponent(nodeId)}`
                : '/home';
            router.push(destination);
            return;
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !email.includes('@') || !email.includes('.')) {
            toast.error('Bitte gib eine gültige E-Mail-Adresse ein.');
            return;
        }

        setStatus('initializing');
        try {
            // Get or generate visitor_id
            let visitorId = localStorage.getItem('saimor_visitor_id');
            if (!visitorId) {
                visitorId = `visitor_${Math.random().toString(36).substring(2, 10)}`;
                localStorage.setItem('saimor_visitor_id', visitorId);
            }

            // Call guest session endpoint
            const res = await corePost('/v3/playground/guest-session', {
                email: email.trim().toLowerCase(),
                visitor_id: visitorId,
                visitor_name: name.trim() || 'Gast'
            }, { skipAuth: true });

            if (res && res.session_token) {
                useNavStore.getState().setActiveMode('public_playground');
                localStorage.setItem('saimor_active_mode', 'public_playground');  // ← CRITICAL: coreRequest reads this
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
    };

    return (
        <main className="min-h-screen bg-[#05040d] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] animate-pulse delay-700" />

            <div className="relative z-10 max-w-md w-full">
                {status === 'initializing' || status === 'success' ? (
                    <div className="text-center space-y-8 py-12">
                        <div className="flex justify-center">
                            <div className="relative h-20 w-20">
                                <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20 blur-md" />
                                <div className="flex h-full w-full items-center justify-center rounded-full border border-cyan-500/30 bg-black/40">
                                    {status === 'initializing' ? (
                                        <Loader2 className="animate-spin text-cyan-400" size={32} />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full bg-emerald-400 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 font-medium">SAIMÔR OS</p>
                            <h1 className="text-3xl font-light tracking-wide text-white">Website-HQ betreten</h1>
                            <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
                                {status === 'initializing' ? 'Der öffentliche Playground / Website-HQ wird initialisiert. Bitte warten...' : 'Workspace bereit. Du wirst weitergeleitet...'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card rounded-[24px] border border-white/[0.08] bg-black/40 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl space-y-8 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500/30 via-violet-500/20 to-emerald-500/30" />

                        <div className="space-y-3 text-center">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 mb-2">
                                <ShieldCheck size={24} />
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-semibold">SAIMÔR OS</p>
                            <h1 className="text-2xl font-light tracking-wide text-white">Betritt das SAIMÔR Public HQ</h1>
                            <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                                Gib deine E-Mail ein, um den öffentlichen Demo-Raum zu öffnen und die Myzel-Struktur des Systems zu erkunden.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.15em] text-white/50 block font-medium">Name (optional)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                        <User size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Gast"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.15em] text-white/50 block font-medium">E-Mail-Adresse</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                        <Mail size={16} />
                                    </span>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@firma.de"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06] transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-sm font-medium text-cyan-200 tracking-wide hover:bg-cyan-500/30 hover:border-cyan-500/40 active:scale-[0.98] transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                            >
                                Zugang zum Website-HQ
                            </button>
                        </form>

                        {status === 'error' && (
                            <div className="text-center">
                                <p className="text-xs text-red-400 mb-3">Die Initialisierung ist fehlgeschlagen.</p>
                                <button
                                    type="button"
                                    onClick={() => setStatus('idle')}
                                    className="text-xs text-white/50 underline hover:text-white transition-colors"
                                >
                                    Zurück zum Formular
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
