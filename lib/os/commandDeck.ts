'use client';

export const SAIMOR_COMMAND_DECK_EVENT = 'saimor-command-deck';
export const SAIMOR_COMMAND_DECK_STATE_EVENT = 'saimor-command-deck-state';

export interface CommandDeckRequestDetail {
    pinned?: boolean;
}

export interface CommandDeckStateDetail {
    open: boolean;
    pinned?: boolean;
}

export const requestCommandDeckOpen = (detail: CommandDeckRequestDetail = {}) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SAIMOR_COMMAND_DECK_EVENT, { detail }));
};

export const publishCommandDeckState = (detail: CommandDeckStateDetail) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SAIMOR_COMMAND_DECK_STATE_EVENT, { detail }));
};
