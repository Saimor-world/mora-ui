'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';
import { AppLoader, APP_IDS } from '@/lib/apps/AppLoader';

/**
 * Die wenigen Faelle, in denen Fenstertyp und App-Kennung auseinandergehen.
 * Ohne diese Tabelle waere der generische Weg unten eine stille
 * Verhaltensaenderung: `space` oeffnete den Finder, `actions` das
 * Action-Center — beides Namen aus frueheren Ausbaustufen.
 */
const PANE_ALIAS: Record<string, string> = {
    space: 'finder',
    actions: 'action-center',
};

// ── Legacy panes without a matching apps/ module ──────────────────────────────
import { CompanyDetailPane } from '@/components/panes/CompanyDetailPane';
import { MoraHubPane } from '@/components/panes/MoraHubPane';
import { BrowserPane } from '@/components/panes/BrowserPane';
import { WallPane } from '@/components/panes/WallPane';

// Full-bleed apps: portal to document.body at z-850 so they render above the Dock
// (z-740) but below MoraShell overlays (z-928+). These apps fill the viewport
// entirely and manage their own close button.
const FULLBLEED_APPS: Partial<Record<PaneConfig['type'], string>> = {
    // nightwatch moved to GlassPanel sheet — universe stays visible behind
};

const FullBleedWrapper: React.FC<{ pane: PaneConfig; appId: string }> = ({ pane, appId }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
    if (!mounted) return null;

    return createPortal(
        <motion.div
            className="fixed inset-0"
            style={{ zIndex: 850 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
        >
            <AppLoader appId={appId} paneId={pane.id} initialData={pane.data} />
        </motion.div>,
        document.body,
    );
};

const PaneRenderer: React.FC<{ pane: PaneConfig }> = ({ pane }) => {
    if (!isPaneEnabled(pane.type)) {
        return null;
    }

    // Full-bleed apps bypass GlassPanel — give them the correct z-index layer directly
    const fullBleedAppId = FULLBLEED_APPS[pane.type];
    if (fullBleedAppId) {
        return <FullBleedWrapper pane={pane} appId={fullBleedAppId} />;
    }

    // Fenstertyp und App-Kennung sind fast immer dasselbe Wort. Hier standen
    // 24 gleichlautende Zweige — und wer beim Hinzufuegen einer App einen
    // vergass, bekam keinen Fehler, sondern ein leeres Fenster: `default`
    // gibt `null` zurueck und schweigt. Genau so ist die Ortsansicht beim
    // ersten Anlauf unsichtbar geblieben, mit gruener Testsuite.
    //
    // Jetzt entscheidet die AppLoader-Karte: Was dort steht, wird gerendert.
    const appId = PANE_ALIAS[pane.type] ?? pane.type;
    if (APP_IDS.includes(appId)) {
        return <AppLoader appId={appId} paneId={pane.id} initialData={pane.data} />;
    }

    switch (pane.type) {
        // ── No apps/ module yet — keep legacy pane ───────────────────────────
        case 'company-detail':
            return (
                <CompanyDetailPane
                    id={pane.id}
                    companyId={pane.data?.companyId}
                    companyName={pane.data?.companyName}
                />
            );
        case 'mora-hub':
            return <MoraHubPane id={pane.id} data={pane.data} />;
        case 'browser':
            return <BrowserPane id={pane.id} />;
        case 'wall':
            return <WallPane id={pane.id} />;

        default:
            return null;
    }
};

export const PaneManager: React.FC = () => {
    const panes = usePaneStore((state) => state.panes);

    return (
        // Windowed panes (GlassPanel) use createPortal to document.body and receive
        // their z-index directly. This container only handles the fallback pass-through
        // for non-GlassPanel apps; full-bleed apps (nightwatch) render via FullBleedWrapper
        // at their correct pane.zIndex above instead.
        <div className="pointer-events-none fixed inset-0 z-[100]">
            <AnimatePresence>
                {panes.map((pane) => (
                    !pane.minimized && (
                        <div key={pane.id} className="pointer-events-auto absolute inset-0">
                            <PaneRenderer pane={pane} />
                        </div>
                    )
                ))}
            </AnimatePresence>
        </div>
    );
};
