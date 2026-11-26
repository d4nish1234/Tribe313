import { groupMembers, isDemoAccount, matchesQuery } from '../members';
import type { AppUser } from '../../types';

const ts = (ms: number) => ({ toMillis: () => ms }) as any;
const user = (first: string, last: string, extra: Partial<AppUser> = {}): AppUser =>
  ({
    uid: `${first}-${last}`,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}@example.com`,
    status: 'approved',
    isAdmin: false,
    ...extra,
  }) as AppUser;

describe('matchesQuery', () => {
  const john = user('John', 'Smith', { email: 'jsmith@mail.com' });

  it('matches everyone on an empty or blank query', () => {
    expect(matchesQuery(john, '', false)).toBe(true);
    expect(matchesQuery(john, '   ', false)).toBe(true);
  });

  it('is case-insensitive and matches every word in any order', () => {
    expect(matchesQuery(john, 'JOHN', false)).toBe(true);
    expect(matchesQuery(john, 'smith jo', false)).toBe(true);
    expect(matchesQuery(john, 'john doe', false)).toBe(false);
  });

  it('ignores accents', () => {
    expect(matchesQuery(user('José', 'Núñez'), 'jose nunez', false)).toBe(true);
  });

  it('only searches email for admins', () => {
    expect(matchesQuery(john, 'mail.com', false)).toBe(false);
    expect(matchesQuery(john, 'mail.com', true)).toBe(true);
  });
});

describe('groupMembers', () => {
  const roster = [
    user('Zed', 'Admin', { isAdmin: true }),
    user('Amy', 'Admin', { isAdmin: true }),
    user('Bob', 'Member', { lastAttendedAt: ts(100) }),
    user('Cat', 'Member', { lastAttendedAt: ts(300) }),
    user('Dan', 'Member'),
    user('Eve', 'Gone', { status: 'evicted' }),
    user('Pat', 'Pending', { status: 'pending' }),
  ];
  const names = (us: AppUser[]) => us.map((u) => u.firstName);

  it('puts admins first, alphabetical, and leaves out pending people', () => {
    const g = groupMembers(roster, { isAdmin: true });
    expect(names(g.admins)).toEqual(['Amy', 'Zed']);
    expect(names(g.members)).toEqual(['Bob', 'Cat', 'Dan']);
    expect(names(g.evicted)).toEqual(['Eve']);
  });

  it('sorts members by last attended for admins, never-attended last', () => {
    const g = groupMembers(roster, { isAdmin: true, sort: 'lastAttended' });
    expect(names(g.members)).toEqual(['Cat', 'Bob', 'Dan']);
    expect(names(g.admins)).toEqual(['Amy', 'Zed']);
  });

  it('ignores the sort and hides evicted people for non-admins', () => {
    const g = groupMembers(roster, { isAdmin: false, sort: 'lastAttended' });
    expect(names(g.members)).toEqual(['Bob', 'Cat', 'Dan']);
    expect(g.evicted).toEqual([]);
  });

  it('filters every section by the search', () => {
    const g = groupMembers(roster, { isAdmin: true, query: 'admin' });
    expect(names(g.admins)).toEqual(['Amy', 'Zed']);
    expect(g.members).toEqual([]);
    expect(groupMembers(roster, { isAdmin: true, query: 'eve' }).evicted).toHaveLength(1);
  });

  it('does not reorder the input array', () => {
    const copy = [...roster];
    groupMembers(roster, { isAdmin: true, sort: 'lastAttended' });
    expect(roster).toEqual(copy);
  });
});

describe('isDemoAccount', () => {
  const demo = (email?: string) => isDemoAccount({ email } as AppUser);

  it('matches the base address and any + alias, ignoring case', () => {
    expect(demo('danishsumroo@gmail.com')).toBe(true);
    expect(demo('danishsumroo+blahblah@gmail.com')).toBe(true);
    expect(demo('danishsumroo+@gmail.com')).toBe(true);
    expect(demo('DanishSumroo+Test1@Gmail.com')).toBe(true);
    expect(demo(' danishsumroo+x@gmail.com ')).toBe(true);
  });

  it('does not match other addresses', () => {
    expect(demo(undefined)).toBe(false);
    expect(demo('')).toBe(false);
    expect(demo('danishsumroo@yahoo.com')).toBe(false);
    expect(demo('xdanishsumroo@gmail.com')).toBe(false);
    expect(demo('danishsumroo2@gmail.com')).toBe(false);
    expect(demo('danishsumroo@gmail.com.evil.com')).toBe(false);
  });
});

describe('groupMembers demo accounts', () => {
  const roster = [
    user('Amy', 'Admin', { isAdmin: true }),
    user('Bob', 'Member'),
    user('Demo', 'Admin', { isAdmin: true, email: 'danishsumroo@gmail.com' }),
    user('Demo', 'Member', { email: 'danishsumroo+one@gmail.com' }),
    user('Demo', 'Gone', { status: 'evicted', email: 'danishsumroo+two@gmail.com' }),
    user('Demo', 'Pending', { status: 'pending', email: 'danishsumroo+three@gmail.com' }),
    user('Eve', 'Gone', { status: 'evicted' }),
  ];
  const full = (us: AppUser[]) => us.map((u) => `${u.firstName} ${u.lastName}`);

  it('moves demo admins, members and evicted accounts into demo only', () => {
    const g = groupMembers(roster, { isAdmin: true });
    expect(full(g.admins)).toEqual(['Amy Admin']);
    expect(full(g.members)).toEqual(['Bob Member']);
    expect(full(g.evicted)).toEqual(['Eve Gone']);
    expect(full(g.demo)).toEqual(['Demo Admin', 'Demo Gone', 'Demo Member']);
  });

  it('hides demo accounts from members entirely', () => {
    const g = groupMembers(roster, { isAdmin: false });
    expect(full([...g.admins, ...g.members, ...g.evicted, ...g.demo])).toEqual(['Amy Admin', 'Bob Member']);
  });

  it('filters demo accounts by the search', () => {
    expect(full(groupMembers(roster, { isAdmin: true, query: 'gone' }).demo)).toEqual(['Demo Gone']);
    expect(full(groupMembers(roster, { isAdmin: true, query: '+one' }).demo)).toEqual(['Demo Member']);
  });
});
