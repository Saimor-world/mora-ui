"use client";

import { SessionProvider } from "next-auth/react";

export const MoraSessionProvider = ({ children }: { children: React.ReactNode }) => {
    // refetchInterval=0 + refetchOnWindowFocus=false: prevent polling spam in
    // the browser console when the backend is not reachable locally.
    return (
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
            {children}
        </SessionProvider>
    );
};
