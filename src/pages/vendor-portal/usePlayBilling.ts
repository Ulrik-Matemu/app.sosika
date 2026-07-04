/**
 * usePlayBilling — Google Play Billing bridge for Sosika Vendor Portal (PWA/TWA)
 *
 * Implements the Digital Goods API + PaymentRequest API flow as described in
 * `playstore_subscription_implementation.md`. This replaces the legacy
 * `AndroidInterface.launchSubscription()` native bridge.
 *
 * Flow:
 *   1. Check Digital Goods API support (`getDigitalGoodsService`)
 *   2. Fetch product details from Play Console
 *   3. Trigger PaymentRequest overlay → user pays → receive purchaseToken
 *   4. Call `verifyVendorSubscription` Cloud Function with the token
 *   5. Complete the PaymentRequest with success/fail
 *
 * NOTE: The Cloud Function `verifyVendorSubscription` must be deployed
 * separately. Until it exists, purchases will go through Play but
 * verification will fail gracefully (subscription won't activate).
 */

import { useState, useCallback, useEffect } from "react";
import { functions, httpsCallable } from "../../firebase";

// ── Type declarations for the Digital Goods API ──────────────────────────
// These are not yet in the standard TypeScript DOM lib, so we declare them
// here to avoid build errors.

interface DigitalGoodsProductDetails {
  itemId: string;
  title: string;
  description: string;
  price: {
    currency: string;
    value: string;
  };
  type: string;
}

interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<DigitalGoodsProductDetails[]>;
  listPurchases(): Promise<any[]>;
}

declare global {
  interface Window {
    getDigitalGoodsService?: (serviceProvider: string) => Promise<DigitalGoodsService>;
  }
}

// ── Constants ────────────────────────────────────────────────────────────

const PLAY_BILLING_PROVIDER = "https://play.google.com/billing";
const VENDOR_PREMIUM_SKU = "sosika_vendor_premium";

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UsePlayBillingReturn {
  /** True if the Digital Goods API is available (TWA/WebView context) */
  isPlayBillingAvailable: boolean;
  /** Initiate a purchase flow for the given SKU */
  handlePurchase: (sku?: string) => Promise<boolean>;
  /** Loading state during purchase/verification */
  purchasing: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Fetched product details from Play Console */
  productDetails: DigitalGoodsProductDetails | null;
  /** Loading state of product details */
  loadingDetails: boolean;
}

export function usePlayBilling(): UsePlayBillingReturn {
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<DigitalGoodsProductDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Feature detection: Digital Goods API is only present in Android TWA/WebView
  const isPlayBillingAvailable =
    typeof window !== "undefined" && "getDigitalGoodsService" in window;

  // Fetch product details automatically on load if billing is available
  useEffect(() => {
    if (!isPlayBillingAvailable || typeof window === "undefined" || !window.getDigitalGoodsService) return;

    const getService = window.getDigitalGoodsService;
    let active = true;
    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const service = await getService(PLAY_BILLING_PROVIDER);
        const details = await service.getDetails([VENDOR_PREMIUM_SKU]);
        if (active && details && details.length > 0) {
          setProductDetails(details[0]);
        }
      } catch (err) {
        console.warn("[usePlayBilling] Failed to fetch product details:", err);
      } finally {
        if (active) setLoadingDetails(false);
      }
    };

    fetchDetails();
    return () => {
      active = false;
    };
  }, [isPlayBillingAvailable]);

  const handlePurchase = useCallback(
    async (sku: string = VENDOR_PREMIUM_SKU): Promise<boolean> => {
      setError(null);
      setPurchasing(true);

      try {
        // ── 1. Resolve the Play Store billing service ──────────────────
        if (!window.getDigitalGoodsService) {
          throw new Error(
            "Digital Goods API is not available. This device may not support Play billing."
          );
        }

        const service = await window.getDigitalGoodsService(PLAY_BILLING_PROVIDER);

        // ── 2. Fetch product details from Play Console ─────────────────
        const details = await service.getDetails([sku]);
        if (details.length === 0) {
          throw new Error(
            `Product "${sku}" not found in Play Console. Ensure the SKU is configured correctly.`
          );
        }

        const product = details[0];

        // ── 3. Build and show the PaymentRequest ───────────────────────
        const request = new PaymentRequest(
          [
            {
              supportedMethods: PLAY_BILLING_PROVIDER,
              data: { sku },
            },
          ],
          {
            total: {
              label: product.title,
              amount: {
                currency: product.price.currency,
                value: product.price.value,
              },
            },
          }
        );

        const response = await request.show();
        const { purchaseToken } = response.details as { purchaseToken: string };

        if (!purchaseToken) {
          await response.complete("fail");
          throw new Error("No purchase token received from Google Play.");
        }

        // ── 4. Verify the purchase on the server ───────────────────────
        // Calls the `verifyVendorSubscription` Cloud Function.
        // This function is responsible for:
        //   - Querying Google Play Developer API with the purchaseToken
        //   - Validating subscription state (expiry, payment state)
        //   - Writing subscription.tier = "premium" + features_enabled flags
        //     to the vendor's Firestore document
        const verifySubscription = httpsCallable<
          { purchaseToken: string; sku: string },
          { success: boolean; message?: string }
        >(functions, "verifyVendorSubscription");

        const result = await verifySubscription({ purchaseToken, sku });
        const verified = result.data.success;

        // ── 5. Complete the PaymentRequest ──────────────────────────────
        await response.complete(verified ? "success" : "fail");

        if (!verified) {
          throw new Error(
            result.data.message ||
              "Subscription verification failed. Please contact support."
          );
        }

        return true;
      } catch (err: any) {
        // Handle user cancellation gracefully (not an error)
        if (err?.name === "AbortError") {
          setError(null);
          return false;
        }

        const message =
          err?.message || "An unexpected error occurred during purchase.";
        setError(message);
        console.error("[usePlayBilling] Purchase failed:", err);
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    []
  );

  return {
    isPlayBillingAvailable,
    handlePurchase,
    purchasing,
    error,
    productDetails,
    loadingDetails,
  };
}
