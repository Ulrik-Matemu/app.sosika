import React from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import type { SavedLocation } from "../../hooks/useLocationStorage";

interface Props {
  locations: SavedLocation[];
  onSelect: (location: SavedLocation) => void;
  onNew: () => void;
}

export const SavedLocationsModal: React.FC<Props> = ({
  locations,
  onSelect,
  onNew,
}) => {
  const handleDelete = (index: number) => {
    const saved = JSON.parse(localStorage.getItem("sosika_locations") || "[]") as SavedLocation[];
    saved.splice(index, 1);
    localStorage.setItem("sosika_locations", JSON.stringify(saved));
    window.location.reload(); // simple way to re-sync, can be improved later with context
  };

  return (
    <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
        Choose a Saved Location
      </h2>

      {locations.length ? (
        <ul className="divide-y divide-gray-200">
          {locations.map((loc, index) => (
            <li
              key={index}
              className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition cursor-pointer"
            >
              <div
                onClick={() => onSelect(loc)}
                className="flex items-start gap-3 flex-1"
              >
                <MapPin className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <p className="font-medium text-gray-800">{loc.address}</p>
                  <p className="text-xs text-gray-500">
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDelete(index)}
                className="p-2 text-gray-400 hover:text-red-500 transition"
                aria-label="Delete saved location"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-500 my-6">
          No saved locations yet.
        </p>
      )}

      <button
        onClick={onNew}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
        aria-label="Add new location"
      >
        <Plus className="w-5 h-5" />
        Add New Location
      </button>
    </div>
  );
};
