// src/components/LocationPicker.tsx
import { GoogleMap } from "@react-google-maps/api";
import { useCallback, useRef, useState, useEffect } from "react";
import type { SavedLocation } from "../../hooks/useLocationStorage";
import { useMapLoader } from "../../services/map-provider";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "12px",
};

const defaultCenter = { lat: -6.7924, lng: 39.2083 }; // Dar es Salaam

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  mapId: "DEMO_MAP_ID", // Required for AdvancedMarker
};

interface Props {
  onSelect: (location: SavedLocation) => void;
  initialLocation?: SavedLocation;
}

export const LocationPicker: React.FC<Props> = ({ onSelect, initialLocation }) => {
  const { isLoaded, loadError } = useMapLoader();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
  );
  const [address, setAddress] = useState<string>(initialLocation?.address || "");
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Initialize services when map loads
  useEffect(() => {
    if (!isLoaded || !map) return;

    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    placesServiceRef.current = new google.maps.places.PlacesService(map);
  }, [isLoaded, map]);

  // Create/update Advanced Marker
  useEffect(() => {
    if (!map || !position || !isLoaded) return;

    // Remove old marker if exists
    if (markerRef.current) {
      markerRef.current.map = null;
    }

    // Create new Advanced Marker
    const { AdvancedMarkerElement, PinElement } = google.maps.marker;
    
    // Create custom pin
    const pin = new PinElement({
      background: "#22c55e",
      borderColor: "#16a34a",
      glyphColor: "#ffffff",
      scale: 1.2,
    });

    const marker = new AdvancedMarkerElement({
      map,
      position,
      content: pin.element,
      title: "Selected Location",
    });

    markerRef.current = marker;

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
      }
    };
  }, [map, position, isLoaded]);

  // Handle search input changes with debounce
  const handleSearchInput = useCallback((value: string) => {
    setSearchValue(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return;

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: "tz" },
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    }, 300);
  }, []);

  // Handle suggestion selection
  const handleSuggestionClick = useCallback((placeId: string, description: string) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ["geometry", "formatted_address", "name"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const newAddress = place.formatted_address || place.name || description;
          
          updateLocation(lat, lng, newAddress);
          setSearchValue(newAddress);
          setShowSuggestions(false);
          setSuggestions([]);
        }
      }
    );
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results && response.results[0]) {
        return response.results[0].formatted_address;
      }
      return "Unknown location";
    } catch (error) {
      console.error("Geocoding error:", error);
      return "Unknown location";
    }
  }, []);

  // Update location with animation
  const updateLocation = useCallback(async (
    lat: number, 
    lng: number, 
    addressOverride?: string
  ) => {
    setPosition({ lat, lng });
    
    // Smoothly pan to new location
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(15);
    }

    // Get or use provided address
    const newAddress = addressOverride || await reverseGeocode(lat, lng);
    setAddress(newAddress);
  }, [map, reverseGeocode]);

  // Handle map clicks
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    await updateLocation(lat, lng);
    setSearchValue("");
    setShowSuggestions(false);
  }, [updateLocation]);

  // Get user's current location
  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGeolocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        await updateLocation(lat, lng);
        setSearchValue("");
        setShowSuggestions(false);
        setIsGeolocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "Unable to fetch your location";
        
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out.";
        }
        
        alert(message);
        setIsGeolocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [updateLocation]);

  // Map load callback
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Map unmount callback
  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle confirm button
  const handleConfirm = useCallback(() => {
    if (!position) return;
    
    onSelect({
      lat: position.lat,
      lng: position.lng,
      address: address || "Selected location",
    });
  }, [position, address, onSelect]);

  // Handle loading error
  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error loading maps</p>
        <p className="text-sm mt-1">Please check your API key and internet connection.</p>
      </div>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {/* Search and Location Controls */}
      <div className="flex flex-col md:flex-row w-full max-w-2xl gap-2">
        <button
          onClick={useCurrentLocation}
          disabled={isGeolocating}
          className="bg-blue-500 hover:bg-blue-600 w-full disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 min-w-[140px]"
          aria-label="Use current location"
        >
          {isGeolocating ? (
            <>
              <span className="animate-spin">⟳</span>
              <span>Locating...</span>
            </>
          ) : (
            <>
              <span>📍</span>
              <span>My Location</span>
            </>
          )}
        </button>
      </div>

      {/* Map */}
      <div className="w-full max-w-2xl shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={position || defaultCenter}
          zoom={position ? 15 : 12}
          options={mapOptions}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          onClick={handleMapClick}
        >
          {/* Marker is created via useEffect using native API */}
        </GoogleMap>
      </div>

      {/* Location Info and Confirm */}
      <div className="w-full max-w-2xl">
        {address && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
            <p className="text-sm text-gray-500 mb-1">Selected location:</p>
            <p className="text-gray-800 font-medium">{address}</p>
          </div>
        )}
        
        {!position && (
          <p className="text-center text-gray-500 text-sm mb-3">
            Click on the map, search for a location, or use your current location
          </p>
        )}
        
        <button
          onClick={handleConfirm}
          disabled={!position}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors shadow-sm disabled:shadow-none"
          aria-label="Confirm selected location"
        >
          {position ? "Confirm Location" : "Select a Location First"}
        </button>
      </div>
    </div>
  );
};