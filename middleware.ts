import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * SAIMOR Auth Middleware
 *
 * Schützt ALLE Routes außer:
 * - Statische Assets (/_next/static, /_next/image, /favicon.ico)
 * - Auth Endpoints (/api/auth/*, /api/v2/auth/*)
 * - Public Pages (/, /login)
 *
 * SECURITY: hq.saimor.world muss Login erfordern!
 */

// Routes die OHNE Auth zugänglich sein müssen
const PUBLIC_PATHS = [
    "/",           // Root/Login page
    "/login",      // Explizite Login page
];

// Path prefixes die OHNE Auth zugänglich sein müssen
const PUBLIC_PREFIXES = [
    "/_next/static",
    "/_next/image",
    "/api/auth",        // NextAuth endpoints
    "/api/v2/auth",     // Custom auth endpoints
    "/api/core",        // Core API proxy (auth handled by backend)
];

// Statische Dateien die OHNE Auth zugänglich sein müssen
const PUBLIC_FILES = [
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
];

function isPublicPath(pathname: string): boolean {
    // Exakte Matches
    if (PUBLIC_PATHS.includes(pathname)) {
        return true;
    }

    // Prefix Matches
    for (const prefix of PUBLIC_PREFIXES) {
        if (pathname.startsWith(prefix)) {
            return true;
        }
    }

    // Statische Dateien
    if (PUBLIC_FILES.includes(pathname)) {
        return true;
    }

    // Statische Assets mit Extensions (.js, .css, .png, etc.)
    if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return true;
    }

    return false;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public paths brauchen keine Auth
    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // Session-Token prüfen (next-auth JWT)
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || "dev_secret_key_change_me_in_prod",
    });
    const hasCoreSession = !!request.cookies.get("mora_session")?.value;
    // Session-first auth bridge:
    // protected routes are valid if either NextAuth JWT exists
    // or the backend-issued mora_session cookie exists.
    if (!token && !hasCoreSession) {
        const loginUrl = new URL("/", request.url);

        // Original URL als Redirect-Parameter speichern
        if (pathname !== "/") {
            loginUrl.searchParams.set("callbackUrl", pathname);
        }

        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match ALLE Pfade AUSSER:
         * - _next/static (statische Dateien)
         * - _next/image (Bild-Optimierung)
         * - favicon.ico (Browser-Icon)
         *
         * Die Middleware selbst filtert dann feiner nach:
         * - /api/auth/* (NextAuth)
         * - /api/v2/auth/* (Custom Auth)
         * - / und /login (Public Pages)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
