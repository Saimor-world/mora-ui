"use client";

import { isLocalRuntimeHost } from "@/lib/auth/runtimeSession";

type SignInArgs = {
    provider?: string;
    redirect?: boolean;
    username?: string;
    password?: string;
};

type SignOutArgs = {
    redirect?: boolean;
};

export async function bridgeNextAuthSignIn(args: SignInArgs) {
    if (isLocalRuntimeHost()) {
        return { ok: true, status: 200, error: undefined, url: null };
    }

    const { signIn } = await import("next-auth/react");
    return signIn(args.provider || "credentials", {
        redirect: args.redirect ?? false,
        username: args.username,
        password: args.password,
    });
}

export async function bridgeNextAuthSignOut(args: SignOutArgs = {}) {
    if (isLocalRuntimeHost()) {
        return;
    }

    const { signOut } = await import("next-auth/react");
    return signOut({ redirect: args.redirect ?? false });
}
