// src/services/map-provider.tsx
import { useJsApiLoader, Libraries } from "@react-google-maps/api";
import { createContext, useContext, ReactNode } from "react";

const libraries: Libraries = ["places", "marker"]; // Added "marker"

interface MapContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const MapContext = createContext<MapContextType>({
  isLoaded: false,
  loadError: undefined,
});

export const useMapLoader = () => useContext(MapContext);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
    version: "weekly",
  });

  return (
    <MapContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </MapContext.Provider>
  );
};