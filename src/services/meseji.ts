import { sendSmsViaWorker } from "./workerApi";

// The Meseji API key no longer lives in the client bundle — it was
// previously read from VITE_MESEJI_API_KEY, which Vite compiles into
// dist/assets/*.js and anyone can read. The send now goes through the
// sendSms Worker endpoint (workers/src/routes/sms.ts), which holds the key
// as a server-side secret and validates that `toPhone` is actually a party
// to `orderId` before relaying to Meseji.
interface SendSmsResult {
  success: boolean;
  message?: string;
}

export const sendMesejiSMS = async (
  toPhone: string,
  message: string,
  orderId: string
): Promise<SendSmsResult | undefined> => {
  try {
    return await sendSmsViaWorker({ toPhone, message, orderId });
  } catch (error) {
    console.warn(`Meseji SMS failed for [${toPhone}]:`, error);
    return undefined;
  }
};
