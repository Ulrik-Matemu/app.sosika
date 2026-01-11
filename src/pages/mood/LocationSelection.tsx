import { useRef, useState } from "react";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { motion, AnimatePresence } from "framer-motion";
import { useMapLoader } from "../../services/map-provider";
import { MapPin, Clock, ChevronLeft, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1rem" };

export default function LocationSelection() {
  const { isLoaded, loadError } = useMapLoader();
  const { locations, saveLocation } = useLocationStorage();
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const handleProceed = (lat: number, lng: number, address: string) => {
    saveLocation({ address, lat, lng });
    navigate("/mood/results");
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        const address = place.formatted_address || "";
        setSelected(pos);
        setLocationName(address);
        updateMarker(pos);
      }
    }
  };

  const updateMarker = (pos: { lat: number; lng: number }) => {
    if (!mapRef.current) return;
    if (markerRef.current) markerRef.current.map = null;
    markerRef.current = new google.maps.marker.AdvancedMarkerElement({
      position: pos,
      map: mapRef.current,
    });
    mapRef.current.panTo(pos);
  };

  if (loadError) return <div className="p-10 text-red-400">Error loading maps</div>;
  if (!isLoaded) return <div className="p-10 text-zinc-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 bg-zinc-800 rounded-lg"><ChevronLeft /></button>
          <h1 className="text-xl font-bold text-[#00bfff]">Sosika</h1>
          <div className="w-10" /> 
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for a location..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-[#00bfff] transition-all"
              />
            </div>
          </Autocomplete>
        </div>

        {/* Recent Locations Drawer */}
        {locations.length > 0 && (
          <div className="bg-zinc-800/50 rounded-2xl border border-zinc-800 overflow-hidden">
            <button 
              onClick={() => setShowRecent(!showRecent)}
              className="w-full p-4 flex items-center justify-between text-zinc-400"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest font-bold">Recent Places</span>
              </div>
              {showRecent ? <ChevronUp /> : <ChevronDown />}
            </button>
            <AnimatePresence>
              {showRecent && (
                <motion.div 
                  initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  className="px-2 pb-2 space-y-1"
                >
                  {locations.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => handleProceed(loc.lat, loc.lng, loc.address)}
                      className="w-full text-left p-3 hover:bg-zinc-700 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <MapPin className="text-zinc-500 w-4 h-4" />
                      <span className="text-sm truncate">{loc.address}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Map */}
        <div className="h-80 rounded-3xl overflow-hidden border border-zinc-800 shadow-xl">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={14}
            center={selected || { lat: -6.79, lng: 39.27 }}
            onLoad={(map) => { mapRef.current = map; }}
            options={{ mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID, disableDefaultUI: true }}
          />
        </div>

        {/* Confirm Button */}
        {selected && (
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            onClick={() => handleProceed(selected.lat, selected.lng, locationName)}
            className="w-full bg-[#00bfff] text-black font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20"
          >
            Confirm {locationName.split(',')[0]} & Continue
          </motion.button>
        )}
      </div>
    </div>
  );
}