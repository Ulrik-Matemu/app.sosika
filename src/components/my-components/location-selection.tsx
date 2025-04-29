import React, { useState } from "react";
import { X } from 'lucide-react';

import axios from "axios";
import { useToast } from '../../hooks/use-toast';



const predefinedLocations = [
    { name: "Mamiro Hostel", lat: -3.4157279004216874, lng: 36.71139864504578 },
    { name: "Mamuya Hostel", lat: -3.4159921797731134, lng: 36.712876253216784 },
    { name: "Old Hostel", lat: -3.4152137532524893, lng: 36.70962012663434 },
    { name: "New Hostel", lat: -3.414513577401153, lng: 36.71026451427121 },
    { name: "Jackson Hostel", lat: -3.4158120478706007, lng: 36.713987296139855 },
    { name: "Shumbusho", lat: -3.418037404417581, lng: 36.71300246986059 }
];

export const LocationSelector: React.FC = () => {
    const toast = useToast();
    const [, setIsLocationOpen] = useState(false);
    const [loading] = useState<boolean>(false);
    const [, setLoading] = useState<boolean>(false);
    const [, setSelectedLocation] = useState<string>('');

    const handleSelectLocation = async (location: { name: string; lat: number; lng: number }) => {



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
            // use shadcn toast
            toast.toast({
                description: "Your location has been updated successfully!",
            })

        } catch (error) {
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

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const currentLocation = {
                    name: "Current Location",
                    lat: latitude,
                    lng: longitude,
                };
                handleSelectLocation(currentLocation);
                setIsLocationOpen(false);
            },
            (error) => {
                console.error("Error fetching location:", error);
                alert("Unable to fetch your location. Please try again.");
            }
        );
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-[#2b2b2b] p-6 rounded-lg shadow-lg w-80">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[#00bfff]">Select Location</h2>
                    <button onClick={() => setIsLocationOpen(false)}>
                        <X className="h-5 w-5 text-gray-600 dark:text-white" />
                    </button>
                </div>

                <ul className="mt-4 space-y-2">
                    {predefinedLocations.map((location) => (
                        <li
                            key={location.name}
                            onClick={() => handleSelectLocation(location)}
                            className="p-2 rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            {location.name}
                        </li>
                    ))}
                    <li
                        onClick={addCurrentLocation}
                        className="p-2 flex justify-center rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-blue-500 font-medium"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-[#2b2b2b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            'Use my current location'
                        )}
                    </li>
                </ul>
            </div>
        </div>
    );
}