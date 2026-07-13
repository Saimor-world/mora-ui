import { NextRequest, NextResponse } from 'next/server';

import { fetchCoreUpstream } from '@/lib/api/coreReachability';
import {
    isSystemOwnerSession,
    OWNER_RETURN_COOKIE,
} from '@/lib/api/ownerPreviewSession';

const OWNER_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function appendSessionCookie(
    response: NextResponse,
    name: string,
    value: string,
    options: { httpOnly?: boolean; maxAge: number },
) {
    response.headers.append(
        'set-cookie',
        `${name}=${value}; Path=/; Max-Age=${options.maxAge}; SameSite=Lax${options.httpOnly ? '; HttpOnly' : ''}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    );
}

export async function GET(request: NextRequest) {
    return NextResponse.json(
        { available: Boolean(request.cookies.get(OWNER_RETURN_COOKIE)?.value) },
        { headers: { 'cache-control': 'no-store' } },
    );
}

export async function POST(request: NextRequest) {
    const ownerToken = request.cookies.get(OWNER_RETURN_COOKIE)?.value || null;
    if (!(await isSystemOwnerSession(ownerToken))) {
        const response = NextResponse.json(
            { success: false, detail: 'Die Owner-Sitzung ist nicht mehr verfügbar. Bitte erneut anmelden.' },
            { status: 403, headers: { 'cache-control': 'no-store' } },
        );
        response.cookies.delete(OWNER_RETURN_COOKIE);
        return response;
    }

    const previewToken = request.cookies.get('mora_session')?.value
        || request.cookies.get('mora_auth_token')?.value;
    if (previewToken && previewToken !== ownerToken) {
        void fetchCoreUpstream('/v3/auth/logout', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${previewToken}`,
            },
            body: '{}',
            redirect: 'manual',
        }).catch(() => undefined);
    }

    const response = NextResponse.json(
        { success: true, destination: '/home' },
        { headers: { 'cache-control': 'no-store' } },
    );
    // Append every cookie independently. In production the response crosses the
    // Caddy/Next boundary; keeping the Set-Cookie fields separate prevents one
    // session cookie from replacing another while the preview is being closed.
    appendSessionCookie(response, 'mora_session', ownerToken!, {
        httpOnly: true,
        maxAge: OWNER_SESSION_MAX_AGE,
    });
    appendSessionCookie(response, 'mora_auth_token', ownerToken!, {
        maxAge: OWNER_SESSION_MAX_AGE,
    });
    appendSessionCookie(response, OWNER_RETURN_COOKIE, '', {
        httpOnly: true,
        maxAge: 0,
    });
    return response;
}
