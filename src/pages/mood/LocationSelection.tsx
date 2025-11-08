import { useRef, useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { useMood } from "../../hooks/useMood";
import { motion } from "framer-motion";
import { useMapLoader } from "../../services/map-provider";
import { MapPin, Clock, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1rem" };

export default function LocationSelection() {
  const { isLoaded, loadError } = useMapLoader();
  const { locations, saveLocation } = useLocationStorage();
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const { mood } = useMood();
  const navigate = useNavigate();

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Initialize geocoder when maps loads
  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
  };

  // Get address from coordinates
  const getAddressFromCoords = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return "Selected Location";

    try {
      const response = await geocoderRef.current.geocode({
        location: { lat, lng },
      });

      if (response.results[0]) {
        return response.results[0].formatted_address;
      }
      return "Selected Location";
    } catch (error) {
      console.error("Geocoding error:", error);
      return "Selected Location";
    }
  };

  // Handle clicks on the map
  const onMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!mapRef.current || !e.latLng) return;

    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelected(pos);

    // Remove old marker
    if (markerRef.current) markerRef.current.map = null;

    // Create new advanced marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: pos,
      map: mapRef.current,
      title: "Selected Location",
    });

    markerRef.current = marker;

    // Get address for this location
    const address = await getAddressFromCoords(pos.lat, pos.lng);
    setLocationName(address);
  };

  // Handle saved location selection
  const handleSavedLocationSelect = (loc: { address: string; lat: number; lng: number }) => {
    setSelected({ lat: loc.lat, lng: loc.lng });
    setLocationName(loc.address);
    saveLocation({ address: loc.address, lat: loc.lat, lng: loc.lng });
    console.log("Mood:", mood, "Location:", loc.address, loc.lat, loc.lng);
    handleProceed();
  };

  const handleProceed = () => {
    if (selected && locationName) {
      saveLocation({ address: locationName, lat: selected.lat, lng: selected.lng });
      navigate("/mood/results");
      // Navigate to next step
      // navigate("/next-route");
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center text-red-400">Error loading maps</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center text-zinc-400">Loading maps...</div>
      </div>
    );
  }

  return (
    <>

      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 p-4 sm:p-6">
        <h1 className="text-center bg-transparent py-3 md:py-6 text-[#00bfff] font-extrabold text-2xl">Sosika</h1>
        <motion.div
          className="w-full max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-300" />
          </motion.button>
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-xl md:text-3xl font-extralight mb-1 md:mb-3 relative text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-gray-100 to-gray-400 animate-shine">
              Hapa na Wapi?
            </h1>
            <style>
              {`
            @keyframes shine {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .animate-shine {
              background-size: 200% 100%;
              animation: shine 4.5s linear infinite;
            }
          `}
            </style>
            <p className="text-zinc-400 text-sm sm:text-base">
              Select your location on the map or choose from recent
            </p>
          </div>

          {/* Main Container */}
          <div className="bg-zinc-800/50 backdrop-blur rounded-3xl p-4 sm:p-6 space-y-4">

            {/* Recent Locations */}
            {locations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="uppercase tracking-wider">Recent Locations</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {locations.map((loc, i) => (
                    <motion.button
                      key={i}
                      onClick={() => handleSavedLocationSelect(loc)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`text-left bg-zinc-800 hover:bg-zinc-750 rounded-xl p-4 transition-all duration-300 ${selected?.lat === loc.lat && selected?.lng === loc.lng
                          ? "bg-zinc-700 shadow-lg shadow-zinc-900/50"
                          : ""
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-colors ${selected?.lat === loc.lat && selected?.lng === loc.lng
                              ? "text-orange-400"
                              : "text-zinc-400"
                            }`}
                          strokeWidth={2}
                        />
                        <span className={`text-sm transition-colors ${selected?.lat === loc.lat && selected?.lng === loc.lng
                            ? "text-white"
                            : "text-zinc-300"
                          }`}>
                          {loc.address}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-zinc-700"></div>
              <span className="text-zinc-500 text-xs uppercase tracking-wider">
                {locations.length > 0 ? "or pick on map" : "pick on map"}
              </span>
              <div className="flex-1 h-px bg-zinc-700"></div>
            </div>

            {/* Map Container */}
            <div className="bg-zinc-800 rounded-2xl overflow-hidden h-64 sm:h-80 md:h-96">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={15}
                center={selected || { lat: -6.8, lng: 39.28 }}
                onClick={onMapClick}
                onLoad={onMapLoad}
                options={{
                  mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
                  disableDefaultUI: false,
                  zoomControl: true,

                }}
              />
            </div>

            {/* Location Name Input */}
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <input
                  type="text"
                  placeholder="You can name this location"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-750 transition-all"
                />

                <motion.button
                  onClick={handleProceed}
                  disabled={!selected || !locationName}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#00bfff] hover:bg-black disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/20 disabled:shadow-none"
                >
                  Proceed →
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Footer hint */}
          <motion.p
            className="text-center text-zinc-600 text-xs sm:text-sm mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {selected ? "Looking good! Name your spot and continue" : "Tap anywhere on the map to set your location"}
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}