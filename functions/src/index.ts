import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

export { onUserCreate } from './auth/onUserCreate';
export { promoteAdmin } from './auth/promoteAdmin';
export { approveUser } from './approvals/approveUser';
export { onUserPending, onUserStatusChange } from './approvals/onPendingUser';
export { deactivateUser } from './users/deactivate';
export { reinstateUser } from './users/reinstate';
export { selfDeleteAccount } from './users/selfDelete';
export { onEventCreate } from './events/onEventCreate';
export { onRideRequest } from './rides/onRideRequest';
export { onRideAccept } from './rides/onRideAccept';
export { onRsvpWrite } from './badges/onRsvpWrite';
export { geocodeAddress } from './maps/geocode';
export { getDirections } from './maps/directions';
