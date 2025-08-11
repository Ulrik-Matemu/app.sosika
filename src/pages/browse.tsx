import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Frown, Image as ImageIcon, LayoutGrid, List, Columns } from 'lucide-react';
import Navbar from '../components/my-components/navbar';
import { Header } from '../components/my-components/header';
import NotificationHandler from '../components/my-components/notification-handler';
import PageWrapper from '../services/page-transition';
import { Toaster } from '../components/ui/toaster';
import { useMenu } from '../pages/explore/Menu';
import { logEvent, analytics } from '../firebase';
import { useCartContext } from '../context/cartContext';
// import { getDeliveryFee } from '../services/deliveryFee';
import SkeletonCard from './explore/SkeletonCard';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';
import PaginationControls from '../components/my-components/PaginationControls';
import CartDrawer from '../components/my-components/CartDrawer';
import clsx from "clsx";

const isInStandaloneMode = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
// should be false on desktop
console.log("standalone", isInStandaloneMode());  // should be false if not installed



// Define interfaces for menu items and vendor data
interface MenuItem {
    id: number;
    name: string;
    description?: string;
    price: string;
    category: string;
    is_available: boolean;
    vendor_id: number;
    image_url?: string;
}

const categories = [
    {
        label: "Breakfast",
        value: "breakfast",
        icon: "/icons/categories/breakfast.png", // Example breakfast icon
    },
    {
        label: "Lunch",
        value: "lunch",
        icon: "/icons/categories/lunch.png", // Example lunch icon
    },
    {
        label: "Dinner",
        value: "dinner",
        icon: "/icons/categories/dinner.png", // Example dinner icon
    },
    {
        label: "Snacks",
        value: "snacks",
        icon: "/icons/categories/snacks.png", // Example snacks icon
    },
    {
        label: "Drinks",
        value: "drinks",
        icon: "/icons/categories/drinks.png",
    },
];

