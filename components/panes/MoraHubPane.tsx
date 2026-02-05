"use client";

import React from "react";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import { useMoraStore } from "@/lib/store/moraState";
import MoraPlayground from "@/components/mora/MoraPlayground";

interface Props {
    id?: string;
    onClose?: () => void;
}

/**
 * MORA HUB PANE
 * Dedicated brain space for Mora: thoughts, actions, and context tools.
 */
export const MoraHubPane: React.FC<Props> = ({ id = "mora-hub", onClose }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const viewLevel = useMoraStore((s) => s.viewLevel);

    const handleClose = () => {
        removePane(id);
        onClose?.();
    };

    const width = pane?.size?.width ?? 520;
    const height = pane?.size?.height ?? 760;

    return (
        <GlassPanel
            width={width}
            height={height}
            blurIntensity={24}
            opacity={0.9}
            borderRadius="xl"
            showCloseButton
            showMinimizeButton
            draggable
            resizable
            dimBackground={false}
            title={<span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Mora Nexus</span>}
            isActive={isActive}
            onFocus={() => focusPane(id)}
            onClose={handleClose}
            onMinimize={() => minimizePane(id)}
            onResize={(width, height) => updatePaneSize(id, width, height)}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            className="overflow-hidden"
        >
            <div className="h-full">
                <MoraPlayground
                    scope={viewLevel === "department" ? "department" : "company"}
                    title="Mora Nexus"
                    className="h-full"
                />
            </div>
        </GlassPanel>
    );
};

export default MoraHubPane;
