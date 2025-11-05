// src/pages/LocationSetup.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import  { LocationPicker }  from "../components/my-components/LocationPicker2";
import { SavedLocationsModal } from "../components/my-components/SavedLocationsModal";
import { useLocationStorage, SavedLocation } from "../hooks/useLocationStorage";

export const LocationSetup: React.FC = () => {
  const { locations, saveLocation } = useLocationStorage();
  const [showPicker, setShowPicker] = useState<boolean>(!locations.length);
  const navigate = useNavigate();

  const handleSelect = (location: SavedLocation) => {
    saveLocation(location);
    navigate("/explore");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      {!showPicker ? (
        <SavedLocationsModal
          locations={locations}
          onSelect={handleSelect}
          onNew={() => setShowPicker(true)}
        />
      ) : (
        <LocationPicker onSelect={handleSelect} />
      )}
    </div>
  );
};
