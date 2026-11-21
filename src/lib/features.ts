/**
 * Features that are built but not released to members yet. Admins always see
 * them, so they can be tried in production before launch.
 *
 * To release one, set its flag to true and ship a new build or update.
 */

/** Sunday Runs (events, carpools) and the Members list. */
export const RUNS_RELEASED = false;

/** Whether this user sees Sunday Runs and Members: tabs, and runs on Home and the Calendar. */
export function showRuns(isAdmin: boolean): boolean {
  return RUNS_RELEASED || isAdmin;
}
