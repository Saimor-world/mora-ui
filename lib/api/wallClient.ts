import { corePost } from '@/lib/api/http';

export type WallSubmitResponse = {
    success: boolean;
    wall_status: 'pending' | 'confirmed' | string;
    confirm_token?: string;
    message?: string;
};

export function submitDossierToWall(payload: {
    node_id: string;
    message?: string;
    visibility?: 'domain-only' | 'public' | string;
}) {
    return corePost('/v3/playground/wall-submit', {
        visibility: 'domain-only',
        ...payload,
    }) as Promise<WallSubmitResponse>;
}
