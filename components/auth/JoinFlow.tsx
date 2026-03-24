'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Building2, Users } from 'lucide-react';
import { fetchInvite, acceptInvite, type InviteDetails } from '@/lib/api/inviteClient';

interface JoinFlowProps {
    token: string;
    onComplete: () => void;
}

/**
 * JoinFlow -- multi-step employee onboarding experience.
 *
 * Spec (Section 6, "Employee Onboarding"):
 * User opens invite -> sees company/departments -> registers credentials -> lands in universe.
 *
 * Company setup (OnboardingWizard) is a separate, distinct flow.
 * This handles employee onboarding only.
 */
export const JoinFlow: React.FC<JoinFlowProps> = ({ token, onComplete }) => {
    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchInvite(token).then((result) => {
            setLoading(false);
            if (!result) {
                setError('Einladung ungültig oder abgelaufen.');
            } else {
                setInvite(result);
            }
        });
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite || !displayName || !password) return;
        setSubmitting(true);
        const result = await acceptInvite(token, { display_name: displayName, password });
        setSubmitting(false);
        if (!result) {
            setError('Registrierung fehlgeschlagen. Bitte erneut versuchen.');
        } else {
            onComplete();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={24} className="animate-spin text-white/40" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-8 max-w-md mx-auto">
            {/* Company context */}
            <div className="flex items-center gap-3">
                <Building2 size={20} className="text-white/40" />
                <div>
                    <div className="text-lg font-medium text-white">{invite!.company_name}</div>
                    {invite!.inviter_name && (
                        <div className="text-sm text-white/40">Eingeladen von {invite!.inviter_name}</div>
                    )}
                </div>
            </div>

            {/* Assigned departments */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-white/40">
                    <Users size={12} />
                    Deine Abteilungen
                </div>
                <div className="flex flex-wrap gap-2">
                    {invite!.assigned_departments.map((dept) => (
                        <span key={dept.id} className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-xs">
                            {dept.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Registration form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="display_name" className="text-xs text-white/40">
                        Name
                    </label>
                    <input
                        id="display_name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                        placeholder="Dein vollständiger Name"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="password" className="text-xs text-white/40">
                        Passwort
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                        placeholder="Mindestens 8 Zeichen"
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitting || !displayName || !password}
                    className="mt-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                    {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Beitreten'}
                </button>
            </form>
        </div>
    );
};
