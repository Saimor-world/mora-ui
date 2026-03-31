'use client';

export const SAIMOR_COMMAND_DECK_EVENT = 'saimor-command-deck';

export interface CommandDeckRequestDetail {
    pinned?: boolean;
}

export const requestCommandDeckOpen = (detail: CommandDeckRequestDetail = {}) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SAIMOR_COMMAND_DECK_EVENT, { detail }));
};
