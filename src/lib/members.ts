import type { AppUser } from '../types';
import { matchesWords } from './search';

export type MemberSort = 'name' | 'lastAttended';

export interface MemberGroups {
  admins: AppUser[];
  members: AppUser[];
  evicted: AppUser[];
}

const fullName = (u: AppUser) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();

/**
 * Does this person match the search box? Every word typed must appear in their
 * name (in any order, so "smith jo" finds "John Smith"). Admins also search
 * emails; members can't, because emails are only shown to admins.
 */
export function matchesQuery(u: AppUser, query: string, searchEmail: boolean): boolean {
  return matchesWords(searchEmail ? `${fullName(u)} ${u.email ?? ''}` : fullName(u), query);
}

const byName = (a: AppUser, b: AppUser) => fullName(a).localeCompare(fullName(b));
const lastMillis = (u: AppUser) => u.lastAttendedAt?.toMillis?.() ?? 0;

/**
 * Split the roster into the sections the Members screen shows, filtered by the
 * search box. Admins are always alphabetical so the leadership list stays put;
 * the sort only reorders members. Evicted people are only for admins, and the
 * sort only applies when an admin chose it.
 */
export function groupMembers(
  all: AppUser[],
  { query = '', sort = 'name', isAdmin = false }: { query?: string; sort?: MemberSort; isAdmin?: boolean },
): MemberGroups {
  const shown = all.filter((u) => matchesQuery(u, query, isAdmin));
  const active = shown.filter((u) => u.status === 'approved');
  const effectiveSort: MemberSort = isAdmin ? sort : 'name';
  const members = active.filter((u) => !u.isAdmin);
  members.sort(effectiveSort === 'name' ? byName : (a, b) => lastMillis(b) - lastMillis(a) || byName(a, b));
  return {
    admins: active.filter((u) => u.isAdmin).sort(byName),
    members,
    evicted: isAdmin ? shown.filter((u) => u.status === 'evicted').sort(byName) : [],
  };
}
