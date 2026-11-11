"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendSeries = exports.onSeriesWrite = void 0;
exports.syncSeries = syncSeries;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_2 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
const push_1 = require("../push");
const recurrence_1 = require("../shared/recurrence");
/**
 * Recurring events. An admin saves a series in `eventSeries`; these functions
 * keep real `events` docs for the next 5 weeks of it (src/shared/recurrence.ts
 * says which dates). Generated events are ordinary events plus `seriesId` and
 * `seriesDate`, so RSVPs, rides and attendance work unchanged.
 *
 * - A series is created or edited: sync its future events straight away.
 *   A new series also tells everyone once ("New weekly event").
 * - Every night: sync every series, so the 5-week window keeps rolling.
 * - A series is deleted: remove its future events that nobody has RSVPed to.
 *
 * Syncing is idempotent: event ids are `<seriesId>_<date>`, so running twice
 * (retries, overlapping runs) never makes a second event for a date. The
 * trigger syncs from a fresh read of the series, so late triggers can't undo
 * a newer edit or a delete.
 */
function ruleOf(s) {
    return {
        repeat: s.repeat,
        startDate: s.startDate,
        timeOfDay: s.timeOfDay,
        monthlyWeek: s.monthlyWeek ?? null,
        endDate: s.endDate ?? null,
        skipDates: s.skipDates ?? [],
    };
}
/** The series' future events, and whether each has any RSVPs or rides (which make it keep). */
async function futureEvents(seriesId, now) {
    const snap = await admin_1.db.collection('events').where('seriesId', '==', seriesId).get();
    return snap.docs.filter((d) => d.data().startsAt.toMillis() > now);
}
/** Delete an event unless people have RSVPed or asked for rides; returns whether it went. */
async function removeIfUnused(id) {
    const ref = admin_1.db.doc(`events/${id}`);
    const [rsvps, rides] = await Promise.all([
        ref.collection('rsvps').limit(1).get(),
        ref.collection('rides').limit(1).get(),
    ]);
    if (!rsvps.empty || !rides.empty)
        return false;
    await ref.delete();
    return true;
}
async function syncSeries(seriesId, series, now = Date.now()) {
    const docs = await futureEvents(seriesId, now);
    const existing = docs.map((d) => ({ id: d.id, date: d.data().seriesDate }));
    const wanted = series ? (0, recurrence_1.upcomingOccurrences)(ruleOf(series), now) : [];
    const plan = (0, recurrence_1.planSync)(wanted, existing);
    const details = series
        ? {
            title: series.title,
            description: series.description ?? '',
            location: series.location,
            seriesLabel: (0, recurrence_1.describeRepeat)(ruleOf(series)),
        }
        : null;
    let created = 0;
    for (const o of plan.create) {
        try {
            await admin_1.db.doc(`events/${(0, recurrence_1.occurrenceId)(seriesId, o.date)}`).create({
                ...details,
                startsAt: firestore_2.Timestamp.fromMillis(o.startsAt),
                seriesId,
                seriesDate: o.date,
                createdBy: series.createdBy,
                createdAt: firestore_2.FieldValue.serverTimestamp(),
            });
            created++;
        }
        catch (e) {
            // 6 = ALREADY_EXISTS: another run made it first. Anything else is real.
            if (e?.code !== 6)
                throw e;
        }
    }
    // Edits to the series (title, place, time) reach events that haven't happened.
    // Only write events that differ, so the nightly run doesn't rewrite them all.
    const byId = new Map(docs.map((d) => [d.id, d.data()]));
    let updated = 0;
    for (const u of plan.update) {
        const want = { ...details, startsAt: firestore_2.Timestamp.fromMillis(u.startsAt) };
        const have = byId.get(u.id);
        const same = have.title === want.title &&
            have.description === want.description &&
            have.seriesLabel === want.seriesLabel &&
            JSON.stringify(have.location) === JSON.stringify(want.location) &&
            have.startsAt.toMillis() === u.startsAt;
        if (same)
            continue;
        await admin_1.db.doc(`events/${u.id}`).update(want);
        updated++;
    }
    let removed = 0;
    for (const id of plan.remove)
        if (await removeIfUnused(id))
            removed++;
    console.log(`series ${seriesId}: +${created} ~${updated} -${removed}/${plan.remove.length}`);
}
exports.onSeriesWrite = (0, firestore_1.onDocumentWritten)('eventSeries/{seriesId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data() ?? null;
    const { seriesId } = event.params;
    // Sync from the series as it is now, not the copy this trigger carries.
    // Triggers can run out of order: an edit's trigger arriving after the delete's
    // would otherwise recreate events for a series that's gone.
    const current = await admin_1.db.doc(`eventSeries/${seriesId}`).get();
    await syncSeries(seriesId, current.exists ? current.data() : null);
    // The push still uses before/after: it's about this write being a create.
    if (after && !before && current.exists) {
        const word = after.repeat === 'weekly' ? 'weekly' : after.repeat === 'biweekly' ? 'every-2-weeks' : 'monthly';
        await (0, push_1.sendPushes)(await (0, push_1.targetsForAllApproved)(after.createdBy), {
            title: `New ${word} event`,
            body: `${after.title} · ${(0, recurrence_1.describeRepeat)(ruleOf(after))} at ${(0, recurrence_1.formatTimeOfDay)(after.timeOfDay)}`,
            data: { type: 'series', seriesId },
        });
    }
});
/** Every night, roll each series' 5-week window forward. */
exports.extendSeries = (0, scheduler_1.onSchedule)({ schedule: 'every day 03:00', timeZone: recurrence_1.TIME_ZONE }, async () => {
    const all = await admin_1.db.collection('eventSeries').get();
    for (const s of all.docs) {
        try {
            await syncSeries(s.id, s.data());
        }
        catch (e) {
            console.error(`series ${s.id} failed`, e); // one bad series shouldn't stop the rest
        }
    }
});
//# sourceMappingURL=series.js.map