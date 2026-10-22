import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';

import { isSystemOwnerSession, readCurrentSessionToken } from '@/lib/api/ownerPreviewSession';

/**
 * Server-side gate for /api/finance/* (Saimôr treasury, hot minter, ORIGIN NFT).
 *
 * Owner-only (decision Marius, 19.10.2026). The middleware only proves a valid
 * session; customer-company users (incl. their own `owner` role) must never see
 * Saimôr's company finances, so this requires the Saimôr system owner as CORE
 * reports it on /v3/auth/me. Returns a response to send, or null when allowed.
 */
export async function requireFinanceOwner(request: NextRequest): Promise<NextResponse | null> {
    const token = readCurrentSessionToken(request);
    if (!token) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!(await isSystemOwnerSession(token))) {
        return NextResponse.json({ error: 'forbidden', reason: 'owner_only' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    return null;
}
