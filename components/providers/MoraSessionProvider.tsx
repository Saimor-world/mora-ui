"use client";

import { SessionProvider } from "next-auth/react";

export const MoraSessionProvider = ({ children }: { children: React.ReactNode }) => {
    return <SessionProvider>{children}</SessionProvider>;
};
