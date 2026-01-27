import React, { useState, useEffect } from 'react';
import { Mail, Briefcase, Calendar, Check, Loader2, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';

// We fetch credentials status from backend
const API_BASE = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8081';

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
        { id: 'gmail', name: 'Gmail', icon: Mail, connected: false, description: 'IMAP Integration active' },
        { id: 'drive', name: 'Google Drive', icon: Briefcase, connected: false, description: 'Coming Soon' }, // Placeholder
        { id: 'calendar', name: 'Calendar', icon: Calendar, connected: false, description: 'Coming Soon' }, // Placeholder
    ]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch real status from backend
    const checkStatus = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('saimor_token') || localStorage.getItem('saimor_dev_token') || '';
            const res = await fetch(`${API_BASE}/v1/integrations/gmail/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            setServices(prev => prev.map(s => {
                if (s.id === 'gmail') {
                    if (data.status === 'connected') {
                        return {
                            ...s,
                            connected: true,
                            details: `Connected as ${data.user}`,
                            error: undefined
                        };
                    } else {
                        return {
                            ...s,
                            connected: false,
                            details: undefined,
                            error: data.message || 'Not configured in backend (ENV)'
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
            toast.info("Gmail Integration uses Server Environment Variables.", {
                description: "Please configure EMAIL_IMAP_* in .env file."
            });
            checkStatus(); // Re-check in case user updated backend and restarted
        } else {
            toast.info("This integration is coming soon.");
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
                Gmail/IMAP is configured via server environment variables (`EMAIL_IMAP_...`).
                Update your `.env` file and restart the core to connect.
            </div>
        </div>
    );
};
