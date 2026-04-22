"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEventCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const push_1 = require("../push");
exports.onEventCreate = (0, firestore_1.onDocumentCreated)('events/{eventId}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const targets = await (0, push_1.targetsForAllApproved)();
    await (0, push_1.sendPushes)(targets, {
        title: 'New event',
        body: `${data.title} · ${data.location?.label ?? ''}`.trim(),
        data: { type: 'event', eventId: event.params.eventId },
    });
});
//# sourceMappingURL=onEventCreate.js.map