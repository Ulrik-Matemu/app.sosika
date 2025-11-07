import { useState, useEffect } from "react";

export interface SavedLocation {
  address: string;
  lat: number;
  lng: number;
}

export const useLocationStorage = () => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("sosika_locations");
    if (saved) setLocations(JSON.parse(saved));
  }, []);

  const saveLocation = (location: SavedLocation) => {
    const updated = [location, ...locations].slice(0, 3);
    setLocations(updated);
    localStorage.setItem("sosika_locations", JSON.stringify(updated));
  };

  return { locations, saveLocation };
};
