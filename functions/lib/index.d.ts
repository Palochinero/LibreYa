import * as functions from 'firebase-functions';
export declare const publishParkingSpace: functions.HttpsFunction & functions.Runnable<any>;
export declare const findAndAssignParkingSpace: functions.HttpsFunction & functions.Runnable<any>;
export { cancelParkingSpace } from './cancelParkingSpace';
export { deleteParkingSpace } from './deleteParkingSpace';
export declare const completeParkingSpace: functions.HttpsFunction & functions.Runnable<any>;
export { autoExpireParkingSpace } from './autoExpireParkingSpace';
export { penalizeAbusers } from './penalizeAbusers';
export { reportUser } from './reportUser';
export { geoIndexParkingSpace } from './geoIndexParkingSpace';
export { trackParkingSpace } from './trackParkingSpace';
export { getTrackingInfo } from './getTrackingInfo';
export { cancelWithPenalty } from './cancelWithPenalty';
export { checkPublishLimits } from './checkPublishLimits';
export { checkParkingAvailability } from './checkParkingAvailability';
//# sourceMappingURL=index.d.ts.map