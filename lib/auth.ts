import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

                const isDemoAlias = normalizedUsername === 'demo' || normalizedUsername === 'demo@saimor.io';
                const primaryPassword = credentials.password;

                // Prefer the docker-internal Core URL in production to avoid relying on public routing for auth.
                const coreBaseUrl =
                    process.env.SAIMOR_CORE_URL ||
                    (process.env.NODE_ENV === 'production' ? 'http://core:8081' : 'http://127.0.0.1:8081') ||
                    process.env.NEXT_PUBLIC_SAIMOR_CORE_URL ||
                    "http://127.0.0.1:8081";
                const sessionUrl = new URL("/v3/auth/session", coreBaseUrl).toString();
                const loginUrl = new URL("/v1/auth/login", coreBaseUrl).toString();
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
                        console.error("Session Sync Exception:", error);
                    }
                }

                const attemptLogin = async (passwordToTry: string) => {
                    // Timeout signal to prevent hanging
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                    try {
                        const res = await fetch(loginUrl, {
                            method: 'POST',
                            body: JSON.stringify({
                                email,
                                password: passwordToTry
                            }),
                            headers: { "Content-Type": "application/json" },
                            signal: controller.signal
                        });

                        let data: any = null;
                        try {
                            data = await res.json();
                        } catch {
                            data = null;
                        }

                        return { res, data };
                    } finally {
                        clearTimeout(timeoutId);
                    }
                };

                try {
                    let { res, data } = await attemptLogin(primaryPassword);

                    // Friendly demo fallback: allow "demo" to map to demo123
                    if ((!res.ok || !data?.token) && isDemoAlias && primaryPassword === 'demo') {
                        ({ res, data } = await attemptLogin('demo123'));
                    }

                    if (res.ok && data?.token) {
                        return {
                            id: data.user_id,
                            name: data.email.split('@')[0],
                            email: data.email,
                            role: data.role,
                            tenant_id: data.tenant_id,
                            accessToken: data.token,
                            authType: "bearer"
                        };
                    }

                    console.error("Backend Auth Failed:", data);
                    return null;
                } catch (error) {
                    console.error("Auth Exception:", error);
                    return null;
                }
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
