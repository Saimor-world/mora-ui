'use client';

import { create } from 'zustand';

export interface MailArrivalPrompt {
    id: string;
    from: string;
    subject: string;
}

interface MailPromptState {
    prompt: MailArrivalPrompt | null;
    setPrompt: (prompt: MailArrivalPrompt) => void;
    dismissPrompt: () => void;
}

export const useMailPromptStore = create<MailPromptState>((set) => ({
    prompt: null,
    setPrompt: (prompt) => set({ prompt }),
    dismissPrompt: () => set({ prompt: null }),
}));
