/**
 * Firebase Error Translator for Sosika Vendor Portal
 */

const FIREBASE_ERROR_MAP: Record<string, string> = {
  // Authentication Errors
  "auth/wrong-password": "Incorrect password. Please verify and try again.",
  "auth/user-not-found": "No registered vendor found with this email. Please check the spelling or sign up.",
  "auth/invalid-credential": "The credentials provided are invalid or expired. Please check your email/phone and password.",
  "auth/email-already-in-use": "This email address is already registered. If it belongs to you, please sign in.",
  "auth/weak-password": "Password is too weak. Please use at least 6 characters (using uppercase letters, numbers, and symbols is recommended).",
  "auth/invalid-email": "The email address entered is not valid. Check for typos.",
  "auth/too-many-requests": "Access has been temporarily blocked due to multiple failed login attempts. Please reset your password or try again later.",
  "auth/network-request-failed": "Network connection error. Please verify your internet availability and retry.",
  "auth/user-disabled": "This vendor account has been disabled. Please contact Sosika administrator support.",
  "auth/operation-not-allowed": "Authentication configuration error. Please contact administrator support.",
  "auth/requires-recent-login": "Please log in again before performing this sensitive security update.",

  // Firestore & General DB errors
  "permission-denied": "Access Denied. You do not have permissions to read/write this resource.",
  "unavailable": "The database service is temporarily unavailable. Please check your network and retry.",
  "not-found": "The requested vendor record was not found.",
};

/**
 * Translates a Firebase error object or code into a clean, localized user-friendly message.
 * @param error The raw error object or string code
 * @param defaultFallback Default message to return if code is unrecognized
 */
export function getFriendlyErrorMessage(error: any, defaultFallback = "An unexpected error occurred. Please try again."): string {
  if (!error) return defaultFallback;

  // Extract code if it's an object
  let code = "";
  if (typeof error === "string") {
    code = error;
  } else if (error && typeof error === "object") {
    code = error.code || error.message || "";
  }

  // Look up translated message
  const matchedMessage = FIREBASE_ERROR_MAP[code];
  if (matchedMessage) return matchedMessage;

  // Search inside message string if exact code match fails (sometimes Firebase errors are formatted differently)
  for (const [key, msg] of Object.entries(FIREBASE_ERROR_MAP)) {
    if (code.toLowerCase().includes(key.toLowerCase())) {
      return msg;
    }
  }

  // Strip Firebase formatting if possible
  if (code.startsWith("Firebase: ")) {
    // e.g. "Firebase: Error (auth/wrong-password)." -> return a cleaned version if we can find the inner paren
    const match = code.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      const innerCode = match[1];
      const innerMsg = FIREBASE_ERROR_MAP[innerCode];
      if (innerMsg) return innerMsg;
    }
    return code.replace("Firebase: ", "").replace(/\(auth\//, "(").trim();
  }

  return defaultFallback;
}
