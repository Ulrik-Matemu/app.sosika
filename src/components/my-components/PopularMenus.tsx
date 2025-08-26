import React, { useEffect, useState } from 'react';
import { useCartContext } from '../../context/cartContext';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

type MenuItem = {
    id: number;
    name: string;
    price: string;
    image_url: string;
    vendor_id: number;
    total_sold: number;
    is_available: boolean;
    avg_rating?: number;
    review_count?: number;
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

const PopularMenus: React.FC = () => {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToCart } = useCartContext();

    const CACHE_KEY = "popularMenusCache";
 const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

    useEffect(() => {
        const fetchPopularMenus = async () => {
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

                // Fetch if no valid cache
                const response = await fetch('https://sosika-backend.onrender.com/api/menuItem/popular-menu-items');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setItems(data.items);

                // Store in cache
                localStorage.setItem(
                    CACHE_KEY,
                    JSON.stringify({
                        timestamp: Date.now(),
                        data: data.items
                    })
                );
            } catch (err) {
                console.error('Failed to fetch popular menu items', err);
                setError('Failed to load popular menus. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchPopularMenus();
    }, []);

    if (error) {
        return (
            <div className="p-4 text-center text-red-600">
                <h2 className="text-xl font-semibold mb-2">Oops!</h2>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
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
                                className="min-w-[220px] max-w-[230px] snap-center bg-[#DEDEDE] dark:bg-[#1C1C1C] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden"
                            >
                                <Link to={`/menu-item/${item.id}`} key={item.id}>
                                    <img
                                        src={item.image_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')}
                                        alt={`${item.name} from Vendor No. ${item.vendor_id} - Order now on Sosika`}
                                        className="h-36 w-full object-cover rounded-t-2xl transform hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                        width={800}
                                        height={144}
                                    />
                                </Link>
                                <div className="p-4">
                                    <h3 className="text-lg font-bold text-black dark:text-white truncate mb-1">
                                        {item.name}
                                    </h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <Link to={`/menu-item/${item.id}`} key={item.id}>
                                            <div className='flex flex-col'>
                                                <span className="text-base font-semibold text-gray-800 dark:text-gray-200">
                                                    TSH{item.price}
                                                </span>
                                                <span>
                                                    {item.avg_rating && item.avg_rating > 0 ? (
                                                        <span className="text-gray-800 dark:text-gray-200 font-bold"><Star className="inline-block text-yellow-400 dark:text-yellow-300" /> {(Number(item.avg_rating) || 0).toFixed(1)}</span>
                                                    ) : (
                                                        <span className="text-gray-500">No ratings yet</span>
                                                    )}
                                                </span>
                                            </div>
                                        </Link>
                                        <button
                                            className="bg-[#00bfff] text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400"
                                            onClick={(e) => {
                                                e.stopPropagation(); // prevents triggering the card click
                                                addToCart({
                                                    ...item,
                                                    vendorId: item.vendor_id,
                                                    imageUrl: item.image_url,
                                                    isAvailable: true,
                                                });
                                            }
                                            }
                                            aria-label={`Add ${item.name} to cart`}
                                            title={`Add ${item.name} to cart`}
                                            type="button"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                                                    clipRule="evenodd"
                                                />
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
