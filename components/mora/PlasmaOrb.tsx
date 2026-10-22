/**
 * PlasmaOrb - MÔRA's body in dock, popups, search, spotlight and rooms.
 *
 * Since the stylebook decision of 22.10.2026 it draws the one MÔRA component
 * (components/mora/MoraStone). Name and props stay so every caller keeps working;
 * `color` no longer tints anything (stylebook: matte, no glow) and `state` only
 * switches the stone to its thinking look and sets data-orb-state.
 */

import React from 'react';
import { MoraStone } from '@/components/mora/MoraStone';

interface PlasmaOrbProps {
    color: string;
    state: 'idle' | 'thinking' | 'alert' | 'focus' | 'demo' | 'curious' | 'learning' | 'insight';
    size?: number;
    onClick?: () => void;
}

export const PlasmaOrb: React.FC<PlasmaOrbProps> = ({ state, size = 120, onClick }) => (
    <div
        className="relative flex cursor-pointer select-none items-center justify-center"
        style={{ width: size, height: size }}
        onClick={onClick}
        data-orb-state={state}
    >
        <MoraStone size={size} thinking={state === 'thinking' || state === 'learning'} label="MÔRA" />
    </div>
);
