import { useRef, useState, useCallback } from "react";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { motion, AnimatePresence } from "framer-motion";
import { useMapLoader } from "../../services/map-provider";
import { MapPin, Clock, ChevronLeft, Search, ChevronDown, ChevronUp, LocateFixed, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../hooks/use-toast";
import { useCart } from "../../hooks/useCart";
import posthog from "./../../lib/posthog";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1rem" };

export default function LocationSelection() {
  const { isLoaded, loadError } = useMapLoader();
  const { locations, saveLocation } = useLocationStorage();
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const location = useLocation();
  const { checkout, loading: isCheckingOut } = useCart();
  const isOfferFlow = location.state?.isOfferFlow;

  const handleConfirmLocation = async (lat: number, lng: number, address: string) => {
    saveLocation({ address, lat, lng });
    posthog.capture("location_selected", { address: address, lat: lat, lng: lng });

    if (isOfferFlow) {
      await checkout();
      navigate("/");
    } else {
      navigate("/mood/results");
    }
  };

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
        toast({
          title: "Geolocation failed",
          description: "Could not get your location. Please enable location services.",
          variant: "destructive",
        });
        setIsLocating(false);
      }
    );
  };

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <p className="text-red-400 font-medium">Error loading maps</p>
    </div>
  );
  
  if (!isLoaded) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] gap-3">
      <Loader2 className="w-8 h-8 text-[#00bfff] animate-spin" />
      <p className="text-zinc-500 text-sm font-medium">Loading map...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-4">
        
        {/* Header */}
        <div className="flex items-center gap-3 py-2">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
          >
            <ChevronLeft className="w-4.5 h-4.5 text-zinc-300" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mb-0.5">
              Step 2 of 3
            </p>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">
              Where are you?
            </h1>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00bfff]" />
            <div className="w-2 h-2 rounded-full bg-[#00bfff]" />
            <div className="w-2 h-2 rounded-full bg-white/[0.1]" />
          </div>
        </div>

        {/* Search + Actions */}
        <div className="space-y-3">
          <div className="relative">
            <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" />
                <input
                  type="text"
                  placeholder="Search for a place or address"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.06] transition-all duration-300 placeholder-zinc-600"
                />
              </div>
            </Autocomplete>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button 
              onClick={handleGeolocate}
              disabled={isLocating || isCheckingOut}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl py-3 px-4 hover:bg-white/[0.07] hover:border-white/[0.1] disabled:opacity-40 disabled:cursor-wait transition-all duration-300"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#00bfff]" />
              ) : (
                <LocateFixed className="w-4 h-4 text-[#00bfff]" />
              )}
              <span className="font-semibold text-sm text-zinc-300">My Location</span>
            </button>

            {locations.length > 0 && (
              <button 
                onClick={() => setShowRecent(!showRecent)}
                disabled={isCheckingOut}
                className="w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl py-3 px-4 hover:bg-white/[0.07] hover:border-white/[0.1] transition-all duration-300 disabled:opacity-40"
              >
                <Clock className="w-4 h-4 text-[#00bfff]" />
                <span className="font-semibold text-sm text-zinc-300">Recent</span>
                {showRecent ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
              </button>
            )}
          </div>
        </div>

        {/* Recent locations */}
        <AnimatePresence>
          {showRecent && locations.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <div className="p-1.5 space-y-0.5">
                {locations.slice(0, 3).map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => handleConfirmLocation(loc.lat, loc.lng, loc.address)}
                    disabled={isCheckingOut}
                    className="w-full text-left p-3 hover:bg-[#00bfff]/[0.06] rounded-lg flex items-center gap-3 group transition-all disabled:opacity-40 disabled:cursor-wait"
                  >
                    <MapPin className="text-zinc-600 group-hover:text-[#00bfff] w-3.5 h-3.5 transition-colors flex-shrink-0" />
                    <span className="text-sm truncate text-zinc-400 group-hover:text-white transition-colors">{loc.address}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map */}
        <div className="h-72 sm:h-80 rounded-2xl overflow-hidden border border-white/[0.06] relative">
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
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/30">
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/[0.08] text-xs text-white/70 font-medium">
                Tap the map to choose a location
              </div>
            </div>
          )}
        </div>

        {/* Selected location confirmation */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="space-y-3"
            >
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00bfff]/[0.1] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="text-[#00bfff] w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-zinc-600 font-bold tracking-widest mb-0.5">Delivery to</p>
                  <p className="text-sm text-white leading-snug font-medium truncate">{locationName}</p>
                </div>
              </div>
              <button
                onClick={() => handleConfirmLocation(selected.lat, selected.lng, locationName)}
                disabled={isCheckingOut}
                className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-bold py-4 rounded-xl shadow-lg shadow-[#00bfff]/20 active:scale-[0.98] transition-all text-sm flex items-center justify-center disabled:opacity-60 disabled:cursor-wait"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Processing...</span>
                  </>
                ) : (
                  isOfferFlow ? "Proceed to Checkout" : "Continue"
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
