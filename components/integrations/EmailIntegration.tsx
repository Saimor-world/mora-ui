'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Check, X, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { coreGet, corePost, coreDelete } from '@/lib/api/coreClient';
import { toast } from 'sonner';
import { broadcastCommunicationSync } from '@/lib/integrations/communicationEvents';
import { useIntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';

interface MailIntegrationStatus {
    configured: boolean;
    enabled: boolean;
    provider?: string;
    email?: string;
    status: string;
}

const PROVIDERS = [
    { id: 'gmail', name: 'Gmail' },
    { id: 'outlook', name: 'Outlook/Office 365' },
    { id: 'custom', name: 'Custom IMAP' }
];

export const EmailIntegration: React.FC = () => {
    const [status, setStatus] = useState<MailIntegrationStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [provider, setProvider] = useState('gmail');
    const [email, setEmail] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [customHost, setCustomHost] = useState('');
    const [customPort, setCustomPort] = useState('993');
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const { overview } = useIntegrationsOverview();

    useEffect(() => {
        loadStatus();
    }, []);

    const isLocalMode = status?.status === 'local';
    const mailSetup = overview?.setup?.mail;
    const requiredFields = Array.isArray(mailSetup?.required_fields) ? mailSetup.required_fields : [];
    const optionalFields = Array.isArray(mailSetup?.optional_fields) ? mailSetup.optional_fields : [];
    const providerOptions = Array.isArray(mailSetup?.provider_options) ? mailSetup.provider_options : [];

    const loadStatus = async () => {
        try {
            const data = await coreGet('/v3/integrations/mail');
            setStatus(data);
            if (data?.configured) {
                setEmail(data.email || '');
                setProvider(data.provider || 'gmail');
            }
        } catch (e) {
            console.error('Failed to load mail status:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!email || !appPassword) {
            toast.error('E-Mail und App-Passwort erforderlich');
            return;
        }

        setIsSaving(true);
        try {
            await corePost('/v3/integrations/mail', {
                provider,
                email,
                app_password: appPassword,
                host: provider == 'custom' ? customHost : undefined,
                port: provider == 'custom' ? parseInt(customPort, 10) : undefined,
            });

            toast.success('E-Mail-Integration gespeichert');
            setAppPassword('');
            await loadStatus();
            broadcastCommunicationSync('mail-config-save');
        } catch (e: any) {
            toast.error(e.message || 'Speichern fehlgeschlagen');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        try {
            const result = await corePost('/v3/integrations/mail/test', {});
            if (result?.success) {
                toast.success(`Verbindung erfolgreich (${result.inbox_count || 0} Nachrichten)`);
            } else {
                toast.error(`Verbindung fehlgeschlagen: ${result?.message || 'Unbekannter Fehler'}`);
            }
        } catch (e: any) {
            toast.error('Test fehlgeschlagen');
        } finally {
            setIsTesting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await coreDelete('/v3/integrations/mail');
            toast.success('E-Mail-Integration entfernt');
            setEmail('');
            setAppPassword('');
            setConfirmingDelete(false);
            await loadStatus();
            broadcastCommunicationSync('mail-config-delete');
        } catch (e) {
            toast.error('Entfernen fehlgeschlagen');
            setConfirmingDelete(false);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse p-6 rounded-xl bg-white/5">
                <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                <div className="h-32 bg-white/5 rounded" />
            </div>
        );
    }

    if (status?.status === 'forbidden_demo' || status?.status === 'owner_only') {
        return (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 text-white/60">
                    <AlertCircle size={20} />
                    <span>E-Mail-Integration ist nur für Eigentümer verfügbar.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Mail className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h4 className="text-white font-medium">E-Mail-Verbindung</h4>
                        <p className="text-xs text-white/40">Postfach verbinden</p>
                    </div>
                </div>

                {status?.configured && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} /> Verbunden
                        </span>
                    </div>
                )}
            </div>

            {isLocalMode && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                    Lokaler Postfach-Modus aktiv. IMAP-Synchronisation ist auf diesem Server deaktiviert.
                </div>
            )}

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-5">
                {(!status?.configured || isLocalMode) && (
                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/8 px-4 py-3 text-xs text-emerald-100/85">
                        <div className="font-medium text-emerald-100">Lokale Mail-Einrichtung</div>
                        <p className="mt-1 leading-relaxed text-emerald-100/75">
                            {mailSetup?.detail || 'Diese Verbindung wird direkt im OS gespeichert und danach von Mail, Home und Mora genutzt.'}
                        </p>
                        <p className="mt-2 text-[11px] text-emerald-100/60">
                            Diese Mail-Verbindung wird pro Nutzer gespeichert. Das App-Passwort liegt verschluesselt im Nutzerkontext, nicht global im Core-Env.
                        </p>
                        {providerOptions.length > 0 && (
                            <p className="mt-2 text-emerald-100/70">
                                Anbieter: <span className="text-emerald-50">{providerOptions.join(' / ')}</span>
                            </p>
                        )}
                        {requiredFields.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {requiredFields.map((field) => (
                                    <span key={field} className="rounded-full border border-emerald-400/20 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-100/75">
                                        {field}
                                    </span>
                                ))}
                            </div>
                        )}
                        {optionalFields.length > 0 && (
                            <p className="mt-2 text-[11px] text-emerald-100/60">
                                Optional: {optionalFields.join(' / ')}
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-white/40">Anbieter</label>
                    <div className="flex gap-3">
                        {PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setProvider(p.id)}
                                className={`flex-1 p-3 rounded-lg border text-sm transition-all ${provider === p.id
                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {provider === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">IMAP Host</label>
                            <input
                                type="text"
                                value={customHost}
                                onChange={(e) => setCustomHost(e.target.value)}
                                placeholder="imap.example.com"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">Port</label>
                            <input
                                type="text"
                                value={customPort}
                                onChange={(e) => setCustomPort(e.target.value)}
                                placeholder="993"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs text-white/40">E-Mail-Adresse</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-white/40">App-Passwort</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={appPassword}
                            onChange={(e) => setAppPassword(e.target.value)}
                            placeholder={status?.configured ? '********' : 'App-Passwort eingeben'}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">
                        Zugangsdaten werden verschlüsselt gespeichert und niemals im Klartext angezeigt.
                    </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !email || !appPassword}
                        className="flex-1 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        Speichern
                    </button>

                    {status?.configured && !confirmingDelete && (
                        <>
                            <button
                                onClick={handleTest}
                                disabled={isTesting || isLocalMode}
                                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Testen
                            </button>

                            <button
                                onClick={() => setConfirmingDelete(true)}
                                disabled={isLocalMode}
                                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <X size={14} />
                            </button>
                        </>
                    )}

                    {status?.configured && confirmingDelete && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white/50">Wirklich entfernen?</span>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors"
                            >
                                Entfernen
                            </button>
                            <button
                                onClick={() => setConfirmingDelete(false)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors"
                            >
                                Abbrechen
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

