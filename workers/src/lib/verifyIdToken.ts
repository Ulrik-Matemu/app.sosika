/**
 * Firebase ID token verification without the Admin SDK. Uses `jose` (Web
 * Crypto based, Workers-compatible) to check the RS256 signature against
 * Google's published JWKS, then verifies the Firebase-specific issuer/
 * audience so a token from an unrelated Firebase project can't pass.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface VerifiedUser {
  uid: string;
  admin: boolean;
  email?: string;
}

export async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<VerifiedUser> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) throw new Error("Token missing sub claim.");
  if (typeof payload.auth_time === "number" && payload.auth_time * 1000 > Date.now() + 5000) {
    throw new Error("Token auth_time is in the future.");
  }

  return {
    uid: payload.sub,
    admin: payload.admin === true,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
