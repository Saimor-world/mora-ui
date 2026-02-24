import { useEffect, useState } from "react";
import { realtime } from "@/lib/api/realtimeClient";

export interface PeerUser {
    sessionId: string;
    name: string;
    email: string;
    role: string;
    status: "online" | "offline" | "away" | "busy";
    lastHeartbeat: number;
}

type PresencePayload = {
    peers?: PeerUser[];
    peer?: PeerUser;
    sessionId?: string;
};

const upsertPeer = (list: PeerUser[], peer: PeerUser) => {
    const idx = list.findIndex((p) => p.sessionId === peer.sessionId);
    if (idx === -1) return [...list, peer];
    const next = [...list];
    next[idx] = peer;
    return next;
};

export const usePresence = () => {
    const [peers, setPeers] = useState<PeerUser[]>([]);

    useEffect(() => {
        // Connection lifecycle is managed by useRealtime (MoraShell).
        // This hook only subscribes to events on the shared singleton.
        const handleSnapshot = (data: PresencePayload) => {
            if (Array.isArray(data?.peers)) {
                setPeers(data.peers);
            }
        };

        const handleUpdate = (data: PresencePayload) => {
            if (data?.peer) {
                setPeers((prev) => upsertPeer(prev, data.peer as PeerUser));
            }
        };

        const handleRemove = (data: PresencePayload) => {
            const sessionId = data?.sessionId;
            if (!sessionId) return;
            setPeers((prev) => prev.filter((p) => p.sessionId !== sessionId));
        };

        realtime.on("presence.snapshot", handleSnapshot);
        realtime.on("presence.update", handleUpdate);
        realtime.on("presence.remove", handleRemove);

        return () => {
            realtime.off("presence.snapshot", handleSnapshot);
            realtime.off("presence.update", handleUpdate);
            realtime.off("presence.remove", handleRemove);
        };
    }, []);

    return { peers };
};
