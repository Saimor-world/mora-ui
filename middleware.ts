import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * SAIMOR Auth Middleware
 *
 * Local Truth is core-session first.
 * NextAuth JWT remains only a fallback bridge for non-local / legacy flows.
 */

const PUBLIC_PATHS = [
    "/",
    "/login",
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

    const hasCoreSession = !!request.cookies.get("mora_session")?.value;
    const hasLegacyToken = !!request.cookies.get("mora_auth_token")?.value;
    if (hasCoreSession || (isLocalhost && hasLegacyToken)) {
        return NextResponse.next();
    }

    const token = isLocalhost
        ? null
        : await getToken({
              req: request,
              secret: process.env.NEXTAUTH_SECRET || "dev_secret_key_change_me_in_prod",
          });

    if (!token) {
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
