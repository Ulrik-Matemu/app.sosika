import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

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
    handleSelectLocation,
}: Props) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null); // type-safe if you load mapbox dynamically
    const [address, setAddress] = useState('');
    const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
    const [buttonSuccess, setButtonSuccess] = useState(false);

    // 🧠 Throttle so we don’t spam updateLocation on move
    const throttle = (fn: (...args: any) => void, delay: number) => {
        let lastCall = 0;
        return (...args: any) => {
            const now = new Date().getTime();
            if (now - lastCall < delay) return;
            lastCall = now;
            fn(...args);
        };
    };

    const updateLocation = useCallback(async (lng: number, lat: number) => {
        let fetchedAddress = '';
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
            );
            const data = await response.json();
            fetchedAddress = data?.features?.[0]?.place_name || '';
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
        }

        setCoordinates((prev) => {
            if (!prev || prev.lng !== lng || prev.lat !== lat) {
                return { lng, lat };
            }
            return prev;
        });
        setAddress(fetchedAddress);
        onLocationSelect(lng, lat, fetchedAddress);
    }, [onLocationSelect]);

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        let map: any;

        const initMap = async () => {
            const mapboxgl = await import('mapbox-gl');
            mapboxgl.default.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

            let center: [number, number] = [39.2083, -6.7924];
            if (navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject)
                    );
                    center = [position.coords.longitude, position.coords.latitude];
                } catch {
                    // fallback
                }
            }

            map = new mapboxgl.Map({
                container: mapContainerRef.current!,
                style: 'mapbox://styles/mapbox/streets-v11',
                center,
                zoom: 13,
            });

            map.on('load', () => {
                const center = map.getCenter();
                updateLocation(center.lng, center.lat);
            });

            map.on('moveend', throttle(() => {
                const center = map.getCenter();
                updateLocation(center.lng, center.lat);
            }, 500));

            mapRef.current = map;
        };

        initMap();

        return () => {
            map?.remove();
        };
    }, [isOpen, updateLocation]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-[#ededed] dark:bg-[#121212] p-6 rounded-lg shadow-lg w-[90%] max-w-md">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[#00bfff]">Select Location</h2>
                    <button onClick={onClose}>
                        <X className="h-5 w-5 text-gray-600 dark:text-white" />
                    </button>
                </div>

                <div className="mt-4 h-64 rounded overflow-hidden relative">
                    <div ref={mapContainerRef} className="w-full h-full rounded" />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-10">
                        <img src="/icons/icons8-map-pin-100.png" className="w-20 h-20" alt="marker" />
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
                    } text-black py-2 px-4 rounded text-center font-semibold transition-colors duration-300`}
                >
                    {address
                        ? buttonSuccess
                            ? 'Location Selected!'
                            : address
                        : 'Loading address...'}
                </button>
            </div>
        </div>
    );
}
