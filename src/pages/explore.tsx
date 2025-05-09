import { useState, useEffect } from 'react';
// Extend the Window interface to include SpeechRecognition and webkitSpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}
import axios from 'axios';
import { Search, Utensils, GlassWater, Sandwich, Cookie, X, RefreshCw, Frown, Loader2, Image as ImageIcon, ShoppingCart, Plus, Minus, Trash2, MapPinIcon, MapPin, LayoutGrid, List, Columns } from 'lucide-react';
import Navbar from '../components/my-components/navbar';
import ThemeToggle from '../components/my-components/themeToggle';
import NotificationHandler from '../components/my-components/notification-handler';
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import Autoplay from "embla-carousel-autoplay"
import { Card, CardContent } from "../components/ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "../components/ui/carousel";
import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../services/page-transition';
import Swal from 'sweetalert2';
import { useToast } from '../hooks/use-toast';
import { Toaster } from '../components/ui/toaster';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "../components/ui/pagination";
import { CustomItemRequestDialog } from '../components/my-components/otherItems';
import { useMenu } from '../pages/explore/Menu';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select"


const predefinedLocations = [
    { name: "Mamiro Hostel", lat: -3.4157279004216874, lng: 36.71139864504578 },
    { name: "Mamuya Hostel", lat: -3.4159921797731134, lng: 36.712876253216784 },
    { name: "Old Hostel", lat: -3.4152137532524893, lng: 36.70962012663434 },
    { name: "New Hostel", lat: -3.414513577401153, lng: 36.71026451427121 },
    { name: "Jackson Hostel", lat: -3.4158120478706007, lng: 36.713987296139855 },
    { name: "Shumbusho", lat: -3.418037404417581, lng: 36.71300246986059 }
];

const specialOffers = [
    {
        image: "/icons/1.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "#"
    },
    {
        image: "/icons/2.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "#"
    },
    {
        image: "/icons/3.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "https://ulrik-matemu.github.io/sosika-delivery/"
    },
    {
        image: "/icons/4.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "https://ulrik-matemu.github.io/sosika-vendor/"
    },
]

