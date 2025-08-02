import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Frown, Image as ImageIcon, LayoutGrid, List, Columns } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import PopularMenus from '../components/my-components/PopularMenus';
import PaginationControls from '../components/my-components/PaginationControls';
import useExploreData from '../hooks/useExploreData'; // Assuming useExploreData is in hooks folder
import { useCartContext } from '../context/cartContext'; // Assuming useCartContext is in context folder
import { logEvent, analytics } from '../firebase'; // Assuming firebase is configured

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
    { label: "Breakfast", value: "breakfast", icon: "/icons/categories/breakfast.png" },
    { label: "Lunch", value: "lunch", icon: "/icons/categories/lunch.png" },
    { label: "Dinner", value: "dinner", icon: "/icons/categories/dinner.png" },
    { label: "Snacks", value: "snacks", icon: "/icons/categories/snacks.png" },
    { label: "Drinks", value: "drinks", icon: "/icons/categories/drinks.png" },
];

const ExploreContent: React.FC = () => {
    // Data fetching from custom hook
    const { loading: exploreLoading, error: exploreError, vendors: fetchedVendors, popularItems } = useExploreData();

    // Cart state (from context)
    const { addToCart } = useCartContext();

    // State for menu items and filters
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]); // This will hold all fetched menu items
    const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
    const [layout, setLayout] = useState(() => localStorage.getItem("layout") || "compact");

    // Filter states
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [availableOnly, setAvailableOnly] = useState<boolean>(false);
    const [vendorFilter, setVendorFilter] = useState<string>('');
    const [sortOption, setSortOption] = useState<"name-asc" | "name-desc" | "price-asc" | "price-desc">("name-asc");
    const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 }); // Default max price, will be updated

    // Pagination state
    const [pagination, setPagination] = useState({
        currentPage: 1,
        itemsPerPage: 10, // You can adjust this
        totalPages: 1,
    });

    // Effect to set initial menu items and price range when popularItems are loaded
    useEffect(() => {
        if (popularItems.length > 0) {
            setMenuItems(
                popularItems.map(item => ({
                    ...item,
                    price: item.price.toString()
                }))
            );
            const maxPrice = Math.ceil(Math.max(...popularItems.map(item => typeof item.price === "number" ? item.price : parseFloat(item.price))));
            setPriceRange(prev => ({ ...prev, max: maxPrice > 0 ? maxPrice : 100000 }));
        }
    }, [popularItems]);

    // Effect to save layout to local storage
    useEffect(() => {
        localStorage.setItem("layout", layout);
    }, [layout]);

    // Memoized sorting function
    const sortItems = useMemo(() => (items: MenuItem[], option: string) => {
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
    }, []);

    // Apply filters whenever filter states or menuItems change
    useEffect(() => {
        let result = [...menuItems]; // Start with all current menu items

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
            parseFloat(item.price) >= priceRange.min &&
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

        // Update pagination total pages
        setPagination(prev => ({
            ...prev,
            totalPages: Math.ceil(result.length / prev.itemsPerPage),
            currentPage: 1, // Reset to first page on filter change
        }));

    }, [searchTerm, selectedCategory, priceRange, availableOnly, vendorFilter, sortOption, menuItems, sortItems]);

    // Paginate the filtered items for display
    const paginatedItems = useMemo(() => {
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        return filteredItems.slice(startIndex, endIndex);
    }, [filteredItems, pagination.currentPage, pagination.itemsPerPage]);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= pagination.totalPages) {
            setPagination((prev) => ({ ...prev, currentPage: page }));
        }
    };

    // Reset all filters
    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setPriceRange({
            min: 0,
            max: Math.ceil(Math.max(...menuItems.map(item => parseFloat(item.price)))) || 100000
        });
        setAvailableOnly(false);
        setVendorFilter('');
        setSortOption('name-asc');
        setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset pagination
    };

    // Render loading state
    if (exploreLoading) {
        return (
            <div className="text-center py-12">
                <svg className="animate-spin h-16 w-16 text-[#00bfff] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Loading delicious food...</h3>
            </div>
        );
    }

    // Render error state
    if (exploreError) {
        return (
            <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center z-50">
                <div className="text-center max-w-md p-6 bg-red-50 rounded-lg shadow-xl">
                    <X className="h-12 w-12 text-red-600 mx-auto mb-4 animate-bounce" />
                    <p className="text-red-700 font-medium text-lg">Oops! {exploreError}</p>
                    <button
                        onClick={() => window.location.reload()} // Simple reload to retry
                        className='mt-4 px-6 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors'
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-3 mb-6 lg:mb-0">
                <div className="dark:bg-[#121212] p-0 rounded-xl border border-[transparent] dark:border-[transparent]">
                    <div className="space-y-4">
                        <PopularMenus /> {/* This component is assumed to be self-contained */}

                        <div>
                            <div className="flex gap-4 overflow-x-auto py-1 px-2 relative group">
                                {categories.map(({ label, value, icon }) => {
                                    const isSelected = selectedCategory === value;
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => setSelectedCategory(value)}
                                            className={`
                                                flex flex-col items-center justify-center
                                                p-3 rounded-xl transition-all duration-200 ease-in-out
                                                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                                dark:text-gray-200
                                                ${isSelected
                                                    ? "bg-blue-500 text-white shadow-md dark:bg-blue-600"
                                                    : "bg-transparent hover:bg-gray-100 border-gray-200 dark:bg-transparent hover:dark:bg-gray-600/50"
                                                }
                                            `}
                                            aria-pressed={isSelected}
                                        >
                                            <img
                                                src={icon}
                                                alt={label}
                                                className={`
                                                    w-10 h-10 mb-2 object-contain
                                                    transition-transform duration-150
                                                    ${isSelected ? "scale-110" : "group-hover:scale-105"}
                                                `}
                                            />
                                            <span
                                                className={`text-sm font-bold text-center ${isSelected ? "text-white" : "text-gray-700 dark:text-gray-200"
                                                    }`}
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

                        <div>
                            <div className="flex flex-wrap gap-2"> {/* Changed to flex-wrap for better responsiveness */}
                                {/* Vendor Filter */}
                                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                                    <SelectTrigger className="w-full sm:w-48 rounded-2xl bg-gray-300 dark:bg-gray-800">
                                        <SelectValue placeholder="All Vendors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="">All Vendors</SelectItem> {/* Empty string for "All" */}
                                            {fetchedVendors.map((vendor) => (
                                                <SelectItem key={vendor.id} value={String(vendor.id)}>
                                                    {vendor.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>

                                {/* Sort Option Filter */}
                                <Select value={sortOption} onValueChange={(val) => setSortOption(val as any)}>
                                    <SelectTrigger className="w-full sm:w-48 rounded-2xl bg-gray-300 dark:bg-gray-800 text-gray-400">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent >
                                        <SelectGroup >
                                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                            <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                                            <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-9 mb-8">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 font-bold dark:text-white">
                        Showing {paginatedItems.length} of {filteredItems.length} items
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

                {paginatedItems.length > 0 ? (
                    <>
                        {layout === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${!item.is_available ? "opacity-70" : ""}`}
                                    >
                                        <div className="relative aspect-square rounded-t-xl overflow-hidden">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} loading='lazy' className="w-full h-full object-cover" />
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
                                {paginatedItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex ${!item.is_available ? "opacity-70" : ""}`}
                                    >
                                        <div className="relative h-32 w-32 rounded-l-xl overflow-hidden flex-shrink-0">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} loading='lazy' className="w-full h-full object-cover" />
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
                                {paginatedItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${!item.is_available ? "opacity-70" : ""}`}
                                    >
                                        <div className="relative aspect-video rounded-t-xl overflow-hidden">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} loading='lazy' className="w-full h-full object-cover" />
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
                    <div className="text-center py-12">
                        <Frown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-2">No items found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Try adjusting your filters or check back later.
                        </p>
                    </div>
                )}
            </div>

            <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                className="mb-6 lg:col-span-12" // Span across all columns
            />
        </div>
    );
};

export default ExploreContent;