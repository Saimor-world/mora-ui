import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { logger } from "@/lib/utils/logger";

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function extractCookieHeader(req: any): string {
    const headers = req?.headers;
    if (!headers) return "";
    if (typeof headers.get === "function") {
        return headers.get("cookie") || "";
    }
    if (typeof headers.cookie === "string") {
        return headers.cookie;
    }
    return "";
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Demo Access",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "demo" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                if (!credentials?.username || !credentials?.password) return null;

                const rawUsername = credentials.username.trim();
                const normalizedUsername = rawUsername.toLowerCase();

                // Map "demo" to backend authorized email for convenience
                let email = rawUsername;
                if (normalizedUsername === 'demo') email = 'demo@saimor.io';

                // Prefer the docker-internal Core URL in production to avoid relying on public routing for auth.
                const coreBaseUrl =
                    process.env.SAIMOR_CORE_URL ||
                    (process.env.NODE_ENV === 'production' ? 'http://core:8081' : 'http://127.0.0.1:8081') ||
                    process.env.NEXT_PUBLIC_SAIMOR_CORE_URL ||
                    "http://127.0.0.1:8081";
                const sessionUrl = new URL("/v3/auth/session", coreBaseUrl).toString();
                const cookieHeader = extractCookieHeader(req);

                if (cookieHeader.includes("mora_session=")) {
                    try {
                        const sessionRes = await fetch(sessionUrl, {
                            method: "GET",
                            headers: {
                                "Accept": "application/json",
                                "Cookie": cookieHeader,
                            },
                        });
                        const sessionData = sessionRes.ok ? await sessionRes.json() : null;
                        if (sessionRes.ok && sessionData?.user_id) {
                            return {
                                id: sessionData.user_id,
                                name: sessionData.email?.split("@")[0] || "User",
                                email: sessionData.email,
                                role: sessionData.role,
                                tenant_id: sessionData.tenant_id,
                                authType: sessionData.auth_type,
                            };
                        }
                    } catch (error) {
                        logger.error("Session Sync Exception:", toError(error));
                    }
                }
                // Session-first auth: browser must establish mora_session via /api/auth/core-login
                // or /api/auth/core-register before NextAuth syncs the user into its own session.
                return null;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.tenant_id = (user as any).tenant_id;
                token.id = user.id;
                token.accessToken = (user as any).accessToken;
                token.authType = (user as any).authType;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                (session.user as any).role = token.role;
                (session.user as any).tenant_id = token.tenant_id;
                (session.user as any).id = token.id;
                (session.user as any).accessToken = token.accessToken;
                (session.user as any).authType = token.authType;
            }
            return session;
        }
    },
    pages: {
        signIn: '/',
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET || "dev_secret_key_change_me_in_prod",
};