function CarouselPlugin() {
    const plugin = React.useRef(
        Autoplay({ delay: 4000, stopOnInteraction: false })
    )

    return (
        <Carousel
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            opts={{
                align: "start",
                loop: true
            }}
        >
            <CarouselContent>
                {specialOffers.map((item, index) => (
                    <CarouselItem key={index}>
                        <div className="p-2">
                            <Card>
                                <CardContent className="p-0">
                                    <Link to={item.link}>
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            loading="lazy"
                                            className="w-full  object-cover rounded-lg"
                                        />
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    )
}



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

// Define cart item interface
interface CartItem extends MenuItem {
    quantity: number;
}



const categories = [
    { label: "Breakfast", value: "breakfast", icon: Utensils },
    { label: "Lunch", value: "lunch", icon: Sandwich },
    { label: "Dinner", value: "dinner", icon: Utensils },
    { label: "Snacks", value: "snacks", icon: Cookie },
    { label: "Drinks", value: "drinks", icon: GlassWater },
];


const submitFcmToken = async (fcmToken: string) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        console.error("User ID not found");
        return;
    }

    try {
        const response = await axios.post("https://sosika-backend.onrender.com/api/auth/fcm-token", {
            userId,
            fcmToken,
        }, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        console.log("FCM token updated successfully:", response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error updating FCM token:", error.response?.data || error.message);
        } else {
            console.error("Unexpected error:", error);
        }
    }
}


const MenuExplorer = () => {
    const toast = useToast();
    // State for menu items and filters
    const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
    const [error] = useState<string | null>(null);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [, setSelectedLocation] = useState("");
    const [showTooltip, setShowTooltip] = useState(false);
    const [layout, setLayout] = useState(() => {
        // On first load, try to get the saved layout
        return localStorage.getItem("layout") || "compact";
    });
    const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState<boolean>(false);
    const [, setTrackedOrderId] = useState<string | null>(null);

    const {
        menuItems,
        isLoading,
        loadingMenu,
        priceRange,
        pagination,
        setPagination,
        setPriceRange,
    } = useMenu();


    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const [cartTotal, setCartTotal] = useState<number>(0);

    // Filter states
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [availableOnly, setAvailableOnly] = useState<boolean>(false);
    const [vendorFilter, setVendorFilter] = useState<string>('');
    
    type Vendor = {
        id: string;
        name: string;
        // any other fields you expect from your backend
    };
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [sortOption, setSortOption] = useState<"name-asc" | "name-desc" | "price-asc" | "price-desc">("name-asc");
    const [loading, setLoading] = useState<boolean>(false);






    useEffect(() => {
        const fcmToken = localStorage.getItem("fcmToken");
        if (fcmToken) {
            submitFcmToken(fcmToken);
        }
    }, []);

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
            toast.toast({
                description: 'Location updated successfully!'
            });

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
            },
            (error) => {
                console.error("Error fetching location:", error);
                alert("Unable to fetch your location. Please try again.");
            }
        );
    };




    // Fetch all menu items when component mounts


    const handlePageChange = (page: number) => {
        if (page > 0 && page <= pagination.totalPages) {
            setPagination((prev) => ({ ...prev, currentPage: page }));
        }
    };


    //Fetch vendors for names in filter
    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const response = await axios.get('https://sosika-backend.onrender.com/api/vendor');
                setVendors(response.data);
            } catch (err) {
                console.error('Failed to fetch vendors:', err);
            }
        };

        fetchVendors();
    }, []);

    // Calculate cart total whenever cart changes
    useEffect(() => {
        const total = cart.reduce((sum, item) => {
            return sum + (parseFloat(item.price) * item.quantity);
        }, 0);
        setCartTotal(total);
    }, [cart]);

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

    useEffect(() => {
        setShowTooltip(true); // Show tooltip on page load

        const timer = setTimeout(() => {
            setShowTooltip(false); // Hide after 6 seconds
        }, 6000);

        return () => clearTimeout(timer);
    }, []);

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

    // Cart functions
    const addToCart = (item: MenuItem) => {
        // Check if item is already in cart
        const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

        if (existingItemIndex !== -1) {
            // Item already in cart, increase quantity
            const newCart = [...cart];
            newCart[existingItemIndex].quantity += 1;
            setCart(newCart);
        } else {
            // Item not in cart, add it with quantity 1
            setCart([...cart, { ...item, quantity: 1 }]);
        }

        // Show cart drawer
        setIsCartOpen(true);
    };

    const removeFromCart = (itemId: number) => {
        setCart(cart.filter(item => item.id !== itemId));
    };

    const updateQuantity = (itemId: number, newQuantity: number) => {
        if (newQuantity < 1) {
            removeFromCart(itemId);
            return;
        }

        const newCart = cart.map(item =>
            item.id === itemId ? { ...item, quantity: newQuantity } : item
        );
        setCart(newCart);
    };

    const clearCart = () => {
        setCart([]);
    };


    const closeOrderTracking = () => {
        setIsOrderTrackingOpen(false);
        setTrackedOrderId(null);
    };

    const checkout = async () => {
        if (cart.length === 0) {
            Swal.fire({
                title: 'Empty Cart',
                text: 'Your cart is empty.',
                icon: 'warning'
            });
            return;
        }


        try {

            const user_id = localStorage.getItem('userId');
            const vendor_id = cart[0].vendor_id;
            let delivery_fee = 2000; // Example fee
            if (vendor_id === 1) {
                delivery_fee = 0;
            }

            let deliveryTime = "ASAP";
            let note = "Made Fresh Just for You!";

            let requested_asap = true; // User wants ASAP delivery
            if (cart[0].id === 7) {
                deliveryTime = "Tomorrow"
                note = "This delightful treat takes a day to prepare with extra care and love. We'll deliver it fresh and fabulous by tomorrow!🍰"
                Swal.fire({
                    title: "Special Order!",
                    text: "This special treat takes a day to prepare with love. We’ll have it delivered fresh and delightful by tomorrow!",
                    icon: "info",
                });
            }







            // Replace confirm with SweetAlert
            const result = await Swal.fire({
                title: 'Confirm Your Order',
                html: `
               <!-- SweetAlert Custom HTML Content -->
<div class="checkout-summary" style=" text-align: left; border-radius: 8px; overflow: hidden; animation: fadeIn 0.5s ease-out;">
    <!-- Styling -->
    <style>
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        
        .checkout-summary {
        }
        
        .item-row {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px dashed #e5e7eb;
            animation: slideIn 0.3s ease-out forwards;
            opacity: 0;
        }
        
        .item-row:last-child { border-bottom: none; }
        .item-row:nth-child(1) { animation-delay: 0.1s; }
        .item-row:nth-child(2) { animation-delay: 0.2s; }
        .item-row:nth-child(3) { animation-delay: 0.3s; }
        .item-row:nth-child(4) { animation-delay: 0.4s; }
        
        .icon-bubble {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 14px;
            flex-shrink: 0;
        }
        
        .label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 3px;
        }
        
        .value {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .delivery-time svg { animation: pulse 2s infinite; }
    </style>
    
    <!-- Cart Items -->
    <div class="item-row">
        <div class="icon-bubble" style="background-color: rgba(59, 130, 246, 0.12); color: #3b82f6;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="21" r="1"></circle>
                <circle cx="19" cy="21" r="1"></circle>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
        </div>
        <div>
            <div class="label">Total Items</div>
            <div class="value">${cart.length}</div>
        </div>
    </div>
    
    <!-- Delivery Time -->
    <div class="item-row delivery-time">
        <div class="icon-bubble" style="background-color: rgba(16, 185, 129, 0.12); color: #10b981;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
        </div>
        <div>
            <div class="label">Delivery Time</div>
            <div class="value">${deliveryTime}</div>
        </div>
    </div>
    
    <!-- Delivery Fee -->
    <div class="item-row">
        <div class="icon-bubble" style="background-color: rgba(245, 158, 11, 0.12); color: #f59e0b;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
        </div>
        <div>
            <div class="label">Delivery Fee</div>
            <div class="value">${delivery_fee.toLocaleString()} TZS</div>
        </div>
    </div>
    
    <!-- Payment Method -->
    <div class="item-row">
        <div class="icon-bubble" style="background-color: rgba(239, 68, 68, 0.12); color: #ef4444;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <line x1="12" y1="10" x2="12" y2="16"></line>
                <line x1="9" y1="13" x2="15" y2="13"></line>
            </svg>
        </div>
        <div>
            <div class="label">Payment Method</div>
            <div class="value">Cash on Delivery</div>
        </div>
    </div>
    
    ${note ? `
    <!-- Note (Conditional) -->
    <div class="item-row">
        <div class="icon-bubble" style="background-color: rgba(107, 114, 128, 0.12); color: #6b7280;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
                <line x1="9" y1="9" x2="10" y2="9"></line>
                <line x1="9" y1="13" x2="15" y2="13"></line>
                <line x1="9" y1="17" x2="15" y2="17"></line>
            </svg>
        </div>
        <div>
            <div class="label">Note</div>
            <div class="value" style="font-style: italic; font-weight: normal; font-size: 14px; color: #64748b;">${note}</div>
        </div>
    </div>
    ` : ''}
</div>
              `,
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Place Order',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return;

            // Prepare order payload
            const orderData = {
                user_id,
                vendor_id,
                delivery_fee,
                requested_asap,
                payment_method: "Cash on Delivery",
                order_items: cart.map(item => ({
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    price: parseFloat(item.price)
                }))
            };

            // Send order request
            const response = await axios.post("https://sosika-backend.onrender.com/api/orders", orderData);

            if (response.status === 201) {
                Swal.fire({
                    title: 'Order Placed',
                    text: `Order ID: ${response.data.order_id} placed successfully! 🚀`,
                    icon: "success"
                });
                setCart([]); // Clear cart after successful order
                setIsCartOpen(false); // Close cart modal

                window.location.href = `#/order-tracking/${response.data.order_id}`;
            }
        } catch (error) {
            console.error("Checkout error:", error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to place order. Please try again.',
                icon: 'error'
            });
        }
    };

    // Render loading state
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
        );
    }

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

    const SkeletonCard = () => (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse">
            <div className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-t-xl"></div>
            <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
        </div>
    );





    return (
        <>
            <Toaster />


            <div >
            </div>


            <div className="min-h-screen bg-gray-50 dark:bg-[#2b2b2b] pb-8">
                <NotificationHandler />
                <header className="sticky top-0 z-50 flex justify-between bg-[#ededed] dark:bg-[#2b2b2b] px-4 py-4">
                    <h1 className="text-3xl text-center font-extrabold text-[#00bfff]">Sosika<span className='text-[12px] font-medium text-green-400'> BETA</span></h1>
                    <div className="flex items-center gap-4">
                        <Tooltip open={showTooltip}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setIsLocationOpen(true)}
                                    className="relative p-2 rounded-md dark:border-gray-600 dark:text-white hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 transition"
                                >
                                    <MapPin />
                                </button>
                            </TooltipTrigger>
                            <div >
                                <TooltipContent className='w-[250px]'>
                                    Make sure to select your location before placing an order!
                                </TooltipContent>
                            </div>
                        </Tooltip>

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2"
                        >
                            <ShoppingCart className="h-6 w-6 text-[#00bfff]" />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                </span>
                            )}
                        </button>
                        <ThemeToggle />
                    </div>
                </header>
                <PageWrapper>

                    {/* Location Selection Modal */}
                    {isLocationOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                            <div className="bg-[#ededed] dark:bg-[#2b2b2b] p-6 rounded-lg shadow-lg w-80">
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
                    )}


                    <div className="max-w-7xl mx-auto px-4 py-2 pb-12">
                        <div className="mb-4 flex justify-between">
                            <div className="relative w-[85%]">
                                <Search className="absolute left-3 top-5 -translate-y-1/2 h-5 w-5 text-gray-400 " />
                                <input
                                    type="text"
                                    placeholder="Search menu items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 py-3 rounded-3xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-500 dark:text-black"
                                />
                            </div>

                            <div className="justify-right mb-1">
                                <button
                                    onClick={resetFilters}
                                    className="text-sm text-[#00bfff] hover:text-blue-700  gap-1"
                                >
                                    <RefreshCw className="h-10 w-10" />
                                </button>
                            </div>
                        </div>

                        <CarouselPlugin />

                        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
                            {/* Filters Sidebar */}
                            <div className="lg:col-span-3 mb-6 lg:mb-0">
                                <div className="dark:bg-[#2b2b2b] p-0 rounded-xl  border border-[transparent] dark:border-[transparent]">


                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex gap-4 overflow-x-auto py-2">
                                                {categories.map(({ label, value, icon: Icon }) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => setSelectedCategory(value)}
                                                        className={`flex flex-col dark:bg-[#7a7a7a] items-center justify-center p-2 border rounded-lg w-15 h-15 transition-all ${selectedCategory === value ? "bg-blue-500 text-white" : "bg-gray-100"
                                                            }`}
                                                    >
                                                        <Icon className="w-6 h-6 mb-2 dark:text-white" />
                                                        <span className="text-sm font-medium dark:text-white">{label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex overflow-auto h-full w-full gap-2">
                                            {/* Vendor Filter */}
                                            <Select value={vendorFilter} onValueChange={setVendorFilter}>
                                                <SelectTrigger className="w-48 rounded-2xl bg-gray-300 dark:bg-gray-800">
                                                    <SelectValue placeholder="All Vendors" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="All" onClick={() => setVendorFilter('')}>
                                                            All Vendors
                                                        </SelectItem>
                                                        {vendors.map((vendor) => (
                                                            <SelectItem key={vendor.id} value={String(vendor.id)}>
                                                                {vendor.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>


                                            {/* Sort Option Filter */}
                                            <Select value={sortOption} onValueChange={(val) => setSortOption(val as any)}>
                                                <SelectTrigger className="w-48 rounded-2xl bg-gray-300 dark:bg-gray-800 text-gray-400">
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
                                                                onClick={() => addToCart(item)}
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
                                                                    onClick={() => addToCart(item)}
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
                                                                onClick={() => addToCart(item)}
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
                        <div className='mb-20'>
                            <CustomItemRequestDialog />
                        </div>

                        <Pagination className='hidden'>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handlePageChange(pagination.currentPage - 1);
                                        }}
                                    />
                                </PaginationItem>

                                {[...Array(pagination.totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <PaginationItem key={pageNum}>
                                            <PaginationLink
                                                href="#"
                                                isActive={pagination.currentPage === pageNum}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handlePageChange(pageNum);
                                                }}
                                            >
                                                {pageNum}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {pagination.totalPages > 5 && <PaginationEllipsis />}

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handlePageChange(pagination.currentPage + 1)
                                        }}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>

                    </div>

                    {/* Order Tracking Modal */}
                    {isOrderTrackingOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
                            <div className="w-full max-w-md bg-[#ededed] dark:bg-[#2b2b2b] h-full flex flex-col animate-slide-in-right">
                                <div className="p-4 border-b flex justify-between items-center">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <MapPinIcon className="h-5 w-5" />
                                        Order Tracking
                                    </h2>
                                    <button
                                        onClick={closeOrderTracking}
                                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="flex-grow overflow-auto p-4">

                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cart Drawer */}
                    {isCartOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
                            <div className="w-full max-w-md bg-[#ededed] dark:bg-[#2b2b2b] h-full flex flex-col animate-slide-in-right">
                                <div className="p-4 border-b flex justify-between items-center">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <ShoppingCart className="h-5 w-5" />
                                        Your Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                                    </h2>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="flex-grow overflow-auto p-4">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-8">
                                            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500">Your cart is empty</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {cart.map(item => (
                                                <div key={item.id} className="bg-gray-50 dark:bg-[#3b3b3b] p-4 rounded-lg flex gap-4">
                                                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <h3 className="font-medium dark:text-white">{item.name}</h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            TZS {parseFloat(item.price).toFixed(2)} each
                                                        </p>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="flex items-center">
                                                                <button
                                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                                    className="p-1 bg-gray-200 dark:bg-gray-700 rounded-l"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </button>
                                                                <span className="px-3 py-1 bg-[#ededed] dark:bg-gray-600 text-center min-w-8">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                    className="p-1 bg-gray-200 dark:bg-gray-700 rounded-r"
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => removeFromCart(item.id)}
                                                                className="p-1 text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold text-[#00bfff]">
                                                        TZS {(parseFloat(item.price) * item.quantity).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {cart.length > 0 && (
                                    <div className="relative p-4 border-t mt-auto bottom-20">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-medium dark:text-white">Subtotal:</span>
                                            <span className="font-semibold text-[#00bfff]">TZS {cartTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={clearCart}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white flex-1"
                                            >
                                                Clear Cart
                                            </button>
                                            <button
                                                onClick={checkout}
                                                className="px-4 py-2 bg-[#00bfff] text-white rounded-lg hover:bg-[#0099cc] flex-1"
                                            >
                                                Checkout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        </div>
                    )}

                    {error && (
                        <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center">
                            <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
                                <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
                                <p className="text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    )}
                </PageWrapper>
                <Navbar />
            </div>
        </>
    );
};

export default MenuExplorer;