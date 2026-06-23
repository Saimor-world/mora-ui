import React from 'react';
import { IdentityMedallion } from '@/components/os/shell/IdentityMedallion';

/**
 * Full-screen boot/loading state for the OS shell.
 * Extracted verbatim from MoraShell.tsx — behavior-neutral.
 */
export const LoadingScreen: React.FC = () => (
    <div className="relative w-full h-screen bg-gradient-to-b from-[#1a1135] to-[#0d0921] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.14),rgba(13,9,33,0)_40%)]" />
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <IdentityMedallion
                    name="Demo"
                    role="system_owner"
                    size={64}
                    className="drop-shadow-[0_0_24px_rgba(16,185,129,0.18)]"
                />
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-emerald-400/60 text-xs font-medium tracking-[0.4em] uppercase">
                    SAIMÔR OS
                </span>
                <span className="text-white/20 text-[10px] tracking-[0.2em]">
                    Mora erwacht...
                </span>
            </div>
            {/* Loading bar */}
            <div className="w-32 h-[2px] rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-emerald-500/40 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
                    style={{
                        animation: 'loading 1.5s ease-in-out infinite',
                    }}
                />
            </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-6">
            <div className="h-px w-[min(42rem,58vw)] bg-gradient-to-r from-transparent via-emerald-400/26 to-transparent" />
        </div>
        <style jsx>{`
            @keyframes loading {
                0% { width: 0%; margin-left: 0; }
                50% { width: 60%; margin-left: 20%; }
                100% { width: 0%; margin-left: 100%; }
            }
        `}</style>
    </div>
);

/**
 * Full-screen connection-error state with diagnostics + retry.
 * Extracted verbatim from MoraShell.tsx — behavior-neutral.
 */
export const ErrorScreen: React.FC<{ message: string; onReauth?: () => void }> = ({ message, onReauth }) => {
    const [retrying, setRetrying] = React.useState(false);

    const handleRetry = () => {
        setRetrying(true);
        setTimeout(() => window.location.reload(), 1500);
    };

    return (
        <div className="w-full h-screen bg-gradient-to-b from-[#0d0921] to-[#080618] flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center px-6 max-w-lg">
                {/* Error Orb */}
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-red-500/5 border border-red-500/20 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                        </div>
                    </div>
                    <div className="absolute -inset-4 rounded-full bg-red-500/5 blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
                </div>

                <div className="space-y-2">
                    <div className="text-red-400/80 text-xs tracking-[0.4em] uppercase font-medium">
                        {onReauth ? 'Anmeldung erforderlich' : 'Verbindung unterbrochen'}
                    </div>
                    <div className="text-white/60 text-sm leading-relaxed">
                        {message}
                    </div>
                </div>

                {/* Help Section */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 w-full space-y-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Diagnose</div>
                    <div className="space-y-2 text-left">
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0" />
                            <div className="text-xs text-white/40">
                                API-Endpunkt: <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400/70 font-mono text-[10px]">{process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || process.env.NEXT_PUBLIC_CORE_API_URL || 'api.saimor.world'}</code>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0" />
                            <div className="text-xs text-white/40">
                                Netzwerkverbindung prüfen und Seite neu laden
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0" />
                            <div className="text-xs text-white/40">
                                Hält das Problem an, bitte Support kontaktieren
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recovery actions */}
                <div className="flex flex-col items-center gap-2.5 w-full">
                    {onReauth && (
                        <button
                            onClick={onReauth}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300/90 text-xs tracking-[0.15em] uppercase hover:bg-emerald-500/25 hover:border-emerald-500/40 transition-all"
                        >
                            Neu anmelden
                        </button>
                    )}
                    <button
                        onClick={handleRetry}
                        disabled={retrying}
                        className={`px-6 py-2.5 rounded-xl border text-xs tracking-[0.15em] uppercase transition-all disabled:opacity-40 disabled:cursor-wait ${
                            onReauth
                                ? 'bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/70'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/80 hover:bg-emerald-500/20 hover:border-emerald-500/30'
                        }`}
                    >
                        {retrying ? 'Verbinde...' : 'Erneut verbinden'}
                    </button>
                </div>

                <div className="text-[9px] text-white/15 tracking-[0.3em] uppercase">SAIMÔR OS • Mora Core</div>
            </div>
        </div>
    );
};
