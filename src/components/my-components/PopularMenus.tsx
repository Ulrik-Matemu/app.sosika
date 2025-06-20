// src/components/PopularMenus.tsx
import React, { useEffect, useState } from 'react';
import { useCartContext } from '../../context/cartContext';

// Define the MenuItem type
type MenuItem = {
    id: number;
    name: string;
    price: string;
    image_url: string;
    vendor_id: number;
    total_sold: number;
    is_available: boolean;
};

// Removed unused CartItem type

// Skeleton item component for loading state
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

const PopularMenus: React.FC = () => {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // State for error handling
    const { addToCart } = useCartContext();

    useEffect(() => {
        const fetchPopularMenus = async () => {
            setLoading(true);
            setError(null); // Clear any previous errors
            try {
                const response = await fetch('https://sosika-backend.onrender.com/api/menuItem/popular-menu-items');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setItems(data.items);
            } catch (err) {
                console.error('Failed to fetch popular menu items', err);
                setError('Failed to load popular menus. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchPopularMenus();
    }, []); // Empty dependency array means this effect runs once on mount

    if (error) {
        return (
            <div className="p-4 text-center text-red-600">
                <h2 className="text-xl font-semibold mb-2">Oops!</h2>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()} // Simple retry by refreshing
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <section className="p-4 bg-black rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-extrabold text-white flex items-center">
                    <span role="img" aria-label="fire" className="mr-2 text-red-500 text-3xl">🔥</span>
                    Popular Picks
                </h2>
                {/* Optional: Add a "View All" button if there's a dedicated page */}
                {/* <button className="text-blue-600 font-semibold hover:underline">View All</button> */}
            </div>

            <div className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory scrollbar-hide">
                {loading
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <SkeletonMenuItem key={index} />
                    ))
                    : items.length > 0 ? (
                        items.map(item => (
                            <div
                                key={item.id}
                                className="min-w-[220px] snap-center bg-[#DEDEDE] dark:bg-[#1C1C1C] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden"
                            >
                                <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="h-36 w-full object-cover rounded-t-2xl transform hover:scale-105 transition-transform duration-300"
                                    loading="lazy" // Add lazy loading for images
                                />
                                <div className="p-4">
                                    <h3 className="text-lg font-bold text-black dark:text-white truncate mb-1">
                                        {item.name}
                                    </h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-base font-semibold text-gray-800 dark:text-gray-200">
                                            ${item.price}
                                        </span>
                                        <button
                                            className="bg-[#00bfff] text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors"
                                            onClick={() => addToCart({
                                                ...item,
                                                vendorId: item.vendor_id,
                                                imageUrl: item.image_url,
                                                isAvailable: true,
                                            })}
                                        >
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
                            <p className="mb-2">No popular menus found at the moment.</p>
                            <p>Check back later for exciting new dishes!</p>
                        </div>
                    )}
            </div>
        </section>
    );
};

export default PopularMenus;