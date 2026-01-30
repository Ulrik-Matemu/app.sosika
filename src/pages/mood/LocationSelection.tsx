import { useRef, useState, useCallback } from "react";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { motion, AnimatePresence } from "framer-motion";
import { useMapLoader } from "../../services/map-provider";
import { MapPin, Clock, ChevronLeft, Search, ChevronDown, ChevronUp, LocateFixed, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/use-toast";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1.5rem" };

export default function LocationSelection() {
  const { isLoaded, loadError } = useMapLoader();
  const { locations, saveLocation } = useLocationStorage();
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
  }, []);

  const updateMapSelection = useCallback((pos: { lat: number; lng: number }, name: string) => {
    setSelected(pos);
    setLocationName(name);

    if (mapRef.current) {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map: mapRef.current,
      });
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(15);
    }
  }, []);

  const reverseGeocode = useCallback(async (pos: { lat: number; lng: number }) => {
    if (!geocoderRef.current) return "Selected Location";
    try {
      const response = await geocoderRef.current.geocode({ location: pos });
      return response.results[0]?.formatted_address || "Custom Location";
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return "Selected Location";
    }
  }, []);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    const name = await reverseGeocode(pos);
    updateMapSelection(pos, name);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        updateMapSelection(pos, place.formatted_address || "Search Result");
      }
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const name = await reverseGeocode(pos);
        updateMapSelection(pos, name);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation failed:", error);
        toast.toast({
          title: "Geolocation failed",
          description: "Could not get your location. Please enable location services.",
          variant: "destructive",
        });
        setIsLocating(false);
      }
    );
  };

  const handleProceed = (lat: number, lng: number, address: string) => {
    saveLocation({ address, lat, lng });
    navigate("/mood/results");
  };

  if (loadError) return <div className="p-10 text-red-400">Error loading maps</div>;
  if (!isLoaded) return <div className="p-10 text-zinc-400">Loading components...</div>;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-5">
        
        <div className="flex items-center justify-between py-2">
          <button onClick={() => navigate(-1)} className="p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-[#00bfff] tracking-tight">Select Location</h1>
          <div className="w-10" /> 
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 group-focus-within:text-[#00bfff] transition-colors" />
                <input
                  type="text"
                  placeholder="Search for a place or address"
                  className="w-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all"
                />
              </div>
            </Autocomplete>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={handleGeolocate}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-xl py-3 px-4 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              {isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LocateFixed className="w-5 h-5 text-[#00bfff]" />
              )}
              <span className="font-semibold text-sm">Use My Current Location</span>
            </button>

            {locations.length > 0 && (
              <button 
                onClick={() => setShowRecent(!showRecent)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-xl py-3 px-4 hover:bg-zinc-700 transition-colors"
              >
                <Clock className="w-5 h-5 text-[#00bfff]" />
                <span className="font-semibold text-sm">Recent Places</span>
                {showRecent ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showRecent && locations.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-800/40 rounded-xl border border-zinc-800/60 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                {locations.slice(0, 3).map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => handleProceed(loc.lat, loc.lng, loc.address)}
                    className="w-full text-left p-3 hover:bg-[#00bfff]/10 rounded-lg flex items-center gap-3 group transition-all"
                  >
                    <MapPin className="text-zinc-500 group-hover:text-orange-400 w-4 h-4 transition-colors flex-shrink-0" />
                    <span className="text-sm truncate text-zinc-300 group-hover:text-white">{loc.address}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-80 sm:h-96 rounded-2xl overflow-hidden border border-zinc-800 shadow-lg relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={12}
            center={selected || { lat: -6.79, lng: 39.27 }}
            onLoad={onMapLoad}
            onClick={handleMapClick}
            options={{ 
              mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID, 
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: 'cooperative'
            }}
          />
          {!selected && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20">
              <div className="bg-zinc-900/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm text-white/80">
                Tap the map to choose a location
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-zinc-800/80 border border-zinc-700 rounded-2xl flex items-start gap-4">
                <MapPin className="text-[#00bfff] w-6 h-6 mt-1 shrink-0" />
                <div>
                  <p className="text-xs uppercase text-zinc-400 font-bold tracking-wider">Location</p>
                  <p className="text-md text-zinc-100 leading-tight font-semibold">{locationName}</p>
                </div>
              </div>
              <button
                onClick={() => handleProceed(selected.lat, selected.lng, locationName)}
                className="w-full bg-[#00bfff] hover:bg-blue-400 text-black font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-lg"
              >
                Confirm & Continue
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
