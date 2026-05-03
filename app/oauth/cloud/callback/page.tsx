import CloudOAuthCallbackClient from '@/components/auth/CloudOAuthCallbackClient';

interface CloudOAuthCallbackPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

export default async function CloudOAuthCallbackPage({
    searchParams,
}: CloudOAuthCallbackPageProps) {
    const resolved = (await searchParams) ?? {};
    const provider = firstValue(resolved.cloud_provider) ?? firstValue(resolved.provider);
    const status = firstValue(resolved.cloud_status) ?? firstValue(resolved.status);

    return <CloudOAuthCallbackClient provider={provider} status={status} />;
}
