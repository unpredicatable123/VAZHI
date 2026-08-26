import { FirebaseError } from 'firebase/app';
const errorMap = {
    'unauthenticated': { code: 'unauthenticated', messageKey: 'auth_error_invalid' },
    'auth/user-token-expired': { code: 'unauthenticated', messageKey: 'auth_error_invalid' },
    'auth/invalid-credential': { code: 'invalid_request', messageKey: 'auth_error_invalid' },
    'permission-denied': { code: 'permission_denied', messageKey: 'auth_wrong_role' },
    'functions/permission-denied': { code: 'permission_denied', messageKey: 'auth_wrong_role' },
    'failed-precondition': { code: 'failed_precondition', messageKey: 'payment_error_body' },
    'functions/failed-precondition': { code: 'failed_precondition', messageKey: 'payment_error_body' },
    'already-exists': { code: 'already_exists', messageKey: 'payment_error_body' },
    'functions/already-exists': { code: 'already_exists', messageKey: 'payment_error_body' },
    'resource-exhausted': { code: 'resource_exhausted', messageKey: 'payani_error_busy' },
    'functions/resource-exhausted': { code: 'resource_exhausted', messageKey: 'payani_error_busy' },
    'functions/unavailable': { code: 'network', messageKey: 'payani_error_generic' },
    'not-found': { code: 'not_found', messageKey: 'tracking_error_body' },
    'functions/not-found': { code: 'not_found', messageKey: 'tracking_error_body' },
    'firebase/not-configured': { code: 'network', messageKey: 'payment_error_body' }
};
export function mapFirebaseError(error, fallbackKey = 'payment_error_body') {
    const code = error instanceof FirebaseError ? error.code : error instanceof Error ? error.message : '';
    return errorMap[code] ?? { code: 'unknown', messageKey: fallbackKey };
}
