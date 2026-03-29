import { hasMinRole, isAdmin, isMember, isOwner, userIsAdmin, userIsMember, roleLabel } from '@/lib/auth/roles';

describe('hasMinRole', () => {
    it('returns true when role meets minimum', () => {
        expect(hasMinRole('admin', 'admin')).toBe(true);
        expect(hasMinRole('owner', 'admin')).toBe(true);
        expect(hasMinRole('system_owner', 'member')).toBe(true);
    });

    it('returns false when role is below minimum', () => {
        expect(hasMinRole('member', 'admin')).toBe(false);
        expect(hasMinRole('demo', 'member')).toBe(false);
        expect(hasMinRole('manager', 'owner')).toBe(false);
    });

    it('handles null/undefined/invalid gracefully', () => {
        expect(hasMinRole(null, 'member')).toBe(false);
        expect(hasMinRole(undefined, 'member')).toBe(false);
        expect(hasMinRole('', 'member')).toBe(false);
        expect(hasMinRole('bogus', 'member')).toBe(false);
    });
});

describe('isAdmin', () => {
    it('returns true for admin, owner, system_owner', () => {
        expect(isAdmin('admin')).toBe(true);
        expect(isAdmin('owner')).toBe(true);
        expect(isAdmin('system_owner')).toBe(true);
    });

    it('returns false for manager, member, demo', () => {
        expect(isAdmin('manager')).toBe(false);
        expect(isAdmin('member')).toBe(false);
        expect(isAdmin('demo')).toBe(false);
    });
});

describe('isMember', () => {
    it('includes all real users but not demo', () => {
        expect(isMember('member')).toBe(true);
        expect(isMember('manager')).toBe(true);
        expect(isMember('admin')).toBe(true);
        expect(isMember('owner')).toBe(true);
        expect(isMember('system_owner')).toBe(true);
        expect(isMember('demo')).toBe(false);
    });
});

describe('isOwner', () => {
    it('includes owner and system_owner only', () => {
        expect(isOwner('owner')).toBe(true);
        expect(isOwner('system_owner')).toBe(true);
        expect(isOwner('admin')).toBe(false);
        expect(isOwner('manager')).toBe(false);
    });
});

describe('userIsAdmin / userIsMember', () => {
    it('works with user objects', () => {
        expect(userIsAdmin({ role: 'owner' })).toBe(true);
        expect(userIsAdmin({ role: 'member' })).toBe(false);
        expect(userIsAdmin(null)).toBe(false);
        expect(userIsMember({ role: 'member' })).toBe(true);
        expect(userIsMember({ role: 'demo' })).toBe(false);
    });
});

describe('roleLabel', () => {
    it('returns German labels', () => {
        expect(roleLabel('owner')).toBe('Eigentümer');
        expect(roleLabel('system_owner')).toBe('System-Eigentümer');
        expect(roleLabel('admin')).toBe('Administrator');
        expect(roleLabel('member')).toBe('Mitglied');
        expect(roleLabel('demo')).toBe('Demo');
    });

    it('returns "Unbekannt" for invalid/null', () => {
        expect(roleLabel(null)).toBe('Unbekannt');
        expect(roleLabel(undefined)).toBe('Unbekannt');
        expect(roleLabel('bogus')).toBe('Unbekannt');
    });
});
