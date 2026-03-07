"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, ShieldAlert, FileCheck } from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';

interface IntakeContext {
    suggested_category?: string;
    suggested_location?: string;
    detected_patterns?: string[];
    business_summary?: string;
}

interface PendingAction {
    tool_name: string;
    params: Record<string, any>;
    risk_level: string;
    confirmation_token: string;
    action_id: string;
    confirm_endpoint?: string;
    confirm_payload?: Record<string, any>;
    // P6: Guided Intake
    intake_context?: IntakeContext;
}

interface Props {
    action: PendingAction;
    onConfirmed: (result: any) => void;
    onRejected: () => void;
    onDismiss?: () => void;  // P6: "Später" dismisses UI without policy reject
    variant?: 'default' | 'intake';  // P6: Guided Intake variant
}

export const ConfirmationCard: React.FC<Props> = ({ action, onConfirmed, onRejected, onDismiss, variant }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    // P6: Auto-detect intake variant if intake_context is present
    const isIntake = variant === 'intake' || !!action.intake_context;
    const intake = action.intake_context;

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            const endpoint = action.confirm_endpoint || "/v3/actions/execute";
            const payload = action.confirm_payload || {
                tool_name: action.tool_name,
                params: action.params,
                confirmation_token: action.confirmation_token,
                trace_id: action.action_id
            };

            const res = await corePost(endpoint, payload);
            const success =
                (typeof res?.success === 'boolean' && res.success) ||
                res?.status === 'executed' ||
                res?.confirmed === true ||
                res?.result;

            if (success) {
                toast.success(isIntake ? "Eingeordnet" : "Action approved.");
                if (typeof window !== 'undefined' && action.tool_name === 'create_node_from_file') {
                    window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                    // P6: Timeline event for intake completion
                    window.dispatchEvent(new CustomEvent('mora:agency-update', {
                        detail: {
                            type: 'action',
                            status: 'complete',
                            intent: 'intake',
                            message: intake?.business_summary || 'Erfolgreich eingeordnet'
                        }
                    }));
                }
                onConfirmed(res?.data || res?.result || res);
            } else {
                toast.error("Action failed. Nothing was created.");
                console.error("Confirmation failed:", res);
            }
        } catch (e) {
            console.error("Confirmation failed", e);
            toast.error("Action failed. Nothing was created.");
        } finally {
            setIsProcessing(false);
        }
    };

    // P6: Handle "Später" - dismiss UI without policy reject
    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        } else {
            // Fallback: just clear the UI, pending stays pending
            onRejected();
        }
    };

    // P6: Intake Variant - Calm Competence design
    if (isIntake && intake) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden"
            >
                {/* Header - Neutral, not alarming */}
                <div className="px-4 py-3 flex items-start gap-3">
                    <FileCheck className="text-white/60 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-white font-medium text-sm">
                            {intake.business_summary}
                        </p>
                        <p className="text-white/50 text-xs mt-1">
                            Vorschlag: {intake.suggested_location}
                        </p>
                        {intake.detected_patterns && intake.detected_patterns.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                                {intake.detected_patterns.map((pattern, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-white/40 border border-white/5"
                                    >
                                        {pattern}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions - Neutral styling */}
                <div className="flex items-center gap-2 p-3 border-t border-white/5">
                    {/* Später = UI dismiss, NOT Policy-Reject */}
                    <button
                        onClick={handleDismiss}
                        disabled={isProcessing}
                        className="text-white/40 hover:text-white/60 text-xs font-medium transition-colors px-3 py-2"
                    >
                        Später
                    </button>
                    <div className="flex-1" />
                    {/* Primary action - dezent, nicht grün */}
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check size={14} />
                        )}
                        Einordnen
                    </button>
                </div>
            </motion.div>
        );
    }

    // Default variant - Original security warning style
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="bg-red-500/10 px-4 py-3 flex items-start gap-3">
                <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="text-red-200 text-sm font-medium">Sicherheits-Warnung</h4>
                    <p className="text-[10px] text-red-300/60 uppercase tracking-widest mt-0.5">
                        Mutation {action.risk_level} - Autorisierung erforderlich
                    </p>
                </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-emerald-500/60">
                    <span className="uppercase tracking-wide">Aktion</span>
                    <span className="font-mono text-emerald-100">{action.tool_name}</span>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-[10px] uppercase text-emerald-500/40 mb-1">Parameter</div>
                    <pre className="text-xs font-mono text-emerald-500/80 whitespace-pre-wrap">
                        {JSON.stringify(action.params, null, 2)}
                    </pre>
                </div>

                <div className="text-xs text-emerald-200/60 italic leading-relaxed">
                    Diese Aktion veraendert Daten im System. Bitte bestaetigen Sie, dass Sie dies ausfuehren moechten.
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 p-3 bg-black/20 border-t border-white/5">
                <button
                    onClick={onRejected}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-medium"
                >
                    Abbrechen
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-red-200 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                        <Check size={14} />
                    )}
                    Genehmigen
                </button>
            </div>
        </motion.div>
    );
};

