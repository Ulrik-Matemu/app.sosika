import { useRef, useState, useCallback } from "react";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { motion, AnimatePresence } from "framer-motion";
import { useMapLoader } from "../../services/map-provider";
import { MapPin, Clock, ChevronLeft, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1.5rem" };

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
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Initialize Geocoder and Map
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
  }, []);

  // Shared function to update marker and center map
  const updateMapSelection = (pos: { lat: number; lng: number }, name: string) => {
    setSelected(pos);
    setLocationName(name);

    if (mapRef.current) {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map: mapRef.current,
      });
      mapRef.current.panTo(pos);
    }
  };

  // Logic for Manual Map Click
  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !geocoderRef.current) return;
    
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    
    // Reverse Geocode the tap coordinates
    try {
      const response = await geocoderRef.current.geocode({ location: pos });
      const address = response.results[0]?.formatted_address || "Custom Location";
      updateMapSelection(pos, address);
    } catch (error) {
      updateMapSelection(pos, "Selected Location");
    }
  };

  // Logic for Autocomplete Search
  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        updateMapSelection(pos, place.formatted_address || "Search Location");
      }
    }
  };

  const handleProceed = (lat: number, lng: number, address: string) => {
    saveLocation({ address, lat, lng });
    navigate("/mood/results");
  };

  if (loadError) return <div className="p-10 text-red-400">Error loading maps</div>;
  if (!isLoaded) return <div className="p-10 text-zinc-400">Loading components...</div>;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <button onClick={() => navigate(-1)} className="p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-[#00bfff] tracking-tight">Sosika</h1>
          <div className="w-10" /> 
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
            <div className="relative group">
              <Search className="absolute left-4 top-4 text-zinc-500 w-5 h-5 group-focus-within:text-[#00bfff] transition-colors" />
              <input
                type="text"
                placeholder="Search for a place..."
                className="w-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all"
              />
            </div>
          </Autocomplete>
        </div>

        {/* Recent Locations Drawer */}
        {locations.length > 0 && (
          <div className="bg-zinc-800/40 rounded-2xl border border-zinc-800/60 overflow-hidden">
            <button 
              onClick={() => setShowRecent(!showRecent)}
              className="w-full p-4 flex items-center justify-between text-zinc-400 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.2em] font-bold">Recent Places</span>
              </div>
              {showRecent ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <AnimatePresence>
              {showRecent && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-2 pb-3 space-y-1"
                >
                  {locations.slice(0, 5).map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => handleProceed(loc.lat, loc.lng, loc.address)}
                      className="w-full text-left p-3 hover:bg-[#00bfff]/10 rounded-xl flex items-center gap-3 group transition-all"
                    >
                      <MapPin className="text-zinc-500 group-hover:text-orange-400 w-4 h-4 transition-colors" />
                      <span className="text-sm truncate text-zinc-300 group-hover:text-white">{loc.address}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Map Container */}
        <div className="h-80 sm:h-96 rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={14}
            center={selected || { lat: -6.79, lng: 39.27 }}
            onLoad={onMapLoad}
            onClick={handleMapClick}
            options={{ 
              mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID, 
              disableDefaultUI: true,
              zoomControl: true
            }}
          />
          {!selected && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-zinc-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs text-white/80">
                Tap the map to set location manually
              </div>
            </div>
          )}
        </div>

        {/* Confirm Button Overlay */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-zinc-800/80 border border-zinc-700 rounded-2xl flex items-start gap-3">
                <MapPin className="text-[#00bfff] w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Selected Spot</p>
                  <p className="text-sm text-zinc-200 leading-tight">{locationName}</p>
                </div>
              </div>
              <button
                onClick={() => handleProceed(selected.lat, selected.lng, locationName)}
                className="w-full bg-[#00bfff] hover:bg-[#33ccff] text-black font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-lg"
              >
                Continue →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}