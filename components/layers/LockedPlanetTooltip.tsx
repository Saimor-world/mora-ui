'use client';

import React from 'react';
import { Lock, X } from 'lucide-react';

interface LockedPlanetTooltipProps {
    name: string;
    description?: string;
    onDismiss: () => void;
}

/**
 * LockedPlanetTooltip -- shown when a non-member clicks a Visible-classified planet.
 *
 * Spec (Section 4, "Interaction outcome for locked planets"):
 * - Shows department name and description
 * - Shows membership-required message
 * - No "request access" button in Phase 1 (future enhancement)
 * - Information without action: user knows why they cannot enter
 */
export const LockedPlanetTooltip: React.FC<LockedPlanetTooltipProps> = ({
    name,
    description,
    onDismiss,
}) => (
    <div
        className="absolute z-50 bg-[#0e1117]/95 border border-white/10 rounded-xl p-4 shadow-xl max-w-xs backdrop-blur-sm"
        role="dialog"
        aria-label={`Zugriff auf ${name}`}
    >
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
                <Lock size={14} className="text-white/40 mt-0.5 shrink-0" />
                <div>
                    <div className="text-sm font-medium text-white">{name}</div>
                    {description && (
                        <div className="text-xs text-white/50 mt-0.5">{description}</div>
                    )}
                </div>
            </div>
            <button
                onClick={onDismiss}
                className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                aria-label="Schließen"
            >
                <X size={14} />
            </button>
        </div>
        <p className="text-xs text-white/40 mt-3">
            Mitgliedschaft erforderlich, um diese Abteilung zu öffnen.
            Wende dich an einen Administrator.
        </p>
    </div>
);
