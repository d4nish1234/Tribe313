"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authAdmin = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
// firebase-admin 13+ dropped the namespaced API (admin.apps, admin.firestore()).
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
exports.db = (0, firestore_1.getFirestore)();
exports.authAdmin = (0, auth_1.getAuth)();
//# sourceMappingURL=admin.js.map