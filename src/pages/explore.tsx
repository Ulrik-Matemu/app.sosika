import { useState, useEffect, Suspense } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin } from 'lucide-react';
import Navbar from '../components/my-components/navbar';
import ThemeToggle from '../components/my-components/themeToggle';
import NotificationHandler from '../components/my-components/notification-handler';
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import PageWrapper from '../services/page-transition';
import { Toaster } from '../components/ui/toaster';
import { CustomItemRequestDialog } from '../components/my-components/otherItems';
const PopularMenus = React.lazy(() => import('../components/my-components/PopularMenus'));
const RecommendationCard = React.lazy(() => import('../components/my-components/recommendationCard'));
import { logEvent, analytics } from '../firebase';
import { useCartContext } from '../context/cartContext';
// import { getDeliveryFee } from '../services/deliveryFee';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';
import { useLocationSelector } from '../hooks/useLocationSelector';
import CartDrawer from '../components/my-components/CartDrawer';
const LocationPickerModal = React.lazy(() => import('../components/my-components/LocationPicker'));


const isInStandaloneMode = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
// should be false on desktop
console.log("standalone", isInStandaloneMode());  // should be false if not installed

const API_URL = import.meta.env.VITE_API_URL;



const MenuExplorer = () => {
    const { deferredPrompt, promptInstall } = usePWAInstallPrompt();
    const [showInstallBtn, setShowInstallBtn] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [error] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);  
   // Cart state (now from hook)
    const { cart, cartTotal,  removeFromCart, updateQuantity, clearCart, checkout, loading } = useCartContext();
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const navigate = useNavigate();

    // Location logic via hook
    const {
        loading: locationLoading,
        isLocationOpen,
        setIsLocationOpen,
        addCurrentLocation,
    } = useLocationSelector({
        API_URL,
        onLocationUpdate: () => {
            // Optionally handle after location update
        },
    });

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

    useEffect(() => {
        setShowTooltip(true); // Show tooltip on page load

        const timer = setTimeout(() => {
            setShowTooltip(false); // Hide after 6 seconds
        }, 6000);

        return () => clearTimeout(timer);
    }, []);

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

    function setSelectedCoords(_arg0: { lng: number; lat: number; }) {
        throw new Error('Function not implemented.');
    }

    const { handleSelectLocation } = useLocationSelector({
        API_URL,
        onLocationUpdate: () => {
            // Optionally handle after location update
        },
    });

    return (
        <>
            <Toaster />
            <div className="min-h-screen bg-gray-50 dark:bg-[#121212] pb-8">
                <NotificationHandler />
                <header className="sticky top-0 z-50 flex justify-between bg-[rgba(237,237,237,0.95)] dark:bg-[rgba(18,18,18,0.95)] px-4 py-4">
                    <h1 className="text-3xl text-center font-extrabold text-[#00bfff]">Sosika</h1>
                    <div className="flex items-center gap-4">
                        <Tooltip open={showTooltip}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => {
                                        logEvent(analytics, "button_click", {
                                            button_name: "Select Location",
                                            location: "Explore page",
                                        });
                                        setIsLocationOpen(true);
                                    }}
                                    className="relative p-2 rounded-md dark:border-gray-600 dark:text-white hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    aria-label="Open location selector"
                                    title="Select Location"
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
                        <ThemeToggle />
                    </div>
                </header>
                <PageWrapper>
                    {/* Location Selection Modal */}
                    {isLocationOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                            <div className="bg-[#ededed] dark:bg-[#121212] p-6 rounded-lg shadow-lg w-80">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-[#00bfff]">Select Location</h2>
                                    <button onClick={() => setIsLocationOpen(false)}>
                                        <X className="h-5 w-5 text-gray-600 dark:text-white" />
                                    </button>
                                </div>

                                <ul className="mt-4 space-y-2">
                                    <li
                                        onClick={addCurrentLocation}
                                        className="p-2 flex justify-center rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-blue-500 font-medium"
                                    >
                                        {locationLoading ? (
                                            <svg className="animate-spin h-5 w-5 text-[#121212]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            'Use my current location'
                                        )}
                                    </li>
                                    <li>
                                        <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
                                            <LocationPickerModal
                                                isOpen={isLocationOpen}
                                                onClose={() => setIsLocationOpen(false)}
                                                onLocationSelect={(lng, lat) => {
                                                    setSelectedCoords({ lng, lat });
                                                }}
                                                loading={locationLoading}
                                                useCurrentLocation={addCurrentLocation}
                                                handleSelectLocation={handleSelectLocation}
                                            />
                                        </Suspense>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="max-w-7xl mx-auto px-4 py-2 pb-12">
                        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
                            {/* Filters Sidebar */}
                            <div className="lg:col-span-3 mb-6 lg:mb-0">
                                <div className="dark:bg-[#121212] p-0 rounded-xl  border border-[transparent] dark:border-[transparent]">


                                    <div className="space-y-4">
                                        <PopularMenus />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='mb-18 bt-2'>
                            <RecommendationCard />
                            <div className='py-8 flex justify-center w-full'>
                                <CustomItemRequestDialog />
                            </div>
                        </div>
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

export default MenuExplorer;