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

export const getPhoneVariations = (rawPhone: string): string[] => {
  const digits = rawPhone.replace(/\D/g, "").trim();
  if (!digits) return [];

  const baseDigits = digits.startsWith("255")
    ? digits.substring(3)
    : digits.startsWith("0")
    ? digits.substring(1)
    : digits;

  const variations = new Set<string>();
  variations.add(`+255${baseDigits}`);
  variations.add(`255${baseDigits}`);
  variations.add(`0${baseDigits}`);
  variations.add(baseDigits);
  variations.add(rawPhone.trim());

  return Array.from(variations).filter(Boolean);
};

const getLocalOrders = (): OrderRecord[] => {
  const localList: OrderRecord[] = [];
  try {
    const rawPlaced = localStorage.getItem("sosika_placed_orders");
    const rawLegacy = localStorage.getItem("placedOrders");
    if (rawPlaced) {
      const parsed = JSON.parse(rawPlaced);
      if (Array.isArray(parsed)) localList.push(...parsed);
    }
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy);
      if (Array.isArray(parsed)) localList.push(...parsed);
    }
  } catch (e) {
    console.warn("[OrdersContext] Failed to parse local orders:", e);
  }
  return localList;
};

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    // Initial sync from local storage for instant render
    const local = getLocalOrders();
    const map = new Map<string, OrderRecord>();
    local.forEach((o) => {
      const id = o.orderId || (o as any).id;
      if (id) map.set(id, { ...o, orderId: id });
    });
    return Array.from(map.values());
  });

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
    const localList = getLocalOrders();

    if (!activePhone) {
      const map = new Map<string, OrderRecord>();
      localList.forEach((o) => {
        const id = o.orderId || (o as any).id;
        if (id) map.set(id, { ...o, orderId: id });
      });
      setOrders(Array.from(map.values()));
      setLoading(false);
      return;
    }

    setLoading(true);
    const phoneVariations = getPhoneVariations(activePhone);

    if (phoneVariations.length === 0) {
      setLoading(false);
      return;
    }

    // Index-safe multi-format query using 'in' operator (up to 10 variations)
    const q = query(
      collection(db, "orders"),
      where("phone", "in", phoneVariations.slice(0, 10))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreList: OrderRecord[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({ orderId: docSnap.id, ...docSnap.data() } as OrderRecord);
        });

        // Merge Firestore orders + Local orders and deduplicate by orderId
        const orderMap = new Map<string, OrderRecord>();

        // 1. Add local orders first
        localList.forEach((o) => {
          const id = o.orderId || (o as any).id;
          if (id) orderMap.set(id, { ...o, orderId: id });
        });

        // 2. Override with live Firestore orders
        firestoreList.forEach((o) => {
          const id = o.orderId || (o as any).id;
          if (id) orderMap.set(id, { ...o, orderId: id });
        });

        const mergedList = Array.from(orderMap.values());
        mergedList.sort((a, b) => {
          const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp || 0).getTime();
          const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp || 0).getTime();
          return tB - tA;
        });

        setOrders(mergedList);
        setLoading(false);
      },
      (err) => {
        console.warn("[OrdersContext] Firestore query fallback to local orders:", err);
        const map = new Map<string, OrderRecord>();
        localList.forEach((o) => {
          const id = o.orderId || (o as any).id;
          if (id) map.set(id, { ...o, orderId: id });
        });
        setOrders(Array.from(map.values()));
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
