// components/LocationPickerModal.tsx
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { X } from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (lng: number, lat: number, address?: string) => void;
    loading: boolean;
    useCurrentLocation: () => void;
    handleSelectLocation: (location: { lat: number; lng: number; name: string }) => void;
}

export default function LocationPickerModal({
    isOpen,
    onClose,
    onLocationSelect,
    loading,
    useCurrentLocation,
    handleSelectLocation,
}: Props) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [address, setAddress] = useState('');
    const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
    const [buttonSuccess, setButtonSuccess] = useState(false);

    const updateLocation = async (lng: number, lat: number) => {
        let fetchedAddress = '';
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
            );
            const data = await response.json();
            fetchedAddress = data?.features?.[0]?.place_name || '';
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
        }
        setCoordinates({ lng, lat });
        setAddress(fetchedAddress);
        onLocationSelect(lng, lat, fetchedAddress);
    };

    useEffect(() => {
        let map: mapboxgl.Map | null = null;

        const initializeMap = async () => {
            if (!isOpen || !mapContainerRef.current) return;

            let center: [number, number] = [39.2083, -6.7924];
            if (navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject)
                    );
                    center = [position.coords.longitude, position.coords.latitude];
                } catch {
                    // fallback to default center
                }
            }

            map = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v11',
                center,
                zoom: 13,
            });

            map.on('load', () => {
                const center = map!.getCenter();
                updateLocation(center.lng, center.lat);
            });

            map.on('moveend', () => {
                const center = map!.getCenter();
                updateLocation(center.lng, center.lat);
            });

            mapRef.current = map;
        };

        initializeMap();

        return () => {
            if (map) {
                map.remove();
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-[#ededed] dark:bg-[#2b2b2b] p-6 rounded-lg shadow-lg w-[90%] max-w-md">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[#00bfff]">Select Location</h2>
                    <button onClick={onClose}>
                        <X className="h-5 w-5 text-gray-600 dark:text-white" />
                    </button>
                </div>

                <div className="mt-4 h-64 rounded overflow-hidden relative">
                    <div ref={mapContainerRef} className="w-full h-full rounded" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-10">
                        <img src="/icons/icons8-map-pin-100.png" className="w-20 h-20 " alt="marker" />
                    </div>

                </div>

                <button
                    onClick={() => {
                        if (coordinates && address) {
                            handleSelectLocation({
                                lat: coordinates.lat,
                                lng: coordinates.lng,
                                name: address,
                            });
                            setButtonSuccess(true);
                            setTimeout(() => setButtonSuccess(false), 1500);
                        }

                    }}
                    className={`mt-4 w-full ${
                        buttonSuccess
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-[#00bfff] hover:bg-[#0099cc]'
                    } text-white py-2 px-4 rounded text-center font-semibold transition-colors duration-300`}
                >
                    {address
                        ? buttonSuccess
                            ? 'Location Selected!'
                            : address
                        : 'Loading address...'}
                </button>

                <ul className="mt-4 space-y-2">
                    <li
                        onClick={useCurrentLocation}
                        className="p-2 flex justify-center rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-blue-500 font-medium"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-[#2b2b2b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
