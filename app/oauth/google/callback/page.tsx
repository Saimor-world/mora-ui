import GoogleConnectCallbackClient from '@/components/auth/GoogleConnectCallbackClient';

interface Props {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const firstValue = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function GoogleConnectCallbackPage({ searchParams }: Props) {
    const resolved = (await searchParams) ?? {};
    const status = firstValue(resolved.google_status);
    const email = firstValue(resolved.email);
    return <GoogleConnectCallbackClient status={status} email={email} />;
}
