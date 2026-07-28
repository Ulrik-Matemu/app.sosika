import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Promotion } from "../pages/mood/types/types";
import { usePlatformConfig } from "./usePlatformConfig";

export function usePromotions() {
  const { promotionsCarouselVisible, loaded: configLoaded } = usePlatformConfig();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!configLoaded) return;
    if (!promotionsCarouselVisible) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "promotions"),
      where("is_active", "==", true)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: Promotion[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Promotion);
        });
        items.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        setPromotions(items);
        setLoading(false);
      },
      (err) => {
        console.warn("Error loading promotions:", err);
        setPromotions([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [promotionsCarouselVisible, configLoaded]);

  return {
    promotions,
    visible: promotionsCarouselVisible,
    loading,
  };
}
