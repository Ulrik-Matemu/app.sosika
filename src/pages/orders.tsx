import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, X, ChevronDown, ChevronUp, Star, Calendar,  MapPin, RefreshCw, Filter, CheckCircle, AlertCircle, TruckIcon, PackageOpen, PhoneCallIcon, MicIcon } from 'lucide-react';
import Navbar from '../components/my-components/navbar';
import NotificationHandler from '../components/my-components/notification-handler';
import PageWrapper from '../services/page-transition';
import { Header } from '../components/my-components/header';
import { Toaster } from '../components/ui/toaster';
import { useToast } from '../hooks/use-toast';
import { ToastAction } from '../components/ui/toast';
import { Button } from '../components/ui/button';


// Define interfaces for order data
interface OrderItem {
    id: number;
    menu_item_id: number;
    quantity: number;
    price: number;
    total_amount: number;
}

interface Order {
    id: number;
    user_id: number;
    vendor_id: number;
    delivery_person_id: number | null;
    order_status: 'pending' | 'in_progress' | 'assigned' | 'completed' | 'cancelled';
    delivery_fee: number;
    total_amount: number;
    requested_datetime: string | null;
    requested_asap: boolean;
    order_datetime: string;
    pickup_datetime: string | null;
    delivery_datetime: string | null;
    delivery_rating: number | null;
    vendor_rating: number | null;
    items: OrderItem[];
}

interface FilterOptions {
    status: string;
    dateRange: {
        from: string | null;
        to: string | null;
    };
}

const ORDER_STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    assigned: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
};

const ORDER_STATUS_ICONS = {
    pending: AlertCircle,
    in_progress: PackageOpen,
    assigned: TruckIcon,
    completed: CheckCircle,
    cancelled: X
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const OrdersPage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
    const [filters, setFilters] = useState<FilterOptions>({
        status: '',
        dateRange: { from: null, to: null }
    });
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [ratingOrder, setRatingOrder] = useState<number | null>(null);
    const [ratings, setRatings] = useState({ vendor: 0, delivery: 0 });

    const toast = useToast();

    const startListening = () => {
        
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US'; // or 'sw' for Swahili if supported
        recognition.interimResults = false;
        recognition.onresult = (event: { results: { transcript: string; }[][]; }) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            handleVoiceCommand(transcript);
        };
        recognition.start();
    };

    const handleVoiceCommand = (text: string) => {
        const command = text.toLowerCase();
    
        
    
        if (
            ["show menu", "go to menu", "open menu", "menu page", "menu please", "home", "homepage", "explore", "go home", "take me to menu", "go to home", "open home screen", "menu"]
              .some(phrase => command.includes(phrase))
          ) {
            window.location.href = "#/explore";
            navigator.vibrate(200);
            return;
          }
          
          if (
            ["profile", "my profile", "go to profile", "open profile", "show profile", "profile page", "user profile", "account", "my account"]
              .some(phrase => command.includes(phrase))
          ) {
            window.location.href = "#/profile";
            navigator.vibrate(200);
            return;
          }
          
          if (
            ["orders", "my orders", "show orders", "view orders", "order history", "order page", "open orders", "go to orders", "past orders"]
              .some(phrase => command.includes(phrase))
          ) {
            window.location.href = "#/orders";
            navigator.vibrate(200);
            return;
          }
    
    
    };


    const fetchOrders = async () => {
        try {
            const userId = localStorage.getItem('userId');
            
            if (!userId) {
                throw new Error('User ID not found. Please log in again.');
            }
            
            let url = `https://sosika-backend.onrender.com/api/orders?user_id=${userId}`;
            
            // Add filters if they exist
            if (filters.status) {
                url += `&status=${filters.status}`;
            }
            if (filters.dateRange.from) {
                url += `&from_date=${filters.dateRange.from}`;
            }
            if (filters.dateRange.to) {
                url += `&to_date=${filters.dateRange.to}`;
            }
            
            const response = await axios.get(url);
            setOrders(response.data);
            setIsLoading(false);
        } catch (err) {
            console.error('Error fetching orders:', err);
            toast.toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "There was a problem with your request.",
                action: <ToastAction altText="Try again" onClick={fetchOrders}>Try again</ToastAction>,
              });
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [filters]);

    const toggleOrderExpand = (orderId: number) => {
        setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    };

    const resetFilters = () => {
        setFilters({
            status: '',
            dateRange: { from: null, to: null }
        });
    };

    const submitRating = async (orderId: number) => {
        try {
            await axios.patch(`https://sosika-backend.onrender.com/api/orders/${orderId}/ratings`, {
                vendor_rating: ratings.vendor,
                delivery_rating: ratings.delivery
            });
            
            // Update local state to reflect the new ratings
            setOrders(orders.map(order => 
                order.id === orderId 
                    ? {...order, vendor_rating: ratings.vendor, delivery_rating: ratings.delivery} 
                    : order
            ));
            
            setRatingOrder(null);
            setRatings({ vendor: 0, delivery: 0 });
        } catch (err) {
            console.error('Error submitting ratings:', err);
            alert('Failed to submit ratings. Please try again.');
        }
    };

    const trackOrder = (orderId: number) => {
        window.location.href = `#/order-tracking/${orderId}`;
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
        );
    }
