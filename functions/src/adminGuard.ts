import { HttpsError, CallableRequest } from "firebase-functions/v2/https";

/**
 * Guard for callables that must only run for the Sosika admin console.
 * The `admin` custom claim is granted out-of-band via
 * functions/scripts/set-admin-claim.mjs — never by client or function code.
 */
export function assertIsAdmin(request: CallableRequest): asserts request is CallableRequest & {
  auth: NonNullable<CallableRequest["auth"]>;
} {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to perform this action.");
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "This action is restricted to Sosika administrators.");
  }
}
