import { useState } from 'react';
import axios from 'axios';

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export function useLocationSelector({
  API_URL,
  onLocationUpdate,
}: {
  API_URL: string;
  onLocationUpdate?: (location: Location) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const handleSelectLocation = async (location: Location) => {
    setLoading(true);
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("User ID not found");
      setLoading(false);
      return;
    }
    setSelectedLocation(location.name);
    try {
      const response = await axios.post(`${API_URL}/auth/update-location`, {
        userId,
        custom_address: { lat: location.lat, lng: location.lng },
      }, {
        headers: { "Content-Type": "application/json" },
      });
      setLoading(false);
      setIsLocationOpen(false);
      if (onLocationUpdate) onLocationUpdate(location);
      return response.data;
    } catch (error) {
      setLoading(false);
      if (axios.isAxiosError(error)) {
        console.error("Error updating location:", error.response?.data || error.message);
      } else {
        console.error("Unexpected error:", error);
      }
    }
  };

  const addCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentLocation = {
          name: "Current Location",
          lat: latitude,
          lng: longitude,
        };
        handleSelectLocation(currentLocation);
      },
      (error) => {
        setLoading(false);
        console.error("Error fetching location:", error);
        alert("Unable to fetch your location. Please try again.");
      }
    );
  };

  return {
    loading,
    isLocationOpen,
    setIsLocationOpen,
    selectedLocation,
    setSelectedLocation,
    handleSelectLocation,
    addCurrentLocation,
  };
}
