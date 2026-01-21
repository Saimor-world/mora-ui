import React, { useState, useEffect } from 'react';
import { Mail, Check, Loader2, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';
import { coreGet } from '@/lib/api/coreClient';

interface GoogleService {
    id: string;
    name: string;
    icon: any;
    connected: boolean;
    description: string;
    details?: string; // e.g. connected email
    error?: string;
}

export const GoogleConnect: React.FC<{ onConnect?: () => void, compact?: boolean }> = ({ onConnect, compact = false }) => {
    const [services, setServices] = useState<GoogleService[]>([
        { id: 'gmail', name: 'Mail (IMAP)', icon: Mail, connected: false, description: 'Configure per-user mail access' }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch real status from backend
    const checkStatus = async () => {
        setIsLoading(true);
        try {
            const data = await coreGet('/v1/integrations/mail', { isOptional: true });

            setServices(prev => prev.map(s => {
                if (s.id === 'gmail') {
                    if (data?.status === 'configured') {
                        return {
                            ...s,
                            connected: true,
                            details: data.email ? `Connected as ${data.email}` : 'Connected',
                            error: undefined
                        };
                    } else {
                        return {
                            ...s,
                            connected: false,
                            details: undefined,
                            error: data?.status === 'owner_only'
                                ? 'Owner only'
                                : data?.status === 'forbidden_demo'
                                    ? 'Demo accounts disabled'
                                    : 'Not configured'
                        };
                    }
                }
                return s;
            }));

        } catch (err) {
            console.error('Failed to check Gmail status', err);
            toast.error('Could not reach backend');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const handleConnect = (serviceId: string) => {
        if (serviceId === 'gmail') {
            toast.info("Open Settings > Integrations to configure mail access.");
            checkStatus(); // Re-check in case user updated backend and restarted
        } else {
            toast.info("Integration not available.");
        }
    };

    return (
        <div className={`w-full ${compact ? '' : 'p-4'}`}>
            {!compact && (
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-light text-white flex items-center gap-2">
                            <span className="text-blue-400">Google Workspace</span> Integration
                        </h3>
                        <p className="text-sm text-white/50">Connect services for AI analysis.</p>
                    </div>
                    <button
                        onClick={checkStatus}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                        title="Refresh Status"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {services.map(service => (
                    <div
                        key={service.id}
                        className={`
                            relative overflow-hidden rounded-xl border transition-all duration-300
                            ${service.connected
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-white/5 border-white/10'}
                        `}
                    >
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${service.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                                    <service.icon size={20} />
                                </div>
                                <div>
                                    <div className={`font-medium ${service.connected ? 'text-emerald-100' : 'text-white/80'}`}>
                                        {service.name}
                                    </div>
                                    <div className="text-xs text-white/40">
                                        {service.connected ? service.details : (service.error ? <span className="text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> {service.error}</span> : service.description)}
                                    </div>
                                </div>
                            </div>

                            {service.connected ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                        <Check size={12} /> Live
                                    </span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleConnect(service.id)}
                                    className={`
                                        px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all
                                        bg-white/10 hover:bg-white/20 text-white hover:text-white border border-white/10
                                    `}
                                >
                                    Check Config
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-500/60 leading-relaxed">
                <strong className="block mb-1 text-blue-500/80">Configuration Note</strong>
                Mail access is configured per user in Settings {" > "} Integrations. Owner role required.
            </div>
        </div>
    );
};
