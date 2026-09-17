/**
 * Mirrors firebase-functions' HttpsError {code, message} shape closely
 * enough that frontend error handling written against the old callables
 * doesn't need to change semantics, just the transport.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const unauthenticated = (message = "You must be signed in to perform this action.") =>
  new HttpError(401, "unauthenticated", message);

export const permissionDenied = (message = "This action is restricted to Sosika administrators.") =>
  new HttpError(403, "permission-denied", message);

export const invalidArgument = (message: string) => new HttpError(400, "invalid-argument", message);

export const notFound = (message: string) => new HttpError(404, "not-found", message);

export const internal = (message: string) => new HttpError(500, "internal", message);
