import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, collection, query, where, runTransaction, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useOrders } from "./OrdersContext";

export const normalizePhone = (raw: string): string => {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "").trim();
  if (digits.startsWith("0")) {
    digits = "255" + digits.substring(1);
  } else if (/^[678]/.test(digits)) {
    digits = "255" + digits;
  }
  return `+${digits}`;
};

export interface WalletTransaction {
  id: string;
  phone: string;
  amount: number;
  type: "photo_reward" | "manual_topup" | "gateway_topup" | "order_payment" | "admin_adjustment";
  description: string;
  referenceId?: string;
  timestamp?: any;
}

interface WalletContextType {
  balance: number;
  transactions: WalletTransaction[];
  loading: boolean;
  phone: string | null;
  deductWalletBalance: (amount: number, description: string, referenceId?: string) => Promise<boolean>;
  creditWalletBalance: (targetPhone: string, amount: number, description: string, referenceId?: string, type?: WalletTransaction["type"]) => Promise<boolean>;
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

    // 3. Automatic Photo Reward Reconciliation
    // Checks if any food_photo_submissions were approved (even in Firestore console) without a credited transaction
    const syncApprovedRewards = async () => {
      try {
        const photoQ = query(
          collection(db, "food_photo_submissions"),
          where("phone", "in", phonesToMatch),
          where("status", "==", "approved")
        );
        const photoSnap = await getDocs(photoQ);

        photoSnap.forEach(async (subDoc) => {
          const subData = subDoc.data();
          const subId = subDoc.id;

          // Check if transaction log already exists for this submission
          const txCheckQ = query(
            collection(db, "wallet_transactions"),
            where("referenceId", "==", subId)
          );
          const txCheckSnap = await getDocs(txCheckQ);

          if (txCheckSnap.empty) {
            // Auto-credit reward for this approved submission
            const rewardAmt = subData.rewardAmount || 1000;
            await creditWalletBalance(
              formattedPhone,
              rewardAmt,
              `Reward for approved food photo (${subData.menuItemName || "Meal"})`,
              subId,
              "photo_reward"
            );
          }
        });
      } catch (err) {
        console.warn("[WalletContext] Sync approved rewards warning:", err);
      }
    };

    syncApprovedRewards();

    return () => {
      unsubWallet();
      unsubTx();
    };
  }, [formattedPhone, rawDigitsPhone]);

  // Helper: Atomic deduction
  const deductWalletBalance = async (amount: number, description: string, referenceId?: string): Promise<boolean> => {
    if (!formattedPhone || amount <= 0) return false;
    const walletRef = doc(db, "wallets", formattedPhone);
    const txRef = doc(collection(db, "wallet_transactions"));

    try {
      await runTransaction(db, async (transaction) => {
        const walletSnap = await transaction.get(walletRef);
        const currentBal = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;

        if (currentBal < amount) {
          throw new Error("Insufficient wallet balance.");
        }

        const newBal = currentBal - amount;
        transaction.set(walletRef, { phone: formattedPhone, balance: newBal, updatedAt: serverTimestamp() }, { merge: true });
        transaction.set(txRef, {
          id: txRef.id,
          phone: formattedPhone,
          amount: -amount,
          type: "order_payment",
          description,
          referenceId: referenceId || "",
          timestamp: serverTimestamp(),
        });
      });
      return true;
    } catch (err) {
      console.error("[WalletContext] Deduct balance failed:", err);
      return false;
    }
  };

  // Helper: Credit wallet balance (for Admin / Rewards)
  const creditWalletBalance = async (
    targetPhone: string,
    amount: number,
    description: string,
    referenceId?: string,
    type: WalletTransaction["type"] = "admin_adjustment"
  ): Promise<boolean> => {
    const cleanTargetPhone = normalizePhone(targetPhone);
    if (!cleanTargetPhone || amount <= 0) return false;
    const walletRef = doc(db, "wallets", cleanTargetPhone);
    const txRef = doc(collection(db, "wallet_transactions"));

    try {
      await runTransaction(db, async (transaction) => {
        const walletSnap = await transaction.get(walletRef);
        const currentBal = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;
        const newBal = currentBal + amount;

        transaction.set(walletRef, { phone: cleanTargetPhone, balance: newBal, updatedAt: serverTimestamp() }, { merge: true });
        transaction.set(txRef, {
          id: txRef.id,
          phone: cleanTargetPhone,
          amount: amount,
          type,
          description,
          referenceId: referenceId || "",
          timestamp: serverTimestamp(),
        });
      });
      return true;
    } catch (err) {
      console.error("[WalletContext] Credit balance failed:", err);
      return false;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        loading,
        phone: formattedPhone,
        deductWalletBalance,
        creditWalletBalance,
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
