import { displayName, firstName, realName } from '@/lib/auth/displayName';
import { mapProfileToUser } from '@/lib/hooks/useAuthBootstrapper';

describe('names, never email addresses', () => {
  it('uses a real name when there is one', () => {
    expect(displayName({ name: 'Lea Beispiel', email: 'lea@beispiel.test', role: 'owner' })).toBe('Lea Beispiel');
    expect(firstName({ name: 'Lea Beispiel', email: 'lea@beispiel.test' })).toBe('Lea');
  });

  it('never shows an email address or its local part as a name', () => {
    expect(realName('lea@beispiel.test', 'lea@beispiel.test')).toBe('');
    expect(realName('lea', 'lea@beispiel.test')).toBe('');
    expect(firstName({ name: 'lea.k@beispiel.test', email: 'lea.k@beispiel.test' })).toBe('');
  });

  it('never falls back to a gendered role word without a name', () => {
    expect(displayName({ name: '', email: 'lea@beispiel.test', role: 'owner' })).toBe('');
    expect(displayName({ email: 'team@beispiel.test', role: 'member' })).toBe('');
    expect(firstName({ name: 'Marius', email: 'marius@saimor.world' })).toBe('Marius');
    expect(displayName({ name: 'Marius Länder', email: 'm@x.test', role: 'owner' })).toBe('Marius Länder');
  });

  it('maps a CORE profile without full_name to a name, not to the email', () => {
    const user = mapProfileToUser({ user_id: 'u1', email: 'lea@beispiel.test', role: 'owner', tenant_id: 't1' } as never);
    expect(user.name).toBe('');
    expect(user.email).toBe('lea@beispiel.test');
  });
});
