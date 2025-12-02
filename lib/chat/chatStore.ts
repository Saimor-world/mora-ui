"use client";

import { create } from "zustand";

export type Channel = "team" | "personal" | "system";

export interface ChatMessage {
    id: string;
    channel: Channel;
    author: string;
    text: string;
    timestamp: number;
}

interface ChatState {
    activeChannel: Channel;
    messages: Record<Channel, ChatMessage[]>;
    setChannel: (c: Channel) => void;
    sendMessage: (channel: Channel, text: string, author?: string) => void;
}

const makeId = () => Math.random().toString(36).slice(2, 10);

const defaultMessages: Record<Channel, ChatMessage[]> = {
    team: [
        { id: makeId(), channel: "team", author: "System", text: "Welcome to the team channel.", timestamp: Date.now() },
    ],
    personal: [],
    system: [
        { id: makeId(), channel: "system", author: "Môra", text: "No new alerts. System stable.", timestamp: Date.now() },
    ],
};

export const useChatStore = create<ChatState>((set) => ({
    activeChannel: "team",
    messages: defaultMessages,
    setChannel: (c) => set({ activeChannel: c }),
    sendMessage: (channel, text, author = "You") =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channel]: [
                    ...(state.messages[channel] || []),
                    {
                        id: makeId(),
                        channel,
                        author,
                        text,
                        timestamp: Date.now(),
                    },
                ],
            },
        })),
}));
