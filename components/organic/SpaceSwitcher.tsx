'use client';

import React from 'react';
import { Layers, Plus } from 'lucide-react';
import type { Space } from '@/lib/types/spaces';

interface SpaceSwitcherProps {
    spaces: Space[];
    currentSpace: string | null;
    onSpaceChange: (spaceId: string | null) => void;
    onCreateSpace: () => void;
    loading?: boolean;
}

export const SpaceSwitcher: React.FC<SpaceSwitcherProps> = ({
    spaces,
    currentSpace,
    onSpaceChange,
    onCreateSpace,
    loading = false
}) => {
    if (loading) {
        return (
            <div className="flex items-center gap-2 px-4 py-3 text-emerald-500/50 text-sm">
                <Layers className="w-4 h-4 animate-pulse" />
                <span>Loading spaces...</span>
            </div>
        );
    }

    const isOffline = !loading && spaces.length === 0;

    return (
        <div className="px-3 py-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-mora-gold uppercase">
                    <Layers className="w-3 h-3" />
                    <span>Spaces</span>
                </div>
                <button
                    onClick={onCreateSpace}
                    className="flex items-center justify-center w-5 h-5 rounded bg-white/5 hover:bg-mora-gold/20 transition-colors text-emerald-400/50 hover:text-mora-gold"
                    title="Create Space"
                >
                    <Plus className="w-3 h-3" />
                </button>
            </div>

            {/* Space List */}
            <ul className="space-y-1">
                <li
                    onClick={() => onSpaceChange(null)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${currentSpace === null
                            ? 'bg-mora-gold/15 text-mora-gold font-medium'
                            : 'text-emerald-400/70 hover:bg-white/5 hover:text-emerald-200'
                        }`}
                >
                    <span className="text-base flex-shrink-0">🌐</span>
                    <span className="flex-1 truncate">All Spaces</span>
                </li>

                {isOffline && (
                    <li className="px-3 py-2 text-xs text-emerald-500/40 italic">
                        API offline
                    </li>
                )}

                {spaces.map((space) => (
                    <li
                        key={space.id}
                        onClick={() => onSpaceChange(space.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm border-l-2 ${currentSpace === space.id
                                ? 'bg-mora-gold/15 text-mora-gold font-medium'
                                : 'text-emerald-400/70 hover:bg-white/5 hover:text-emerald-200 border-transparent'
                            }`}
                        style={{
                            borderLeftColor: currentSpace === space.id ? (space.color || '#CEB676') : 'transparent'
                        }}
                    >
                        <span className="text-base flex-shrink-0">{space.icon || '📁'}</span>
                        <span className="flex-1 truncate">{space.name}</span>
                        {space.is_default && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-mora-gold/20 text-mora-gold rounded">
                                Default
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};
