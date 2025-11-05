// src/hooks/useLocationStorage.ts
import { useEffect, useState } from "react";

export interface SavedLocation {
  lat: number;
  lng: number;
  address: string;
}

export const useLocationStorage = () => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("sosika_locations");
    if (saved) {
      setLocations(JSON.parse(saved));
    }
  }, []);

  const saveLocation = (location: SavedLocation) => {
    const updated = [...locations, location];
    localStorage.setItem("sosika_locations", JSON.stringify(updated));
    setLocations(updated);
  };

  return { locations, saveLocation };
};
