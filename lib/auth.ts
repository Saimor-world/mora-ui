import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Demo Access",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "demo" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
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
                const loginUrl = new URL("/v1/auth/login", coreBaseUrl).toString();

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
                            accessToken: data.token
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
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                (session.user as any).role = token.role;
                (session.user as any).tenant_id = token.tenant_id;
                (session.user as any).id = token.id;
                (session.user as any).accessToken = token.accessToken;
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
