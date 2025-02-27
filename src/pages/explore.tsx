import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Utensils, DollarSign, GlassWater, Sandwich, Cookie, X, RefreshCw, Frown, Loader2, Image as ImageIcon } from 'lucide-react';


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

interface PriceRange {
    min: number;
    max: number;
}

const categories = [
    { label: "Breakfast", value: "breakfast", icon: Utensils },
    { label: "Lunch", value: "lunch", icon: Sandwich },
    { label: "Dinner", value: "dinner", icon: Utensils },
    { label: "Snacks", value: "snacks", icon: Cookie },
    { label: "Drinks", value: "drinks", icon: GlassWater },
];

const MenuExplorer = () => {
    // State for menu items and filters
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1000 });
    const [availableOnly, setAvailableOnly] = useState<boolean>(false);
    const [vendorFilter, setVendorFilter] = useState<string>('');
    const [vendors, setVendors] = useState<number[]>([]);
    const [sortOption, setSortOption] = useState<"name-asc" | "name-desc" | "price-asc" | "price-desc">("name-asc");



    // Fetch all menu items when component mounts
    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get('http://localhost:3000/api/menuItems');
                setMenuItems(response.data);
                setFilteredItems(response.data);

                // Extract unique vendors
                const uniqueVendors: number[] = [...new Set((response.data as MenuItem[]).map((item: MenuItem) => item.vendor_id))];
                setVendors(uniqueVendors);


                // Find price extremes
                if (response.data.length > 0) {
                    const prices = response.data.map((item: MenuItem) => item.price);
                    setPriceRange({
                        min: 0,
                        max: Math.ceil(Math.max(...prices))
                    });
                }

                setIsLoading(false);
            } catch (err) {
                setError('Failed to fetch menu items. Please try again later.');
                setIsLoading(false);
                console.error(err);
            }
        };

        fetchMenuItems();
    }, []);

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
        setPriceRange({ min: 0, max: Math.ceil(Math.max(...menuItems.map(item => parseFloat(item.price)))) });
        setAvailableOnly(false);
        setVendorFilter('');
        setSortOption('name-asc');
    };

    if (isLoading) {
        return <div className="loading-container">Loading menu items...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">

                <h1 className="text-2xl text-center font-extrabold text-[#00bfff]">Sosika</h1>

            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="lg:grid lg:grid-cols-12 lg:gap-6">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-3 mb-6 lg:mb-0">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="justify-right mb-1">

                                <button
                                    onClick={resetFilters}
                                    className="text-sm text-blue-600 hover:text-blue-700  gap-1"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex gap-4 overflow-x-auto py-2">
                                        {categories.map(({ label, value, icon: Icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => setSelectedCategory(value)}
                                                className={`flex flex-col items-center justify-center p-2 border rounded-lg w-15 h-15 transition-all ${selectedCategory === value ? "bg-blue-500 text-white" : "bg-gray-100"
                                                    }`}
                                            >
                                                <Icon className="w-6 h-6 mb-2" />
                                                <span className="text-sm font-medium">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className='flex justify-center overflow-auto max-h-64'>
                                    <div className='w-1/2'>
                                        <select
                                            value={vendorFilter}
                                            onChange={(e) => setVendorFilter(e.target.value)}
                                            className="px-1 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">All Vendors</option>
                                            {vendors.map(vendorId => (
                                                <option className='' key={vendorId} value={vendorId}>Vendor {vendorId}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className='w-1/2'>
                                        <select
                                            value={sortOption}
                                            onChange={(e) => setSortOption(e.target.value as "name-asc" | "name-desc" | "price-asc" | "price-desc")}
                                            className="px-1 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="name-asc">Name (A-Z)</option>
                                            <option value="name-desc">Name (Z-A)</option>
                                            <option value="price-asc">Price (Low to High)</option>
                                            <option value="price-desc">Price (High to Low)</option>
                                        </select>
                                    </div>
                                </div>


                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <DollarSign className="h-4 w-4" />
                                        Price Range (${priceRange.min} - ${priceRange.max})
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max={Math.max(...menuItems.map(item => parseFloat(item.price)))}
                                        value={priceRange.max}
                                        onChange={(e) => setPriceRange({ ...priceRange, max: parseFloat(e.target.value) })}
                                        className="w-full mt-2"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="availableOnly"
                                        checked={availableOnly}
                                        onChange={(e) => setAvailableOnly(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="availableOnly" className="text-sm text-gray-700">
                                        Show available only
                                    </label>
                                </div>


                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-9">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Showing {filteredItems.length} of {menuItems.length} items
                            </p>
                        </div>

                        {filteredItems.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${!item.is_available ? 'opacity-70' : ''
                                            }`}
                                    >
                                        <div className="relative aspect-square rounded-t-xl overflow-hidden">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
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
                                            <h3 className="font-medium text-gray-900 mb-1">{item.name}</h3>
                                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                                {item.description || 'No description available'}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">
                                                    Vendor #{item.vendor_id}
                                                </span>
                                                <span className="text-lg font-semibold text-blue-600">
                                                    ${parseFloat(item.price).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Frown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                                <p className="text-gray-500">Try adjusting your filters or search terms</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                </div>
            )}

            {error && (
                <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                    <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
                        <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuExplorer;