import { redirect } from 'next/navigation';
import { buildWebsiteEntryContext, firstQueryValue } from '@/lib/websiteEntryContext';
import { WebsiteEntryPersistence } from '@/components/entry/WebsiteEntryPersistence';
import { WebsiteEntryTokenLogin } from '@/components/entry/WebsiteEntryTokenLogin';
import { DemoWelcomeCardClient } from '@/components/entry/DemoWelcomeCardClient';
import { DemoDirectEntry } from '@/components/entry/DemoDirectEntry';
import { SecurityCheckEntry } from '@/components/entry/SecurityCheckEntry';

type EntryPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EntryPage({ searchParams }: EntryPageProps) {
    // SURFACE_MODE guard removed: /entry is always reachable for demo + HQ flows.
    // Previously gated on NEXT_PUBLIC_SURFACE_MODE === 'hq', which blocked all demo links.

    const resolved = (await searchParams) ?? {};
    const mode = firstQueryValue(resolved.mode);
    const token = firstQueryValue(resolved.token) || firstQueryValue(resolved.entry_token);
    const websiteContext = buildWebsiteEntryContext(resolved);
    // Pure product demo (no dossier context): marketing landing + silent auth → /home
    if (mode === 'demo' && token && !websiteContext) {
        return <DemoDirectEntry token={token} />;
    }

    // Security Check: full immersive entry — handles its own auth via SecurityCheckPlaygroundLogin
    if (websiteContext && websiteContext.entity === 'security-audit') {
        return <SecurityCheckEntry context={websiteContext} />;
    }

    // Other website contexts (digital-blueprint etc): guided welcome card
    if (websiteContext) {
        return (
            <main className="min-h-screen bg-[#05040d] text-white">
                {token ? <WebsiteEntryTokenLogin token={token} /> : null}
                <WebsiteEntryPersistence context={websiteContext} />
                <div className="flex min-h-screen items-center justify-center px-6 py-10">
                    <DemoWelcomeCardClient context={websiteContext} />
                </div>
            </main>
        );
    }

    // A bare HQ entry must never become a public shortcut into the product.
    // Only signed demo/context links above may continue into Môra.
    redirect('https://www.saimor.world/de/einstieg/security-check');
}
