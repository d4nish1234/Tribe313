#!/usr/bin/env node
/**
 * Fills the local Auth and Firestore emulators with test accounts and
 * benchmarks, so the app can be tried end to end without touching live data.
 *
 *   npm run emulators        (in one terminal)
 *   npm run emulators:seed   (in another, once they're up)
 *
 * Safe to run again: it overwrites the same documents. Everything goes to the
 * `demo-tribe313` project, which Firebase never connects to real resources.
 *
 * Accounts (password for all: test1234):
 *   coach@test.local    approved admin (coach), with two benchmarks
 *   member@test.local   approved member, with two benchmarks and a coach extra
 *   pending@test.local  waiting for approval
 */

const PROJECT = 'demo-tribe313';
const HOST = process.env.EMULATOR_HOST || '127.0.0.1';
const AUTH = `http://${HOST}:${process.env.AUTH_EMULATOR_PORT || 9099}`;
const FIRESTORE = `http://${HOST}:${process.env.FIRESTORE_EMULATOR_PORT || 8181}`;
const PASSWORD = 'test1234';
// The emulators accept "owner" as an admin token: it skips security rules.
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

async function call(url, body, headers = { 'Content-Type': 'application/json' }, method = 'POST') {
  const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${url}: ${JSON.stringify(json)}`), { json });
  return json;
}

/** Create the account, or find it if it already exists. Returns its uid. */
async function account(email, { admin }) {
  const idt = `${AUTH}/identitytoolkit.googleapis.com/v1`;
  let uid;
  try {
    uid = (await call(`${idt}/accounts:signUp?key=demo`, { email, password: PASSWORD, returnSecureToken: true })).localId;
  } catch (e) {
    if (!JSON.stringify(e.json ?? '').includes('EMAIL_EXISTS')) throw e;
    uid = (await call(`${idt}/accounts:signInWithPassword?key=demo`, { email, password: PASSWORD, returnSecureToken: true }))
      .localId;
  }
  await call(
    `${idt}/projects/${PROJECT}/accounts:update`,
    { localId: uid, emailVerified: true, customAttributes: JSON.stringify(admin ? { admin: true } : {}) },
    OWNER,
  );
  return uid;
}

/** JS value → Firestore REST value. */
function value(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, value(x)])) } };
}

async function put(path, data) {
  const url = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
  await call(url, { fields: value(data).mapValue.fields }, OWNER, 'PATCH');
}

function user(uid, email, firstName, lastName, { status, isAdmin }) {
  return put(`users/${uid}`, {
    uid,
    firstName,
    lastName,
    email,
    shareLocation: false,
    emailVerified: true,
    status,
    isAdmin,
    notificationsEnabled: false,
    badges: [],
    attendedEventIds: [],
    missedEventCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/** One benchmark with every v1 test logged. */
function session(uid, date, bodyweight, results, wallSquatFaults = []) {
  return put(`benchmarkProfiles/${uid}/benchmarkSessions/${date}`, {
    date,
    version: 1,
    bodyweight,
    heightIn: 70,
    results,
    wallSquatFaults,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function main() {
  try {
    await fetch(`${AUTH}/`);
    await fetch(`${FIRESTORE}/`);
  } catch {
    console.error(`Can't reach the emulators at ${HOST}. Start them first: npm run emulators`);
    process.exit(1);
  }

  const coach = await account('coach@test.local', { admin: true });
  const member = await account('member@test.local', { admin: false });
  const pending = await account('pending@test.local', { admin: false });

  await user(coach, 'coach@test.local', 'Coach', 'Test', { status: 'approved', isAdmin: true });
  await user(member, 'member@test.local', 'Member', 'Test', { status: 'approved', isAdmin: false });
  await user(pending, 'pending@test.local', 'Pending', 'Test', { status: 'pending', isAdmin: false });

  for (const [uid, name] of [
    [coach, 'Coach Test'],
    [member, 'Member Test'],
  ]) {
    await put(`benchmarkProfiles/${uid}`, { name, heightIn: 70, updatedAt: new Date() });
  }

  // A mixed member: Foundation on pull-ups and the one-leg wall sit, Level 3 on the sled.
  await session(
    member,
    '2026-10-02',
    188,
    {
      splat: 10, bj: 74, farmer: 130, sled: 2, sledlb: 190, dl: 285, bench: 4, pull: 3, hrp: 18,
      hang: 50, plank: 110, ws2: 55, ws1l: 40, ws1r: 35, run: 205, bike: 80,
    },
    ['ankle'],
  );
  await session(member, '2026-11-06', 185, {
    splat: 8, bj: 76, farmer: 150, sled: 5, sledlb: 185, dl: 300, bench: 6, pull: 5, hrp: 22,
    hang: 65, plank: 125, ws2: 70, ws1l: 55, ws1r: 48, run: 195, bike: 74,
  });
  await put(`benchmarkProfiles/${member}/benchmarkAssignments/seed-towel-hang`, {
    text: 'Towel hang 3×20 sec',
    note: 'After every workout',
    addedBy: coach,
    addedByName: 'Coach',
    createdAt: new Date(),
  });

  await session(coach, '2026-10-02', 200, {
    splat: 4, bj: 86, farmer: 210, sled: 4, sledlb: 200, dl: 420, bench: 12, pull: 16, hrp: 34,
    hang: 100, plank: 160, ws2: 100, ws1l: 95, ws1r: 92, run: 178, bike: 58,
  });
  await session(coach, '2026-11-06', 198, {
    splat: 2, bj: 90, farmer: 300, sled: 5, sledlb: 200, dl: 500, bench: 15, pull: 20, hrp: 40,
    hang: 120, plank: 180, ws2: 120, ws1l: 120, ws1r: 125, run: 165, bike: 50,
  });

  console.log(`Seeded ${PROJECT}. Sign in with coach@test.local, member@test.local or pending@test.local, password ${PASSWORD}.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
