import { todayGreetingName } from '@/features/today/data/greeting';

describe('Today greeting on small screens', () => {
  it('keeps an ordinary first name instead of the full profile', () => {
    expect(todayGreetingName('Marius Fahrländer')).toBe('Marius');
    expect(todayGreetingName(' Luana Lumina ')).toBe('Luana');
  });

  it('uses only the local part when a profile name is an email fallback', () => {
    expect(todayGreetingName('test-a@local.example.test')).toBe('test-a');
    expect(todayGreetingName('really.long.account@example.test')).toBe('really.long.account');
  });

  it('uses the email only if the name is missing and handles empty values', () => {
    expect(todayGreetingName('   ', 'some.user@local.example.test')).toBe('some.user');
    expect(todayGreetingName(null, null)).toBeNull();
  });
});
