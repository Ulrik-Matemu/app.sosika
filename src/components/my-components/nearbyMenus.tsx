import React, { useEffect, useState } from 'react';
import { useCartContext } from '../../context/cartContext';

type MenuItem = {
    id: number;
    name: string;
    price: string;
    image_url: string;
    vendor_id: number;
    is_available: boolean;
    vendor_name?: string;
};

type NearbyMenusProps = {
    radius?: number;
};

const SkeletonMenuItem: React.FC = () => (
    <div className="min-w-[220px] snap-start bg-gray-200 animate-pulse rounded-2xl shadow-md shrink-0 h-60">
        <div className="h-36 w-full bg-gray-300 rounded-t-2xl"></div>
        <div className="p-3">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
            <div className="h-5 bg-gray-300 rounded w-2/5 mt-2"></div>
        </div>
    </div>
);

const NearbyMenus: React.FC<NearbyMenusProps> = ({ radius = 50 }) => {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const { addToCart } = useCartContext();

    const CACHE_KEY = userLocation ? `nearbyMenusCache_${userLocation.lat}_${userLocation.lng}_${radius}` : '';
    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (err) => {
                console.error(err);
                setError('Unable to retrieve your location');
                setLoading(false);
            }
        );
    }, []);

    useEffect(() => {
        if (!userLocation) return;

        const fetchNearbyMenus = async () => {
            setLoading(true);
            setError(null);

            try {
                // Check cache first
                const cachedData = localStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const { timestamp, data } = JSON.parse(cachedData);
                    if (Date.now() - timestamp < CACHE_DURATION && data) {
                        setItems(data);
                        setLoading(false);
                        return;
                    }
                }

                const response = await fetch(
                    `https://sosika-backend.onrender.com/api/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}`
                );
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                setItems(data);

                localStorage.setItem(
                    CACHE_KEY,
                    JSON.stringify({ timestamp: Date.now(), data })
                );
            } catch (err) {
                console.error('Failed to fetch nearby menu items', err);
                setError('Failed to load nearby menus. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchNearbyMenus();
    }, [userLocation, radius]);

    if (error) return <div className="p-4 text-red-600 text-center">{error}</div>;

    if (!userLocation) return <div className="p-4 text-gray-600 text-center">Fetching your location...</div>;

    return (
        <section className="p-4 bg-transparent rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-extrabold text-black dark:text-white flex items-center">
                    From Nearby Vendors
                </h2>
            </div>
            <div className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory scrollbar-hide">
                {loading ? Array.from({ length: 3 }).map((_, index) => <SkeletonMenuItem key={index} />) :
                    items.length > 0 ? (
                        items.map(item => (
                            <div key={item.id} className="min-w-[220px] snap-center bg-[#DEDEDE] dark:bg-[#1C1C1C] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden">
                                <img src={item.image_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')} alt={`${item.name} from ${item.vendor_name || `Vendor No. ${item.vendor_id}`} - Order now on Sosika`} className="h-36 w-full object-cover rounded-t-2xl transform hover:scale-105 transition-transform duration-300" loading="lazy" width={800} height={144} />
                                <div className="p-4">
                                    <h3 className="text-lg font-bold text-black dark:text-white truncate mb-1">{item.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{item.vendor_name || `Vendor ${item.vendor_id}`}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-base font-semibold text-gray-800 dark:text-gray-200">TSH{item.price}</span>
                                        <button className="bg-[#00bfff] text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400" onClick={() => addToCart({ ...item, vendorId: item.vendor_id, imageUrl: item.image_url, isAvailable: true })} aria-label={`Add ${item.name} to cart`} title={`Add ${item.name} to cart`} type="button">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="w-full text-center text-gray-500 py-8">
                            <p className="mb-2">No nearby menus found in your area.</p>
                            <p>Will notify you when vendors start selling in your area!</p>
                        </div>
                    )
                }
            </div>
        </section>
    );
};

export default NearbyMenus;
