import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useParams } from "react-router-dom";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2Icon, MapPinIcon, NavigationIcon } from 'lucide-react';

// Custom icon creation function
const createCustomIcon = (color: string) => {
    const svgIcon = L.divIcon({
        className: 'custom-marker-icon',
        html: `
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                width="32" 
                height="32" 
                fill="${color}"
                stroke="white"
                stroke-width="2"
            >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" fill="white" stroke="${color}" stroke-width="2" />
            </svg>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    return svgIcon;
};

const OrderTracking: React.FC = () => {
    const [orderStatus, setOrderStatus] = useState<string>("Pending");
    const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { orderId } = useParams<{ orderId: string }>();

    const ORDER_STATUSES = [
        "Pending", 
        "In Progress", 
        "Out for Delivery", 
        "Delivered"
    ];

    // Calculate progress percentage

    // Location tracking component
    const LocationTracker = () => {
        const map = useMap();

        useEffect(() => {
            // Fit bounds to include both delivery and user locations
            if (deliveryLocation && userLocation) {
                const bounds = L.latLngBounds(
                    [deliveryLocation.lat, deliveryLocation.lng],
                    [userLocation.lat, userLocation.lng]
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }, [deliveryLocation, userLocation, map]);

        return null;
    };

    // Fetch order status
    useEffect(() => {
        let isMounted = true;
        const fetchOrderStatus = async () => {
            if (!orderId) {
                setError("Invalid Order ID");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const response = await axios.get(`https://sosika-backend.onrender.com/api/orders/${orderId}/status`, {
                    timeout: 10000 // 10 second timeout
                });

                if (isMounted) {
                    setOrderStatus(response.data.status || "Pending");
                    setDeliveryLocation(response.data.delivery_location);
                    setError(null);
                }
            } catch (error) {
                if (isMounted) {
                    console.error("Error fetching order status:", error);
                    setError("Unable to fetch order status. Please try again.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchOrderStatus();
        const interval = setInterval(fetchOrderStatus, 10000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [orderId]);

    // Get user's location
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                }
            );
        }
    }, []);

    // Render error state
    if (error) {
        return (
            <div className="max-w-md mx-auto p-4 bg-red-50 text-red-600 text-center">
                <MapPinIcon className="mx-auto mb-4" size={48} />
                <p>{error}</p>
            </div>
        );
    }

    // Render loading state
    if (isLoading) {
        return (
            <div className="max-w-md mx-auto p-4 flex justify-center items-center">
                <Loader2Icon className="animate-spin" size={48} />
            </div>
        );
    }

    // Order status progress bar

    return (
        <div className="max-w-md mx-auto p-4 bg-white shadow-md rounded-lg">
            <h2 className="text-lg text-black font-bold text-center mb-4">Your Order</h2>
            
            {/* Order Status Progress */}
           

            {(deliveryLocation && userLocation) && (
                <MapContainer 
                    center={[
                        (deliveryLocation.lat + userLocation.lat) / 2, 
                        (deliveryLocation.lng + userLocation.lng) / 2
                    ]} 
                    zoom={12} 
                    className="h-64 w-full rounded-lg overflow-hidden shadow-md"
                >
                    <LocationTracker />
                    <TileLayer 
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {/* Delivery Location Marker */}
                    <Marker 
                        position={[deliveryLocation.lat, deliveryLocation.lng]}
                        icon={createCustomIcon('blue')}
                    >
                        <Popup>Delivery Location 🚚</Popup>
                    </Marker>
                    
                    {/* User Location Marker */}
                    <Marker 
                        position={[userLocation.lat, userLocation.lng]}
                        icon={createCustomIcon('green')}
                    >
                        <Popup>Your Location 📍</Popup>
                    </Marker>
                </MapContainer>
            )}

            <div className="flex justify-between mt-4 text-gray-600">
                <p>
                    Status: <span className="font-bold text-green-600">{orderStatus}</span>
                </p>
                {userLocation && (
                    <p className="flex items-center">
                        <NavigationIcon size={16} className="mr-2 text-blue-500" />
                        Location Tracked
                    </p>
                )}
            </div>
        </div>
    );
};

export default OrderTracking;