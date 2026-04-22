"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirections = void 0;
const https_1 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("../lib/config");
const encode = (p) => `${p.lat},${p.lng}`;
exports.getDirections = (0, https_1.onCall)({ secrets: [config_1.GOOGLE_MAPS_KEY] }, async (req) => {
    if (!req.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Login required');
    const { origin, destination, waypoints, optimize } = req.data ?? {};
    if (!origin || !destination)
        throw new https_1.HttpsError('invalid-argument', 'origin & destination required');
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', encode(origin));
    url.searchParams.set('destination', encode(destination));
    if (waypoints?.length) {
        const wp = (optimize ? 'optimize:true|' : '') + waypoints.map(encode).join('|');
        url.searchParams.set('waypoints', wp);
    }
    url.searchParams.set('key', config_1.GOOGLE_MAPS_KEY.value());
    const res = await (0, node_fetch_1.default)(url.toString());
    const body = (await res.json());
    if (body.status !== 'OK' || !body.routes?.length) {
        throw new https_1.HttpsError('not-found', `Directions failed: ${body.status}`);
    }
    const route = body.routes[0];
    const polyline = route.overview_polyline?.points ?? '';
    const durationSec = (route.legs ?? []).reduce((a, l) => a + (l.duration?.value ?? 0), 0);
    const distanceMeters = (route.legs ?? []).reduce((a, l) => a + (l.distance?.value ?? 0), 0);
    return {
        polyline,
        durationSec,
        distanceMeters,
        order: route.waypoint_order,
    };
});
//# sourceMappingURL=directions.js.map