const Browser = () => {
    const { deferredPrompt, promptInstall } = usePWAInstallPrompt();
    const [showInstallBtn, setShowInstallBtn] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);
    // State for menu items and filters
    const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
    const [error] = useState<string | null>(null);
    const [layout, setLayout] = useState(() => {
        // On first load, try to get the saved layout
        return localStorage.getItem("layout") || "compact";
    });
   
    const { menuItems, loadingMenu, priceRange, pagination, setPagination, setPriceRange } = useMenu();
   // Cart state (now from hook)
    const { cart, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart, checkout, loading } = useCartContext();
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  // Filter states
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [availableOnly, setAvailableOnly] = useState<boolean>(false);
    const [vendorFilter, setVendorFilter] = useState<string>('');
    const navigate = useNavigate();
    const [sortOption, setSortOption] = useState<"name-asc" | "name-desc" | "price-asc" | "price-desc">("name-asc");

    // Location logic via hook
   

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            navigate('/login');
        }
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (!hasScrolled) {
                setHasScrolled(true);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasScrolled]);

    useEffect(() => {
        if (hasScrolled && deferredPrompt && !isInStandaloneMode()) {
            setShowInstallBtn(true);
        }
    }, [hasScrolled, deferredPrompt]);

    const handleInstall = async () => {
        logEvent(analytics, 'pwa_install', {
            userId: localStorage.getItem('userId'),
            action: 'install_button_clicked',
        });
        const outcome = await promptInstall();
        if (outcome === 'accepted' || outcome === 'dismissed') {
            setShowInstallBtn(false);
        }
    };

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('✅ beforeinstallprompt fired', e);
        });

        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA installed');
        });
    }, []);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= pagination.totalPages) {
            setPagination((prev) => ({ ...prev, currentPage: page }));
        }
    };



    useEffect(() => {
        // Whenever layout changes, save it
        localStorage.setItem("layout", layout);
    }, [layout]);

    // Apply filters whenever filter states change
    useEffect(() => {
        let result = menuItems;

        // Apply search filter
        if (searchTerm) {
            result = result.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply category filter
        if (selectedCategory) {
            result = result.filter(item => item.category === selectedCategory);
        }

        // Apply price range filter
        result = result.filter(item =>
            parseInt(item.price) >= priceRange.min &&
            parseFloat(item.price) <= priceRange.max
        );

        // Apply availability filter
        if (availableOnly) {
            result = result.filter(item => item.is_available);
        }

        // Apply vendor filter
        if (vendorFilter) {
            result = result.filter(item => item.vendor_id === Number(vendorFilter));
        }

        // Apply sorting
        result = sortItems(result, sortOption);

        setFilteredItems(result);
    }, [searchTerm, selectedCategory, priceRange, availableOnly, vendorFilter, sortOption, menuItems]);

   

    // Sort function
    const sortItems = (items: MenuItem[], option: string) => {
        const sortedItems = [...items];

        switch (option) {
            case 'name-asc':
                return sortedItems.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return sortedItems.sort((a, b) => b.name.localeCompare(a.name));
            case 'price-asc':
                return sortedItems.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            case 'price-desc':
                return sortedItems.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            default:
                return sortedItems;
        }
    };

    // Reset all filters
    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setPriceRange({
            min: 0,
            max: Math.ceil(Math.max(...menuItems.map(item => parseFloat(item.price))))
        });
        setAvailableOnly(false);
        setVendorFilter('');
        setSortOption('name-asc');
    };

   
    // Render error state
    if (error) {
        return (
            <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
                    <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <p className="text-red-700 font-medium">Oops! {error}</p>
                    <button className='text-black border px-4 py-1 rounded text-2xl font-bold'>Retry</button>
                </div>
            </div>
        );
    }

    

    return (
        <>
            <Toaster />
            <div className="min-h-screen bg-gray-50 dark:bg-[#121212] pb-8">
                <NotificationHandler />
                <Header />
                <PageWrapper>
                    <div className="max-w-7xl mx-auto px-4 py-2 pb-12">
                        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
                            {/* Filters Sidebar */}
                            <div className="lg:col-span-3 mb-6 lg:mb-0">
                                <div className="dark:bg-[#121212] p-0 rounded-xl  border border-[transparent] dark:border-[transparent]">


                                    <div className="space-y-4">
                                        <div>
                                            <div
                                                className="flex gap-4 overflow-x-auto py-1 px-2 relative group"
                                                role="toolbar"
                                                aria-label="Select food category"
                                            >
                                                {categories.map(({ label, value, icon }) => {
                                                    const isSelected = selectedCategory === value;
                                                    return (
                                                        <button
                                                            key={value}
                                                            onClick={() => setSelectedCategory(value)}
                                                            aria-pressed={isSelected}
                                                            className={clsx(
                                                                "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-200",
                                                                isSelected
                                                                    ? "bg-transparent text-white shadow-md dark:bg-blue-600"
                                                                    : "bg-transparent hover:bg-gray-100 border-gray-200 dark:bg-transparent hover:dark:bg-gray-600/50"
                                                            )}
                                                            type="button"
                                                        >
                                                            <figure className="w-10 h-10 mb-2">
                                                                <img
                                                                    src={icon}
                                                                    alt={label}
                                                                    width={40}
                                                                    height={40}
                                                                    className={clsx(
                                                                        "object-contain transition-transform duration-150",
                                                                        isSelected ? "scale-110" : "group-hover:scale-105"
                                                                    )}
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                />
                                                                {/* Optionally, figcaption if you want semantic label linked to image */}
                                                                {/* <figcaption className="sr-only">{label}</figcaption> */}
                                                            </figure>
                                                            <span
                                                                className={clsx(
                                                                    "text-sm font-bold text-center",
                                                                    isSelected ? "text-white" : "text-gray-700 dark:text-gray-200"
                                                                )}
                                                            >
                                                                {label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                        </div>
                                        <div className="mb-4 flex justify-between gap-2">
                                            <div className="relative w-[80%]">
                                                <Search className="absolute left-3 top-5 -translate-y-1/2 h-5 w-5 text-gray-400 " />
                                                <input
                                                    type="text"
                                                    placeholder="Search menu items..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full font-bold h-10 pl-10 pr-4 py-3 bg-gray-300 rounded-3xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-500 dark:text-black"
                                                />
                                            </div>

                                            <div className="justify-right mb-1">
                                                <button
                                                    onClick={resetFilters}
                                                    className="text-sm text-[#00bfff] bg-gray-700 dark:bg-gray-700 border h-10 p-2 rounded-3xl hover:text-blue-700  gap-1"
                                                >
                                                    <span className='font-bold'>Refresh</span>
                                                </button>
                                            </div>
                                        </div>
                                       

                                    </div>
                                </div>
                            </div>



                            {/* Results */}

                            <div className="lg:col-span-9 mb-8">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-sm text-gray-600 font-bold dark:text-white">
                                        Showing {filteredItems.length} of {menuItems.length} items
                                    </p>
                                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                        <button
                                            onClick={() => setLayout('grid')}
                                            className={`p-1.5 rounded-md ${layout === 'grid' ? 'bg-[#ededed] dark:bg-gray-700 shadow-sm' : ''}`}
                                            title="Grid view"
                                        >
                                            <Columns className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setLayout('list')}
                                            className={`p-1.5 rounded-md ${layout === 'list' ? 'bg-[#ededed] dark:bg-gray-700 shadow-sm' : ''}`}
                                            title="List view"
                                        >
                                            <List className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setLayout('compact')}
                                            className={`p-1.5 rounded-md ${layout === 'compact' ? 'bg-[#ededed] dark:bg-gray-700 shadow-sm' : ''}`}
                                            title="Compact view"
                                        >
                                            <LayoutGrid className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {loadingMenu ? (
                                    // 👇 Show Skeletons (depending on layout)
                                    <>
                                        {layout === 'grid' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <SkeletonCard key={i} />
                                                ))}
                                            </div>
                                        )}
                                        {layout === 'list' && (
                                            <div className="flex flex-col gap-4">
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <SkeletonCard key={i} />
                                                ))}
                                            </div>
                                        )}
                                        {layout === 'compact' && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {Array.from({ length: 8 }).map((_, i) => (
                                                    <SkeletonCard key={i} />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : filteredItems.length > 0 ? (
                                    // 👇 Show actual items when done loading
                                    <>
                                        {layout === 'grid' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {filteredItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${!item.is_available ? "opacity-70" : ""}`}
                                                    >
                                                        <div className="relative aspect-square rounded-t-xl overflow-hidden">
                                                            {item.image_url ? (
                                                                <img
                                                                    src={`${item.image_url.replace('/upload/', '/upload/f_auto,q_auto,w_600/')}`}
                                                                    alt={`${item.name} from Vendor No. ${item.vendor_id} - Order on Sosika`}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover"
                                                                    width={600}
                                                                    height={400}
                                                                />

                                                            ) : (
                                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                                    <ImageIcon className="h-12 w-12 text-gray-400" />
                                                                </div>
                                                            )}
                                                            {!item.is_available && (
                                                                <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                                    <X className="h-3 w-3" />
                                                                    Unavailable
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                                {item.category}
                                                            </div>
                                                        </div>
                                                        <div className="p-4">
                                                            <h3 className="font-bold text-gray-900 dark:text-gray-200 mb-1">{item.name}</h3>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                                                {item.description || "No description available"}
                                                            </p>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-600">
                                                                    Vendor #{item.vendor_id}
                                                                </span>
                                                                <span className="text-lg font-semibold text-[#00bfff]">TZS {parseFloat(item.price).toFixed(2)}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    logEvent(analytics, "button_click", {
                                                                        button_name: `Added ${item.name} to cart`,
                                                                        location: "Explore page",
                                                                    })
                                                                    addToCart({
                                                                        ...item,
                                                                        vendorId: item.vendor_id,
                                                                        imageUrl: item.image_url,
                                                                        isAvailable: item.is_available,
                                                                    })
                                                                }}
                                                                disabled={!item.is_available}
                                                                className="w-full bg-[#00bfff] text-white py-2 rounded-lg hover:bg-[#0099cc] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                            >
                                                                {item.is_available ? "Add to Cart" : "Unavailable"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {layout === 'list' && (
                                            <div className="flex flex-col gap-4">
                                                {filteredItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex ${!item.is_available ? "opacity-70" : ""}`}
                                                    >
                                                        <div className="relative h-32 w-32 rounded-l-xl overflow-hidden flex-shrink-0">
                                                            {item.image_url ? (
                                                                <img
                                                                    src={item.image_url.replace('/upload/', '/upload/f_auto,q_auto,w_600/')}
                                                                    alt={`${item.name} from Vendor No. ${item.vendor_id} - Order on Sosika`}
                                                                    loading="lazy"
                                                                    width="600"
                                                                    height="400"
                                                                    className="w-full h-full object-cover"
                                                                />

                                                            ) : (
                                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                                                </div>
                                                            )}
                                                            {!item.is_available && (
                                                                <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                                    <X className="h-3 w-3" />
                                                                    Unavailable
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-4 flex-grow flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <h3 className="font-bold text-gray-900 dark:text-gray-200 mb-1">{item.name}</h3>
                                                                        <div className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mb-2">
                                                                            {item.category}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-lg font-semibold text-[#00bfff]">TZS {parseFloat(item.price).toFixed(2)}</span>
                                                                </div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                                    {item.description || "No description available"}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-600">
                                                                    Vendor #{item.vendor_id}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        logEvent(analytics, "button_click", {
                                                                            button_name: `Added ${item.name} to cart`,
                                                                            location: "Explore page",
                                                                        })
                                                                        addToCart({
                                                                            ...item,
                                                                            vendorId: item.vendor_id,
                                                                            imageUrl: item.image_url,
                                                                            isAvailable: item.is_available,
                                                                        })
                                                                    }}
                                                                    disabled={!item.is_available}
                                                                    className="bg-[#00bfff] text-white px-4 py-2 rounded-lg hover:bg-[#0099cc] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                                >
                                                                    {item.is_available ? "Add to Cart" : "Unavailable"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {layout === 'compact' && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {filteredItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${!item.is_available ? "opacity-70" : ""}`}
                                                    >
                                                        <div className="relative aspect-video rounded-t-xl overflow-hidden">
                                                            {item.image_url ? (
                                                                <img
                                                                    src={item.image_url.replace('/upload/', '/upload/f_auto,q_auto,w_600/')}
                                                                    alt={`${item.name} from Vendor No. ${item.vendor_id} - Order on Sosika`}
                                                                    loading="lazy"
                                                                    width="600"
                                                                    height="400"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                                                </div>
                                                            )}
                                                            {!item.is_available && (
                                                                <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-1 py-0.5 rounded-full text-xs font-medium flex items-center gap-0.5">
                                                                    <X className="h-2 w-2" />
                                                                    Unavailable
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-3">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-medium">
                                                                    {item.category}
                                                                </span>
                                                                <span className="text-sm font-semibold text-[#00bfff]">TZS {parseFloat(item.price).toFixed(2)}</span>
                                                            </div>
                                                            <h3 className="font-bold text-gray-900 dark:text-gray-200 text-sm mb-1 line-clamp-1">{item.name}</h3>
                                                            <button
                                                                onClick={() => {
                                                                    logEvent(analytics, "button_click", {
                                                                        button_name: `Added ${item.name} to cart`,
                                                                        location: "Explore page",
                                                                    })
                                                                    addToCart({
                                                                        ...item,
                                                                        vendorId: item.vendor_id,
                                                                        imageUrl: item.image_url,
                                                                        isAvailable: item.is_available,
                                                                    })
                                                                }}
                                                                disabled={!item.is_available}
                                                                className="w-full bg-[#00bfff] text-white py-1 text-sm rounded-lg hover:bg-[#0099cc] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                            >
                                                                {item.is_available ? "Add to Cart" : "Unavailable"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // 👇 Show Frown when no items found and not loading
                                    <div className="text-center py-12">
                                        <Frown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-2">No items found</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Try adjusting your filters or check back later.
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>
                        <PaginationControls
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                            className="mb-6"
                        />
                        
                    </div>

                   

                    <CartDrawer
                        isOpen={isCartOpen}
                        onClose={() => setIsCartOpen(false)}
                        cart={cart}
                        cartTotal={cartTotal}
                        updateQuantity={updateQuantity}
                        removeFromCart={removeFromCart}
                        clearCart={clearCart}
                        checkout={checkout}
                        loading={loading}
                    />

                    {error && (
                        <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center">
                            <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
                                <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
                                <p className="text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    )}
                </PageWrapper>
                {showInstallBtn && (
                    <>
                        {console.log("🟢 Rendering install button")}
                        <button
                            onClick={handleInstall}
                            className="fixed bottom-24 left-5 z-[1000] px-6 py-3 bg-sky-500 text-white font-medium rounded-full shadow-xl hover:bg-sky-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
                        >
                            Install App
                        </button>

                    </>
                )}
                <Navbar />
            </div>
        </>
    );
};

export default Browser;