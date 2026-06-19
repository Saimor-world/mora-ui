import { useMemo } from "react";
import { useTeamMembers } from "@/lib/queries/useTeamMembers";

export interface PeerUser {
    sessionId: string;
    name: string;
    email: string;
    role: string;
    status: "online" | "offline" | "away" | "busy";
    lastHeartbeat: number;
}

/**
 * Team presence for widgets and department views.
 * Backed by /v3/team/members (user-level online ids) — not raw WS sessions.
 */
export const usePresence = () => {
    const { data: members = [] } = useTeamMembers();

    const peers = useMemo<PeerUser[]>(
        () =>
            members.map((member) => ({
                sessionId: member.id,
                name: member.name,
                email: member.email,
                role: member.role,
                status: member.status,
                lastHeartbeat: Date.now(),
            })),
        [members],
    );

    return { peers };
};
