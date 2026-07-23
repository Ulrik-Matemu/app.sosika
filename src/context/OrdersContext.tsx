import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export interface OrderRecord {
  orderId: string;
  phone: string;
  cart?: any[];
  vendor_name?: string;
  totalAmount: number;
  status: "pending" | "preparing" | "ready_for_pickup" | "delivered" | "declined" | string;
  timestamp?: any;
  deliveryOption?: string;
  displayLocation?: string;
}

interface OrdersContextType {
  orders: OrderRecord[];
  activeOrders: OrderRecord[];
  pastOrders: OrderRecord[];
  activeCount: number;
  loading: boolean;
  userPhone: string | null;
  refreshOrders: () => void;
  setUserPhone: (phone: string) => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [customPhone, setCustomPhone] = useState<string | null>(() => localStorage.getItem("guestPhone"));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const activePhone = user?.phoneNumber || customPhone;

  const fetchOrders = useCallback(() => {
    if (!activePhone) {
      // Fallback: Read local order IDs if no phone set
      try {
        const raw = localStorage.getItem("sosika_placed_orders");
        if (raw) {
          setOrders(JSON.parse(raw));
        }
      } catch (e) {
        console.warn("[OrdersContext] Failed to parse local orders:", e);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    // Index-safe query (no composite orderBy required by Firestore)
    const q = query(collection(db, "orders"), where("phone", "==", activePhone));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: OrderRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ orderId: docSnap.id, ...docSnap.data() } as OrderRecord);
        });

        // Client-side index-safe sorting (newest timestamp first)
        list.sort((a, b) => {
          const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp || 0).getTime();
          const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp || 0).getTime();
          return tB - tA;
        });

        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.warn("[OrdersContext] Firestore query fallback to local orders:", err);
        try {
          const raw = localStorage.getItem("sosika_placed_orders");
          if (raw) setOrders(JSON.parse(raw));
        } catch {}
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activePhone]);

  useEffect(() => {
    const unsub = fetchOrders();
    return () => {
      if (unsub) unsub();
    };
  }, [fetchOrders]);

  const setUserPhone = (phone: string) => {
    localStorage.setItem("guestPhone", phone);
    setCustomPhone(phone);
  };

  const activeOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "preparing" || o.status === "ready_for_pickup"
  );
  const pastOrders = orders.filter(
    (o) => o.status === "delivered" || o.status === "declined"
  );

  return (
    <OrdersContext.Provider
      value={{
        orders,
        activeOrders,
        pastOrders,
        activeCount: activeOrders.length,
        loading,
        userPhone: activePhone,
        refreshOrders: fetchOrders,
        setUserPhone,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) {
    throw new Error("useOrders must be used within an OrdersProvider");
  }
  return ctx;
};
