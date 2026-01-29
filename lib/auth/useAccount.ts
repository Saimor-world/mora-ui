import { create } from 'zustand';

export type AccountRole = 'admin' | 'owner' | 'system_owner' | 'member' | 'manager' | 'demo';

export interface Account {
    userId: string;
    email?: string;
    role: AccountRole;
    tenantId: string;
    scope?: string;
    token: string;
}

interface AccountState {
    currentAccount: Account | null;
    sessionToken: string | null;
    login: (account: Account) => void;
    logout: () => void;
    loadFromCookie: () => string | null;
    setFromProfile: (profile: { user_id: string; email?: string; role: AccountRole; tenant_id: string; scope?: string }, token?: string) => void;
}

const AUTH_COOKIE = 'mora_auth_token';
const TENANT_COOKIE = 'mora_tenant_id';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

function writeCookie(name: string, value: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie(name: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Max-Age=0; path=/;`;
}

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
    if (!value) return null;
    const [, raw] = value.split('=');
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export const useAccountStore = create<AccountState>((set, get) => ({
    currentAccount: null,
    sessionToken: null,

    login: (account: Account) => {
        writeCookie(AUTH_COOKIE, account.token);
        writeCookie(TENANT_COOKIE, account.tenantId);
        set({ currentAccount: account, sessionToken: account.token });
    },

    logout: () => {
        clearCookie(AUTH_COOKIE);
        clearCookie(TENANT_COOKIE);
        set({ currentAccount: null, sessionToken: null });
    },

    loadFromCookie: () => {
        const token = readCookie(AUTH_COOKIE);
        const tenant = readCookie(TENANT_COOKIE);
        if (token) {
            set({ sessionToken: token });
        }
        if (tenant && get().currentAccount) {
            set({ currentAccount: { ...get().currentAccount!, tenantId: tenant } });
        }
        return token;
    },

    setFromProfile: (profile, token) => {
        const sessionToken = token || get().sessionToken || readCookie(AUTH_COOKIE);
        if (!sessionToken) {
            return;
        }
        writeCookie(AUTH_COOKIE, sessionToken);
        writeCookie(TENANT_COOKIE, profile.tenant_id);
        set({
            currentAccount: {
                userId: profile.user_id,
                email: profile.email,
                role: profile.role,
                tenantId: profile.tenant_id,
                scope: profile.scope,
                token: sessionToken,
            },
            sessionToken,
        });
    },
}));