// 
  

    const renderOrderStatus = (status: string) => {
        const StatusIcon = ORDER_STATUS_ICONS[status as keyof typeof ORDER_STATUS_ICONS] || AlertCircle;
        return (
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
            </div>
        );
    };

    const renderStarRating = (value: number, onChange: (rating: number) => void) => {
        return (
            <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={24}
                        className={`cursor-pointer ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        onClick={() => onChange(star)}
                    />
                ))}
            </div>
        );
    };

    return (
        <>
        <Toaster />
        <Button
                onClick={startListening}
                className="font-extrabold text-2xl fixed bottom-[90px] right-4 flex items-center gap-2 bg-[#00bfff] text-white px-4 py-2 rounded-full shadow-md hover:scale-105 transition"
            >
                <span>S</span>
              <MicIcon className='animate-pulse' />
            </Button>
        <div className="min-h-screen bg-gray-50 dark:bg-[#2b2b2b] pb-8">
            <NotificationHandler />
          <Header />
            <PageWrapper>

            <div className="max-w-4xl mx-auto px-4 py-2 pb-12">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold dark:text-white mb-2">My Orders</h2>
                    <div className="flex justify-between items-center">
                        <p className="text-gray-600 dark:text-gray-300">
                            {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => fetchOrders()}
                                className="p-2 bg-white dark:bg-[#3b3b3b] rounded-full shadow hover:bg-gray-100 dark:hover:bg-[#4b4b4b]"
                                title="Refresh orders"
                            >
                                <RefreshCw className="h-5 w-5 text-[#00bfff]" />
                            </button>
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`p-2 rounded-full shadow hover:bg-gray-100 dark:hover:bg-[#4b4b4b] ${isFilterOpen ? 'bg-[#00bfff] text-white' : 'bg-white dark:bg-[#3b3b3b] text-[#00bfff]'}`}
                                title="Filter orders"
                            >
                                <Filter className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters panel */}
                {isFilterOpen && (
                    <div className="bg-white dark:bg-[#3b3b3b] rounded-xl shadow p-4 mb-6 animate-slide-down">
                        <h3 className="font-semibold text-lg mb-4 dark:text-white">Filters</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Status</label>
                                <select 
                                    value={filters.status}
                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#4b4b4b] dark:border-gray-700 dark:text-white"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                                    <input 
                                        type="date" 
                                        value={filters.dateRange.from || ''}
                                        onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, from: e.target.value || null}})}
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#4b4b4b] dark:border-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                                    <input 
                                        type="date" 
                                        value={filters.dateRange.to || ''}
                                        onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, to: e.target.value || null}})}
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#4b4b4b] dark:border-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button 
                                    onClick={resetFilters}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-[#3b3b3b] rounded-xl shadow">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-[#4b4b4b] rounded-full mb-4">
                            <PackageOpen className="h-8 w-8 text-gray-500 dark:text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium dark:text-white mb-2">No orders found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't placed any orders yet</p>
                        <a href="#/explore" className="px-6 py-3 bg-[#00bfff] text-white rounded-lg hover:bg-[#0099cc]">
                            Explore Menu
                        </a>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white dark:bg-[#3b3b3b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div 
                                    className="p-4 flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleOrderExpand(order.id)}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold dark:text-white">Order #{order.id}</span>
                                            {renderOrderStatus(order.order_status)}
                                        </div>
                                        <div>
                                            <span className='flex items-center'> 
                                                <PhoneCallIcon className='w-4 h-4 mr-1' />
                                            <p className='text-[12px] text-gray-500 dark:text-gray-400'>+255 760 903 468</p>
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                                            <span className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-1" /> 
                                                {formatDate(order.order_datetime)}
                                            </span>
                                            <span className="flex items-center">
                                                <MapPin className="w-4 h-4 mr-1" /> 
                                                Vendor #{order.vendor_id}
                                            </span>
                                            <span className="flex items-center">
                                                
                                                TZS{order.total_amount}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        {expandedOrderId === order.id ? 
                                            <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                        }
                                    </div>
                                </div>

                                {expandedOrderId === order.id && (
                                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 animate-slide-down">
                                        <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-3">Order Items</h4>
                                        <div className="space-y-2 mb-4">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex justify-between items-center">
                                                    <div className="flex items-center">
                                                        <span className="bg-gray-100 dark:bg-[#4b4b4b] text-gray-600 dark:text-gray-300 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="dark:text-white">Item #{item.menu_item_id}</span>
                                                    </div>
                                                    <span className="font-medium text-[#00bfff]">TZS{(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mb-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                                <span className="dark:text-white">TZS{(order.total_amount - order.delivery_fee).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                                                <span className="dark:text-white">TZS{order.delivery_fee}</span>
                                            </div>
                                            <div className="flex justify-between items-center font-semibold">
                                                <span className="dark:text-white">Total</span>
                                                <span className="text-[#00bfff]">TZS{order.total_amount}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {['assigned', 'in_progress'].includes(order.order_status) && (
                                                <button 
                                                    onClick={() => trackOrder(order.id)}
                                                    className="px-4 py-2 bg-[#00bfff] text-white rounded-lg hover:bg-[#0099cc] flex items-center gap-1"
                                                >
                                                    <MapPin className="h-4 w-4" />
                                                    Track Order
                                                </button>
                                            )}
                                            {order.order_status === 'completed' && !order.vendor_rating && !order.delivery_rating && (
                                                <button 
                                                    onClick={() => setRatingOrder(order.id)}
                                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-1"
                                                >
                                                    <Star className="h-4 w-4" />
                                                    Rate Order
                                                </button>
                                            )}
                                            {order.order_status === 'completed' && (order.vendor_rating || order.delivery_rating) && (
                                                <div className="w-full mt-2">
                                                    <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">Your Ratings</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Vendor</p>
                                                            <div className="flex">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        size={16}
                                                                        className={`${star <= (order.vendor_rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Delivery</p>
                                                            <div className="flex">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        size={16}
                                                                        className={`${star <= (order.delivery_rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rating Modal */}
            {ratingOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-[#3b3b3b] rounded-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Rate Your Order</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">How was your experience with Order #{ratingOrder}?</p>

                        <div className="space-y-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Vendor Rating
                                </label>
                                {renderStarRating(ratings.vendor, (rating) => setRatings({...ratings, vendor: rating}))}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Delivery Rating
                                </label>
                                {renderStarRating(ratings.delivery, (rating) => setRatings({...ratings, delivery: rating}))}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setRatingOrder(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#4b4b4b]"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => submitRating(ratingOrder)}
                                className="px-4 py-2 bg-[#00bfff] text-white rounded-lg hover:bg-[#0099cc]"
                                disabled={ratings.vendor === 0 && ratings.delivery === 0}
                            >
                                Submit Ratings
                            </button>
                        </div>
                    </div>
                </div>
            )}
</PageWrapper>
            <Navbar />
        </div>
        </>
    );
};



export default OrdersPage;