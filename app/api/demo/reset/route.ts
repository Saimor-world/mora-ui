import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const coreUrl = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8000';

        // Fetch a dev token first to avoid 401/404 when no JWT is provided
        const tokenResp = await fetch(`${coreUrl}/v1/auth/dev-token`, { method: 'POST' });
        const tokenJson = tokenResp.ok ? await tokenResp.json() : null;
        const jwt = tokenJson?.token || process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT || '';

        const response = await fetch(`${coreUrl}/v1/demo/reset-instance`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Core API returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Demo reset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reset demo instance' },
            { status: 500 }
        );
    }
}
