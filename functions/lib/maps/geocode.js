"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodeAddress = void 0;
const https_1 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("../lib/config");
exports.geocodeAddress = (0, https_1.onCall)({ secrets: [config_1.GOOGLE_MAPS_KEY] }, async (req) => {
    if (!req.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Login required');
    const address = (req.data?.address ?? '').trim();
    if (!address)
        throw new https_1.HttpsError('invalid-argument', 'address required');
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', config_1.GOOGLE_MAPS_KEY.value());
    const res = await (0, node_fetch_1.default)(url.toString());
    const body = (await res.json());
    if (body.status !== 'OK' || !body.results?.length) {
        throw new https_1.HttpsError('not-found', `Geocoding failed: ${body.status}`);
    }
    const r = body.results[0];
    const loc = r.geometry?.location;
    if (!loc)
        throw new https_1.HttpsError('not-found', 'No location');
    return {
        lat: loc.lat,
        lng: loc.lng,
        formattedAddress: r.formatted_address ?? address,
    };
});
//# sourceMappingURL=geocode.js.map