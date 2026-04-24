import DirectCloudConnectClient from '@/components/auth/DirectCloudConnectClient';

interface DirectCloudConnectPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

const normalizeProvider = (value?: string): 'nextcloud' | 'extcloud' => {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'nextcloud') return 'nextcloud';
    return 'extcloud';
};

export default async function DirectCloudConnectPage({
    searchParams,
}: DirectCloudConnectPageProps) {
    const resolved = (await searchParams) ?? {};
    const provider = normalizeProvider(firstValue(resolved.provider));
    const label = firstValue(resolved.label) || '';
    const baseUrl = firstValue(resolved.base_url) || '';
    const username = firstValue(resolved.username) || '';
    const rootPath = firstValue(resolved.root_path) || '/Saimor HQ';

    return (
        <DirectCloudConnectClient
            provider={provider}
            label={label}
            baseUrl={baseUrl}
            username={username}
            rootPath={rootPath}
        />
    );
}
