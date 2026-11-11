"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remindTomorrow = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
const push_1 = require("../push");
const recurrence_1 = require("../shared/recurrence");
/**
 * The evening before: "Tomorrow: Workout · 8:00 AM · Aspire" for every event
 * happening tomorrow (Toronto calendar day), one-off or recurring. Goes to
 * everyone with notifications on, except people who've RSVPed "no".
 * `reminderSentAt` makes a retry or a second run skip events already done.
 */
exports.remindTomorrow = (0, scheduler_1.onSchedule)({ schedule: 'every day 18:00', timeZone: recurrence_1.TIME_ZONE }, async () => {
    const tomorrow = (0, recurrence_1.addDays)((0, recurrence_1.dateIn)(Date.now()), 1);
    const from = firestore_1.Timestamp.fromMillis((0, recurrence_1.zonedTime)(tomorrow, '00:00'));
    const to = firestore_1.Timestamp.fromMillis((0, recurrence_1.zonedTime)((0, recurrence_1.addDays)(tomorrow, 1), '00:00'));
    const events = await admin_1.db.collection('events').where('startsAt', '>=', from).where('startsAt', '<', to).get();
    if (events.empty)
        return;
    const everyone = await (0, push_1.targetsForAllApproved)();
    for (const ev of events.docs) {
        const data = ev.data();
        if (data.reminderSentAt)
            continue;
        const declined = await ev.ref.collection('rsvps').where('status', '==', 'no').get();
        const out = new Set(declined.docs.map((d) => d.id));
        const time = (0, recurrence_1.formatTimeOfDay)((0, recurrence_1.timeIn)(data.startsAt.toMillis()));
        // Mark first: a crash after sending would otherwise send twice on retry,
        // and a missed reminder is the lesser problem.
        await ev.ref.update({ reminderSentAt: firestore_1.FieldValue.serverTimestamp() });
        await (0, push_1.sendPushes)(everyone.filter((t) => !out.has(t.uid)), {
            title: `Tomorrow: ${data.title}`,
            body: [time, data.location?.label].filter(Boolean).join(' · '),
            data: { type: 'event', eventId: ev.id },
        });
    }
});
//# sourceMappingURL=reminders.js.map