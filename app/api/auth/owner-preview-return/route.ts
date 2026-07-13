import { NextRequest, NextResponse } from 'next/server';

import { fetchCoreUpstream } from '@/lib/api/coreReachability';
import {
    isSystemOwnerSession,
    OWNER_RETURN_COOKIE,
} from '@/lib/api/ownerPreviewSession';

const OWNER_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

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
    response.cookies.set('mora_session', ownerToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: OWNER_SESSION_MAX_AGE,
    });
    response.cookies.set('mora_auth_token', ownerToken!, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: OWNER_SESSION_MAX_AGE,
    });
    response.cookies.delete(OWNER_RETURN_COOKIE);
    return response;
}
