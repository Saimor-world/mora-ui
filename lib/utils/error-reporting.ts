export type ErrorReportInput = {
    message: string;
    error?: Error;
    context?: Record<string, unknown>;
};

export type SafeErrorReport = {
    message: string;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    context?: Record<string, unknown>;
};

const SENSITIVE_KEY = /(e-?mail|user.?id|account.?id|tenant.?id|token|secret|password|authorization|cookie)/i;
const MAX_TEXT = 2_000;

function redactText(value: string): string {
    return value
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email-redacted]')
        .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
        .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[token-redacted]')
        .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[id-redacted]')
        .replace(/(https?:\/\/[^\s?]+)\?[^\s)]+/gi, '$1?[query-redacted]')
        .replace(/C:\\Users\\[^\\\s]+/gi, 'C:\\Users\\[redacted]')
        .replace(/\/Users\/[^/\s]+/g, '/Users/[redacted]')
        .slice(0, MAX_TEXT);
}

function sanitizeValue(value: unknown, key = '', depth = 0): unknown {
    if (SENSITIVE_KEY.test(key)) return '[redacted]';
    if (depth > 3) return '[truncated]';
    if (typeof value === 'string') return redactText(value);
    if (typeof value === 'number' || typeof value === 'boolean' || value == null) return value;
    if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitizeValue(item, '', depth + 1));
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .slice(0, 30)
                .map(([childKey, childValue]) => [
                    childKey,
                    sanitizeValue(childValue, childKey, depth + 1),
                ]),
        );
    }
    return redactText(String(value));
}

export function createSafeErrorReport(input: ErrorReportInput): SafeErrorReport {
    const report: SafeErrorReport = { message: redactText(input.message) };
    if (input.error) {
        report.error = {
            name: redactText(input.error.name || 'Error'),
            message: redactText(input.error.message),
            ...(input.error.stack ? { stack: redactText(input.error.stack) } : {}),
        };
    }
    if (input.context) {
        report.context = sanitizeValue(input.context) as Record<string, unknown>;
    }
    return report;
}

export function sendSafeErrorReport(
    input: ErrorReportInput | SafeErrorReport,
    transport: typeof fetch = fetch,
): void {
    const report = createSafeErrorReport(input);
    void transport('/api/client-errors', {
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
    }).catch(() => undefined);
}

export function reportClientError(input: ErrorReportInput | SafeErrorReport): void {
    if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') return;
    sendSafeErrorReport(input);
}