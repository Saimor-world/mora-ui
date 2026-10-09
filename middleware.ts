import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
    hasCoreSessionCookie,
    hasValidCoreSession,
    nextAuthVerificationSecret,
} from "@/lib/auth/coreSessionGuard";

/**
 * SAIMOR Auth Middleware
 *
 * Local Truth is core-session first.
 * NextAuth JWT remains only a fallback bridge for non-local / legacy flows.
 *
 * Pages: a CORE session cookie is enough to render the shell, because every
 * data call goes to CORE, which validates the session itself.
 * API routes run on this server with its own privileges, so they need a
 * session CORE actually confirms (or a verified NextAuth token) — cookie
 * presence alone is not accepted there.
 */

const PUBLIC_PATHS = [
    "/",
    "/login",
    "/playground",     // Public playground entry
    "/entry",          // Website entry preview — React app gates real data via useAuthBootstrapper
    "/home",           // Website entry preview — needs to render so localStorage bridge works
    "/reset-password", // Token-based password reset — unauthenticated by design
];

/** Dev-only UI museum — see app/tunnel/page.tsx */
const DEV_PUBLIC_PATHS = ["/tunnel", "/tunel"]; //
    

const PUBLIC_PREFIXES = [
    "/_next/static",
    "/_next/image",
    "/api/auth",
    "/api/v2/auth",
    "/api/core",
    "/oauth/calendar",
    "/oauth/cloud",
];

const PUBLIC_FILES = [
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
];

function isPublicPath(pathname: string): boolean {
    if (PUBLIC_PATHS.includes(pathname) || DEV_PUBLIC_PATHS.includes(pathname)) return true;

    for (const prefix of PUBLIC_PREFIXES) {
        if (pathname.startsWith(prefix)) return true;
    }

    if (PUBLIC_FILES.includes(pathname)) return true;

    if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return true;
    }

    return false;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hostname = request.nextUrl.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // OS prototype local preview: /os without a CORE session, ONLY on localhost and
    // ONLY when the build was made with NEXT_PUBLIC_OS_PREVIEW=local. Data calls still
    // go through /api/core and fail closed without a session.
    if (pathname === "/os" && isLocalhost && process.env.NEXT_PUBLIC_OS_PREVIEW === "local") {
        return NextResponse.next();
    }

    const isApiRoute = pathname.startsWith("/api/");

    // mora_auth_token is the readable bridge for website-entry preview sessions
    // (HttpOnly mora_session may be absent on the HQ host when login went via BFF
    // or when CORE Set-Cookie was cross-origin). Accept it in production too.
    if (isApiRoute) {
        if (await hasValidCoreSession(request.cookies)) {
            return NextResponse.next();
        }
    } else if (hasCoreSessionCookie(request.cookies)) {
        return NextResponse.next();
    }

    const secret = nextAuthVerificationSecret();
    const token = isLocalhost || !secret
        ? null
        : await getToken({ req: request, secret });

    if (!token) {
        if (isApiRoute) {
            return NextResponse.json({ error: "Login required" }, { status: 401 });
        }
        const loginUrl = new URL("/", request.url);
        if (pathname !== "/") {
            loginUrl.searchParams.set("callbackUrl", pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
