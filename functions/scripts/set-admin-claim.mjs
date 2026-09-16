#!/usr/bin/env node
/**
 * One-off local script to grant (or revoke) the `admin` custom claim used by
 * Firestore rules (`isAdmin()`) and by src/components/my-components/
 * AdminAuthGuard.tsx on the client. This is NEVER deployed — it lives
 * outside functions/src so `tsc` and `firebase deploy --only functions`
 * never touch it.
 *
 * Usage:
 *   cd functions
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/set-admin-claim.mjs admin@sosika.app
 *
 *   # to revoke:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/set-admin-claim.mjs admin@sosika.app --revoke
 *
 * The service account key can be downloaded from:
 *   Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
 * Never commit that key file. Delete it from disk once you're done.
 *
 * The target user must already exist as a Firebase Auth user (create one via
 * the Firebase Console -> Authentication -> Add user, or have them sign up
 * once through a throwaway flow) before running this script.
 */

import admin from "firebase-admin";

const [, , email, flag] = process.argv;

if (!email) {
  console.error("Usage: node scripts/set-admin-claim.mjs <email> [--revoke]");
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "GOOGLE_APPLICATION_CREDENTIALS is not set. Point it at a Firebase " +
    "service account JSON key (Project Settings -> Service Accounts)."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const revoke = flag === "--revoke";

try {
  const user = await admin.auth().getUserByEmail(email);
  const existingClaims = user.customClaims || {};

  if (revoke) {
    const { admin: _dropped, ...rest } = existingClaims;
    await admin.auth().setCustomUserClaims(user.uid, rest);
    console.log(`Revoked admin claim from ${email} (uid: ${user.uid}).`);
  } else {
    await admin.auth().setCustomUserClaims(user.uid, { ...existingClaims, admin: true });
    console.log(`Granted admin claim to ${email} (uid: ${user.uid}).`);
  }

  console.log(
    "The user must sign out and back in (or wait for their ID token to " +
    "refresh, ~1 hour) before the new claim takes effect in the app."
  );
} catch (err) {
  console.error("Failed to set custom claim:", err.message || err);
  process.exit(1);
}

process.exit(0);
