import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useOrders } from "./OrdersContext";
import { toE164 } from "../lib/phone";

/**
 * E.164 form, `+255…` — the shape `wallets/{phone}` document ids use.
 * Parsing is shared with the rest of the app via src/lib/phone.ts.
 */
export const normalizePhone = (raw: string): string => toE164(raw);

export interface WalletTransaction {
  id: string;
  phone: string;
  amount: number;
  type: "photo_reward" | "manual_topup" | "gateway_topup" | "order_payment" | "admin_adjustment" | "refund";
  description: string;
  referenceId?: string;
  timestamp?: any;
}

interface WalletContextType {
  balance: number;
  transactions: WalletTransaction[];
  loading: boolean;
  phone: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userPhone } = useOrders();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const formattedPhone = userPhone ? normalizePhone(userPhone) : null;
  const rawDigitsPhone = formattedPhone ? formattedPhone.replace(/\D/g, "") : null;

  useEffect(() => {
    if (!formattedPhone) {
      setBalance(0);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Stream wallet document for formatted phone (+255...)
    const walletRef = doc(db, "wallets", formattedPhone);
    const unsubWallet = onSnapshot(
      walletRef,
      (snap) => {
        if (snap.exists()) {
          setBalance(snap.data().balance || 0);
        } else if (rawDigitsPhone) {
          // Check fallback doc key without '+' prefix if any
          const altRef = doc(db, "wallets", rawDigitsPhone);
          onSnapshot(altRef, (altSnap) => {
            if (altSnap.exists()) {
              setBalance(altSnap.data().balance || 0);
            } else {
              setBalance(0);
            }
          });
        } else {
          setBalance(0);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("[WalletContext] Wallet stream error:", err);
        setLoading(false);
      }
    );

    // 2. Stream transactions for user phone
    const phonesToMatch = [formattedPhone, rawDigitsPhone].filter(Boolean) as string[];
    const q = query(
      collection(db, "wallet_transactions"),
      where("phone", "in", phonesToMatch)
    );
    const unsubTx = onSnapshot(
      q,
      (snap) => {
        const list: WalletTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WalletTransaction));
        list.sort((a, b) => {
          const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp || 0).getTime();
          const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp || 0).getTime();
          return tB - tA;
        });
        setTransactions(list);
      },
      (err) => {
        console.warn("[WalletContext] Transactions stream error:", err);
      }
    );

    // Photo-reward crediting now happens server-side: the
    // onFoodPhotoApproved Cloud Function trigger (functions/src/wallet.ts)
    // credits the wallet the moment an admin approves a submission, reading
    // the reward amount from system_settings rather than trusting the
    // submission's own (client-writable) rewardAmount field. There is
    // nothing left for the client to reconcile here.

    return () => {
      unsubWallet();
      unsubTx();
    };
  }, [formattedPhone, rawDigitsPhone]);

  // Wallet writes (debiting at checkout, crediting rewards/top-ups/refunds)
  // are server-authoritative — see functions/src/wallet.ts. This context is
  // now read-only: it streams the balance and transaction history and lets
  // the rest of the app react to them.
  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        loading,
        phone: formattedPhone,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
};
