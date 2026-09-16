import { useRef, useState, useCallback } from "react";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { motion, AnimatePresence } from "framer-motion";
import { useMapLoader } from "../../services/map-provider";
import { MapPin, ChevronLeft, Search, LocateFixed, Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-ground text-center p-6 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
        <MapPin size={24} />
      </div>
      <h3 className="text-base font-bold text-content">Map Connection Notice</h3>
      <p className="text-xs text-content-tertiary max-w-xs leading-relaxed">
        Could not load Google Maps. Please check your internet connection or choose a saved address.
      </p>
    </div>
  );

  if (!isLoaded) return (
    <div className="min-h-screen bg-ground text-content p-4 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 py-2 border-b border-edge-1 pb-4">
          <div className="w-9 h-9 rounded-xl bg-surface-2 animate-pulse" />
          <div className="space-y-1 flex-1">
            <div className="w-20 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="w-36 h-5 bg-surface-3 rounded animate-pulse" />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="w-full h-12 rounded-2xl bg-surface-1 border border-edge-1 animate-pulse flex items-center px-4 justify-between">
          <div className="w-48 h-4 bg-surface-2 rounded" />
          <div className="w-8 h-8 rounded-xl bg-surface-2" />
        </div>

        {/* Map Frame Skeleton */}
        <div className="w-full h-72 rounded-[18px] bg-surface-1 border border-edge-1 relative overflow-hidden flex flex-col items-center justify-center gap-3">
          <div className="absolute inset-0 bg-gradient-to-tr from-sosika-cyan/5 to-transparent animate-pulse" />
          <Loader2 className="w-8 h-8 text-accent-ink animate-spin relative z-10" />
          <p className="text-xs font-bold text-content-tertiary relative z-10">Initializing Interactive Map...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ground text-content p-4 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-3 border border-edge-2 hover:bg-surface-3 transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-content-secondary" />
            </button>
            <h1 className="text-[19px] font-bold text-content tracking-[-0.02em] leading-none">
              Where are you?
            </h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-[13px] font-semibold text-content-muted hover:text-content transition-colors"
          >
            Close
          </button>
        </div>

        {/* Map */}
        <div className="h-64 sm:h-72 rounded-[18px] overflow-hidden border border-edge-1 relative">
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
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-edge-2 text-xs text-white/70 font-medium">
                Tap the map to choose a location
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-faint w-3.5 h-3.5 group-focus-within:text-accent-ink transition-colors" />
              <input
                type="text"
                placeholder="Search a place or address"
                className="w-full bg-surface-2 border border-edge-2 rounded-[15px] py-3.5 pl-11 pr-4 text-sm outline-none focus:border-sosika-cyan/35 transition-colors placeholder-content-faint"
              />
            </div>
          </Autocomplete>
        </div>

        {/* Current location + saved + recent, as rows */}
        <div className="flex flex-col">
          <button
            onClick={handleGeolocate}
            disabled={isLocating || isCheckingOut}
            className="flex items-center gap-[13px] py-3.5 border-b border-edge-1 disabled:opacity-40 disabled:cursor-wait text-left w-full"
          >
            <span className="w-8 h-8 rounded-[11px] bg-sosika-cyan/[0.12] flex items-center justify-center flex-none">
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-ink" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 text-accent-ink" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-accent-ink">Use my current location</div>
              <div className="text-xs text-content-muted mt-0.5">Most accurate for delivery fee</div>
            </div>
          </button>

          {locations.slice(0, 3).map((loc, i) => (
            <button
              key={i}
              onClick={() => handleConfirmLocation(loc.lat, loc.lng, loc.address)}
              disabled={isCheckingOut}
              className="flex items-center gap-[13px] py-3.5 border-b border-edge-1 last:border-b-0 disabled:opacity-40 disabled:cursor-wait text-left w-full"
            >
              <span className="w-8 h-8 rounded-[11px] bg-surface-3 flex items-center justify-center flex-none text-content-tertiary text-[13px]">
                {i === 0 ? "★" : "◷"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-content truncate">{loc.address}</div>
                <div className="text-xs text-content-muted mt-0.5">{i === 0 ? "Saved" : "Recent"}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Selected location confirmation */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="space-y-3"
            >
              <div className="p-4 bg-surface-1 border border-edge-2 rounded-[18px] flex items-start gap-3">
                <div className="w-8 h-8 rounded-[11px] bg-sosika-cyan/[0.12] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="text-accent-ink w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase text-content-faint font-bold tracking-[0.14em] mb-0.5">Delivery to</p>
                  <p className="text-sm text-content leading-snug font-medium truncate">{locationName}</p>
                </div>
              </div>
              <button
                onClick={() => handleConfirmLocation(selected.lat, selected.lng, locationName)}
                disabled={isCheckingOut}
                className="w-full bg-sosika-cyan text-on-accent font-bold py-[17px] rounded-2xl active:opacity-90 transition-opacity text-[15px] flex items-center justify-center disabled:opacity-60 disabled:cursor-wait"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Processing…</span>
                  </>
                ) : (
                  isOfferFlow ? "Proceed to checkout" : "Deliver here"
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
