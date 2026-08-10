import { NextResponse } from 'next/server';

import { createSafeErrorReport } from '@/lib/utils/error-reporting';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 16_384;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function clientKey(request: Request): string {
    return (
        request.headers.get('x-real-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown'
    );
}

function acceptsReport(request: Request, now = Date.now()): boolean {
    const key = clientKey(request);
    const current = rateBuckets.get(key);
    if (!current || current.resetAt <= now) {
        rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }
    if (current.count >= RATE_LIMIT) return false;
    current.count += 1;
    return true;
}

async function readLimitedBody(request: Request): Promise<string | null> {
    if (!request.body) return '';
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }

    return Buffer.concat(chunks).toString('utf8');
}

export async function POST(request: Request) {
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    if (!acceptsReport(request)) {
        return NextResponse.json({ error: 'Too many reports' }, {
            status: 429,
            headers: { 'Retry-After': String(RATE_WINDOW_MS / 1_000) },
        });
    }

    const rawBody = await readLimitedBody(request);
    if (rawBody === null) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: Record<string, unknown> | null = null;
    try {
        const parsed = JSON.parse(rawBody);
        body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
    } catch {
        body = null;
    }

    if (!body || typeof body.message !== 'string' || !body.message.trim()) {
        return NextResponse.json({ error: 'Invalid error report' }, { status: 400 });
    }

    const bodyError = body.error && typeof body.error === 'object'
        ? body.error as Record<string, unknown>
        : undefined;
    const error = bodyError
        ? Object.assign(new Error(String(bodyError.message || body.message)), {
            name: String(bodyError.name || 'Error'),
            stack: typeof bodyError.stack === 'string' ? bodyError.stack : undefined,
        })
        : undefined;
    const report = createSafeErrorReport({
        message: body.message,
        error,
        context: body.context && typeof body.context === 'object'
            ? body.context as Record<string, unknown>
            : undefined,
    });

    console.error('[client-error]', JSON.stringify(report));
    return new NextResponse(null, { status: 202 });
}
