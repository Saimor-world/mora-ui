#!/usr/bin/env npx ts-node
/**
 * MEMORY SYSTEM E2E TEST
 *
 * Tests the complete Memory flow:
 * 1. Learn an insight (low-risk → auto-commit)
 * 2. Learn an insight (high-risk → pending)
 * 3. Get pending reviews
 * 4. Approve/Reject pending
 * 5. Search memories
 * 6. Get metrics
 *
 * Usage: npx ts-node scripts/test-memory-flow.ts
 */

const CORE_URL = process.env.CORE_URL || 'http://localhost:8081';
const TOKEN = process.env.SAIMOR_TOKEN || '';

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    data?: any;
}

const results: TestResult[] = [];

async function apiCall(endpoint: string, method = 'GET', body?: any) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (TOKEN) {
        headers['Authorization'] = `Bearer ${TOKEN}`;
    }

    const res = await fetch(`${CORE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        throw new Error(`${method} ${endpoint} failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

async function test(name: string, fn: () => Promise<any>) {
    try {
        const data = await fn();
        results.push({ name, passed: true, message: 'OK', data });
        console.log(`✅ ${name}`);
        return data;
    } catch (err: any) {
        results.push({ name, passed: false, message: err.message });
        console.log(`❌ ${name}: ${err.message}`);
        return null;
    }
}

async function runTests() {
    console.log('\n🧠 MEMORY SYSTEM E2E TEST\n');
    console.log(`Core URL: ${CORE_URL}`);
    console.log(`Token: ${TOKEN ? '***' : '(none)'}\n`);

    // Test 1: Health Check
    await test('Health Check', () => apiCall('/v1/health'));

    // Test 2: Get Initial Metrics
    const initialMetrics = await test('Get Initial Metrics', () =>
        apiCall('/v1/memory/metrics')
    );

    // Test 3: Learn Low-Risk Insight (should auto-commit)
    await test('Learn Low-Risk Insight (preference)', () =>
        apiCall('/v1/memory/learn', 'POST', {
            insight: 'User bevorzugt dunkles Theme',
            category: 'preference',
            auto_commit: true
        })
    );

    // Test 4: Learn High-Risk Insight (should go to pending)
    await test('Learn High-Risk Insight (fact)', () =>
        apiCall('/v1/memory/learn', 'POST', {
            insight: 'Budget für Q2 ist 50.000 EUR',
            category: 'fact',
            auto_commit: false
        })
    );

    // Test 5: Get Pending Reviews
    const pending = await test('Get Pending Reviews', () =>
        apiCall('/v1/memory/pending')
    );

    // Test 6: Approve first pending (if any)
    if (pending && Array.isArray(pending) && pending.length > 0) {
        const firstPending = pending[0];
        await test(`Approve Pending #${firstPending.id}`, () =>
            apiCall(`/v1/memory/approve/${firstPending.id}`, 'POST')
        );
    }

    // Test 7: Search Memories
    await test('Search Memories (query: "theme")', () =>
        apiCall('/v1/memory/search?q=theme&limit=5')
    );

    // Test 8: Get Final Metrics
    const finalMetrics = await test('Get Final Metrics', () =>
        apiCall('/v1/memory/metrics')
    );

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\nTotal: ${results.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (initialMetrics && finalMetrics) {
        console.log('\nMetrics Diff:');
        console.log(`  Pending: ${initialMetrics.pending_reviews} → ${finalMetrics.pending_reviews}`);
        console.log(`  Recent (7d): ${initialMetrics.recent_learns_7d} → ${finalMetrics.recent_learns_7d}`);
    }

    console.log('\n');

    return failed === 0;
}

// Run
runTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
