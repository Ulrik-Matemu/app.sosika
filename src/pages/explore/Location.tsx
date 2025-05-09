import  { useState } from "react";
import axios from "axios";
import { useToast } from "../../hooks/use-toast";


export const handleSelectLocation = async (location: { name: string; lat: number; lng: number }) => {
    const toast = useToast();
    const [, setLoading] = useState(false);
    const [, setIsLocationOpen] = useState(false);
    const [, setSelectedLocation] = useState<string | null>(null);

    setLoading(true);
    const userId = localStorage.getItem("userId");
    if (!userId) {
        console.error("User ID not found");
        return;
    }

    setSelectedLocation(location.name);


    try {
        const response = await axios.post("https://sosika-backend.onrender.com/api/auth/update-location", {
            userId,
            custom_address: { lat: location.lat, lng: location.lng },
        }, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        console.log("Location updated successfully:", response.data);

        setLoading(false);
        setIsLocationOpen(false);
        // alert('Location updated successfully! You can now place your order.');
        toast.toast({
            description: 'Location updated successfully!'
        });

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error updating location:", error.response?.data || error.message);
        } else {
            console.error("Unexpected error:", error);
        }
    }
};

export const addCurrentLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

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
            console.error("Error fetching location:", error);
            alert("Unable to fetch your location. Please try again.");
        }
    );
};