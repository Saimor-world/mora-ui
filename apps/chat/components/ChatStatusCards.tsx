'use client';

import React from 'react';
import { Sparkles, WifiOff, RefreshCw } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useDepartments } from '@/lib/queries/useDepartments';

// ─── SetupRequiredCard ────────────────────────────────────────────────────────

interface SetupRequiredCardProps {
    onOpenSettings?: () => void;
}

export function SetupRequiredCard({ onOpenSettings }: SetupRequiredCardProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 mx-4 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/10">
                <Sparkles className="h-5 w-5 text-amber-300/80" />
            </div>
            <p className="text-sm font-medium text-white/80">
                Mora ist noch nicht eingerichtet
            </p>
            <p className="text-xs text-white/45 max-w-[300px] leading-relaxed">
                Erstelle oder verknüpfe dein Unternehmen in den Einstellungen, damit Mora in deinem Organisationskontext arbeiten kann.
            </p>
            {onOpenSettings && (
                <button
                    id="chat-setup-settings"
                    data-agency-id="chat-setup-settings"
                    onClick={onOpenSettings}
                    className="mt-1 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-400/25 text-xs text-amber-200/80 hover:bg-amber-500/25 hover:border-amber-400/40 transition-all"
                >
                    Einstellungen öffnen
                </button>
            )}
        </div>
    );
}

// ─── InputLoadingPlaceholder ──────────────────────────────────────────────────

export function InputLoadingPlaceholder() {
    return (
        <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 animate-pulse">
                <div className="flex-1 h-12 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                <div className="w-16 h-12 rounded-xl bg-white/[0.03] border border-white/[0.05]" />
            </div>
        </div>
    );
}

// ─── OfflineCard ─────────────────────────────────────────────────────────────

export function OfflineCard({ onRetry }: { onRetry?: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.02] text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <WifiOff className="h-5 w-5 text-white/40" />
            </div>
            <p className="text-sm font-medium text-white/60">
                Mora ist nicht erreichbar
            </p>
            <p className="text-xs text-white/30 max-w-[280px] leading-relaxed">
                Das Backend antwortet nicht. Stelle sicher, dass CORE läuft (Port 8081).
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 hover:text-white/70 transition-all"
                >
                    <RefreshCw size={12} />
                    Erneut versuchen
                </button>
            )}
        </div>
    );
}

// ─── Context-Aware Chat Suggestions ───
export const ChatSuggestions: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
    const { viewLevel, activeDepartmentId, activeCompanyId } = useNavStore();
    const orbState = useOrbStore((s) => s.orbState);
    const { data: departments } = useDepartments(activeCompanyId);
    const safeDepartments = React.useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

    const suggestions = React.useMemo(() => {
        const dept = safeDepartments.find(d => d.id === activeDepartmentId);

        if (viewLevel === 'folder' || viewLevel === 'space') {
            return [
                'Fasse diesen Bereich zusammen',
                'Was fehlt hier noch?',
                dept ? `Zurück zu ${dept.name}` : 'Übersicht zeigen',
            ];
        }
        if (viewLevel === 'department' && dept) {
            return [
                `Was gibt es Neues in ${dept.name}?`,
                'Welche Dokumente sind wichtig?',
                'Zeig mir alle Spaces',
            ];
        }
        if (orbState === 'alert') {
            return [
                'Was braucht Aufmerksamkeit?',
                'Zeig mir die Alerts',
                'Status Report',
            ];
        }
        // Default / Core level
        const firstDept = safeDepartments[0]?.name;
        return [
            firstDept ? `Zeig mir ${firstDept}` : 'Zeig mir die Abteilungen',
            'Was gibt es Neues?',
            'Hilf mir beim Organisieren',
        ];
    }, [viewLevel, safeDepartments, activeDepartmentId, orbState]);

    return (
        <div className="flex gap-2 mt-2 flex-wrap">
            {suggestions.map((suggestion) => (
                <button
                    key={suggestion}
                    onClick={() => onSelect(suggestion)}
                    className="text-xs px-3 py-1.5 bg-violet-500/5 hover:bg-violet-500/15 border border-violet-500/20 rounded-full text-violet-100/60 hover:text-violet-300 transition-all duration-200"
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
};

// Memoize so parent stream re-renders don't re-run this subtree
export const ChatSuggestionsMemo = React.memo(ChatSuggestions);
