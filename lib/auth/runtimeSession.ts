"use client";

import { createContext, useContext, useMemo } from "react";
import type { Session } from "next-auth";
import { SessionContext } from "next-auth/react";
import { readCookie } from "@/lib/auth/cookies";

type RuntimeSessionUser = {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    tenant_id?: string;
    accessToken?: string | null;
};

type RuntimeSessionShape = {
    user?: RuntimeSessionUser;
};

const FallbackSessionContext = createContext<{
    data: Session | null;
    status: "authenticated" | "unauthenticated" | "loading";
    update: () => Promise<Session | null>;
} | null>(null);

export type RuntimeSessionStatus = "authenticated" | "unauthenticated" | "loading";

export type RuntimeSessionSnapshot = {
    data: Session | null;
    status: RuntimeSessionStatus;
};

export function isLocalRuntimeHost(): boolean {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function toSessionShape(data: RuntimeSessionShape | null): Session | null {
    if (!data?.user) return null;
    return data as Session;
}

export function readLocalRuntimeSessionSnapshot(): RuntimeSessionSnapshot {
    if (typeof window === "undefined") {
        return { data: null, status: "unauthenticated" };
    }

    const email = localStorage.getItem("last_user_email") || undefined;
    const name =
        localStorage.getItem("user_name") ||
        localStorage.getItem("last_user_name") ||
        email?.split("@")[0] ||
        undefined;
    const role = localStorage.getItem("saimor_role") || undefined;
    const tenant_id = localStorage.getItem("saimor_tenant") || undefined;
    const accessToken = localStorage.getItem("saimor_dev_token");
    const hasCoreSession = !!readCookie("mora_session");

    if (!hasCoreSession && !accessToken && !email) {
        return { data: null, status: "unauthenticated" };
    }

    return {
        data: toSessionShape({
            user: {
                id: email || name,
                name,
                email,
                role,
                tenant_id,
                accessToken,
            },
        }),
        status: "authenticated",
    };
}

export function useRuntimeSession() {
    const nextAuthSession = useContext((SessionContext as typeof FallbackSessionContext | undefined) ?? FallbackSessionContext);
    const isLocal = isLocalRuntimeHost();

    return useMemo(() => {
        if (!nextAuthSession) {
            return {
                data: null,
                status: "unauthenticated" as const,
                update: async () => null,
            };
        }

        if (!isLocal) {
            return nextAuthSession;
        }

        const localSession = readLocalRuntimeSessionSnapshot();
        return {
            data: localSession.data,
            status: localSession.status,
            update: nextAuthSession.update,
        };
    }, [isLocal, nextAuthSession]);
}
