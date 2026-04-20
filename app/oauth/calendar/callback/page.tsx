import CalendarOAuthCallbackClient from '@/components/auth/CalendarOAuthCallbackClient';

interface CalendarOAuthCallbackPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

export default async function CalendarOAuthCallbackPage({
    searchParams,
}: CalendarOAuthCallbackPageProps) {
    const resolved = (await searchParams) ?? {};
    const provider = firstValue(resolved.calendar_provider) ?? firstValue(resolved.provider);
    const status = firstValue(resolved.calendar_status) ?? firstValue(resolved.status);

    return <CalendarOAuthCallbackClient provider={provider} status={status} />;
}
