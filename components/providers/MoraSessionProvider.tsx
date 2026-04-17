"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Session } from "next-auth";
import type { SessionContextValue } from "next-auth/react";
import { SessionContext, SessionProvider } from "next-auth/react";
import { isLocalRuntimeHost, readLocalRuntimeSessionSnapshot } from "@/lib/auth/runtimeSession";

export const MoraSessionProvider = ({ children }: { children: React.ReactNode }) => {
    const [hasMounted, setHasMounted] = useState(false);
    const isLocal = typeof window !== "undefined" && isLocalRuntimeHost();
    const [snapshot, setSnapshot] = useState(() => readLocalRuntimeSessionSnapshot());

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!isLocal) return undefined;

        const refresh = () => {
            setSnapshot(readLocalRuntimeSessionSnapshot());
        };

        refresh();
        window.addEventListener("focus", refresh);
        window.addEventListener("storage", refresh);
        document.addEventListener("visibilitychange", refresh);

        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener("storage", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [isLocal]);

    const localContextValue = useMemo<SessionContextValue>(() => {
        const update = async () => readLocalRuntimeSessionSnapshot().data as Session | null;

        if (snapshot.status === "authenticated" && snapshot.data) {
            return {
                data: snapshot.data,
                status: "authenticated",
                update,
            };
        }

        return {
            data: null,
            status: snapshot.status === "loading" ? "loading" : "unauthenticated",
            update,
        };
    }, [snapshot]);

    if (!hasMounted || isLocal) {
        return <SessionContext.Provider value={localContextValue}>{children}</SessionContext.Provider>;
    }

    return (
        <SessionProvider
            refetchOnWindowFocus={false}
            refetchWhenOffline={false}
            refetchInterval={0}
            basePath="/api/auth"
        >
            {children}
        </SessionProvider>
    );
};
