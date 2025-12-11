"use client";

import React, { useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { AlertTriangle } from 'lucide-react';

/**
 * CoreLayer - Landing view for the Core/Home state
 * 
 * NOTE: The MoraOrb is now rendered by MoraOrbController (single source of truth)
 * This layer only shows the status text and instructions.
 */
export const CoreLayer: React.FC = () => {
    const {
        isLoadingDepartments,
        coreError,
        loadDepartments
    } = useMoraStore();

    useEffect(() => {
        // Load departments for sidebar
        loadDepartments();
    }, [loadDepartments]);

    return (
        <div className="relative w-full h-full flex items-center justify-center">

            {/* Status Text (below the controller-managed Orb) */}
            <div className="relative z-10 mt-48 text-center w-96">
                <h1 className="text-4xl font-light tracking-[0.3em] text-emerald-50 mb-3">MÔRA</h1>
                <p className="text-xs text-emerald-400/50 tracking-widest uppercase">
                    {isLoadingDepartments ? 'Initializing System...' : (coreError ? 'Connection Error' : 'System Online')}
                </p>
                {coreError && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-red-400/80 text-xs bg-red-900/20 p-3 rounded border border-red-500/20">
                        <AlertTriangle size={14} />
                        <span>{coreError}</span>
                    </div>
                )}
            </div>

            {/* Subtle Instructions */}
            <div className="absolute bottom-20 text-center text-emerald-500/30 text-xs tracking-widest uppercase">
                <p>← Select a department from the sidebar to begin</p>
            </div>
        </div>
    );
};
