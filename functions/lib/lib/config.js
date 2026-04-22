"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_ALLOWLIST = exports.GOOGLE_MAPS_KEY = void 0;
exports.adminEmails = adminEmails;
const params_1 = require("firebase-functions/params");
// Configured via: firebase functions:secrets:set GOOGLE_MAPS_KEY
exports.GOOGLE_MAPS_KEY = (0, params_1.defineSecret)('GOOGLE_MAPS_KEY');
// Configured via: firebase functions:config (or project params).
// Comma-separated list of admin emails that get auto-promoted on first login.
exports.ADMIN_ALLOWLIST = (0, params_1.defineString)('ADMIN_ALLOWLIST', { default: '' });
function adminEmails() {
    return exports.ADMIN_ALLOWLIST.value()
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}
//# sourceMappingURL=config.js.map