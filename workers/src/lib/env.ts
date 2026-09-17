import type { ServiceAccount } from "./firestoreRest";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  ANDROID_PACKAGE_NAME: string;
  GEMINI_API_KEY: string;
  MESEJI_API_KEY: string;
  PLAY_SERVICE_ACCOUNT_KEY: string;
  FIRESTORE_SERVICE_ACCOUNT_KEY: string;
}

export function firestoreServiceAccount(env: Env): ServiceAccount {
  return JSON.parse(env.FIRESTORE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
}

export function playServiceAccount(env: Env): ServiceAccount {
  return JSON.parse(env.PLAY_SERVICE_ACCOUNT_KEY) as ServiceAccount;
}

export interface Variables {
  user?: { uid: string; admin: boolean; email?: string };
}
