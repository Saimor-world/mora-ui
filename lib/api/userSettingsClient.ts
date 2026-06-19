// lib/api/userSettingsClient.ts
// Server-persisted user account preferences (users.settings JSON in CORE).

import { coreGet, corePatch } from './http';

export interface UserSettingsResponse {
    user_id: string;
    settings: Record<string, unknown>;
    updated_at?: string | null;
}

export async function fetchUserSettings(): Promise<UserSettingsResponse | null> {
    return coreGet('/v3/users/me/settings', { isOptional: true });
}

export async function patchUserSettings(
    settings: Record<string, unknown>,
): Promise<UserSettingsResponse | null> {
    return corePatch('/v3/users/me/settings', { settings }, { isOptional: true });
}
