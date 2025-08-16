import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Store, MapPin, Truck, Lock, User, Target, Map } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Header } from '../components/my-components/header';
import { Button } from '../components/ui/button'
import PageWrapper from '../services/page-transition';

const VendorRegistration = () => {
    const [currentStep, setCurrentStep] = useState(1);
    type Geolocation = { lat: number; lng: number } | null;

    interface VendorFormData {
        vendor_name: string;
        category: string;
        does_own_delivery: boolean;
        geolocation: Geolocation;
        vendorPassword: string;
    }

    type VendorFormErrors = Partial<Record<keyof VendorFormData, string>>;

    const [formData, setFormData] = useState<VendorFormData>({
        vendor_name: '',
        category: '',
        does_own_delivery: false,
        geolocation: null,
        vendorPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<VendorFormErrors>({});
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
        lat: -6.7924,
        lng: 39.2083,
    });
    const [selectedLocation, setSelectedLocation] = useState<Geolocation>(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<any>(null); // Use the correct Mapbox type if available
    const marker = useRef<any>(null); // Use the correct Mapbox type if available

    const steps = [
        { id: 1, title: 'Business Info', icon: Store },
        { id: 2, title: 'Category', icon: User },
        { id: 3, title: 'Location & Delivery', icon: MapPin },
        { id: 4, title: 'Security', icon: Lock }
    ];

    const categories = [
        'Food & Beverages',
        'Electronics',
        'Clothing & Fashion',
        'Books & Stationery',
        'Health & Beauty',
        'Sports & Recreation',
        'Home & Living',
        'Services',
        'Other'
    ];


    const navigateToProfile = () => {
        window.location.href = '/profile';
    }


    // Initialize Mapbox when step 3 is reached
    useEffect(() => {
        let mapInstance: any = null;
        let isMounted = true;

        const initMap = async () => {
            const mapboxgl = await import('mapbox-gl');
            mapboxgl.default.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

            let center: [number, number] = [mapCenter.lng, mapCenter.lat];
            if (navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject)
                    );
                    center = [position.coords.longitude, position.coords.latitude];
                } catch {
                    // fallback to default
                }
            }

            if (!mapContainer.current) return;

            mapInstance = new mapboxgl.default.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center,
                zoom: 13,
            });

            map.current = mapInstance;

            mapInstance.on('load', () => {
                if (!isMounted) return;
                const c = mapInstance.getCenter();
                const location = { lng: c.lng, lat: c.lat };
                updateMarker(location);
                setSelectedLocation(location);
                handleInputChange('geolocation', location);
            });

            // Throttle moveend event
            let throttleTimeout: NodeJS.Timeout | null = null;
            mapInstance.on('moveend', () => {
                if (throttleTimeout) return;
                throttleTimeout = setTimeout(() => {
                    throttleTimeout = null;
                    if (!isMounted) return;
                    const c = mapInstance.getCenter();
                    const location = { lng: c.lng, lat: c.lat };
                    updateMarker(location);
                    setSelectedLocation(location);
                    handleInputChange('geolocation', location);
                }, 500);
            });

            mapInstance.on('click', (e: any) => {
                if (!isMounted) return;
                const location = { lng: e.lngLat.lng, lat: e.lngLat.lat };
                updateMarker(location);
                setSelectedLocation(location);
                handleInputChange('geolocation', location);
            });

            mapInstance.addControl(new mapboxgl.default.NavigationControl());
        };

        if (currentStep === 3 && mapContainer.current && !map.current) {
            initMap();
        }

        return () => {
            isMounted = false;
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
            if (marker.current) {
                marker.current.remove();
                marker.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, mapCenter]);

    const updateMarker = (location: { lng: any; lat: any; }) => {
        if (map.current) {
            // Remove existing marker
            if (marker.current) {
                marker.current.remove();
            }
            // Add new marker
            import('mapbox-gl').then((mapboxgl) => {
                marker.current = new mapboxgl.default.Marker({
                    color: '#3B82F6'
                })
                    .setLngLat([location.lng, location.lat])
                    .addTo(map.current);
            });
            // Center map on location
            map.current.flyTo({
                center: [location.lng, location.lat],
                zoom: 15
            });
        }
    };

    const validateStep = (step: number) => {
        const newErrors: VendorFormErrors = {};

        if (step === 1 && !formData.vendor_name.trim()) {
            newErrors.vendor_name = 'Business name is required';
        }
        if (step === 2 && !formData.category) {
            newErrors.category = 'Please select a category';
        }
        if (step === 4 && (!formData.vendorPassword || formData.vendorPassword.length < 6)) {
            newErrors.vendorPassword = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleInputChange = <K extends keyof VendorFormData>(
        field: K,
        value: VendorFormData[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const getCurrentLocation = () => {
        setGettingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setSelectedLocation(location);
                    setMapCenter(location);
                    handleInputChange('geolocation', location);

                    // Update map and marker
                    if (map.current) {
                        map.current.flyTo({
                            center: [location.lng, location.lat],
                            zoom: 15
                        });
                        updateMarker(location);
                    }

                    setGettingLocation(false);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get current location. Please select manually on map.');
                    setGettingLocation(false);
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
            setGettingLocation(false);
        }
    };


    const clearLocation = () => {
        setSelectedLocation(null);
        handleInputChange('geolocation', null);
        if (marker.current) {
            marker.current.remove();
            marker.current = null;
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) return;

        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                throw new Error('User not logged in');
            }

            const response = await fetch('https://sosika-backend.onrender.com/api/auth/vendors/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    ...formData,
                    geolocation: formData.geolocation ? `(${formData.geolocation.lng}, ${formData.geolocation.lat})` : null
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Success - you might want to redirect or show success message
                alert('Vendor registration successful!');
                localStorage.setItem('vendorId', data.vendor_id);
                // Reset form or redirect
                setCurrentStep(1);
                setFormData({
                    vendor_name: '',
                    category: '',
                    does_own_delivery: false,
                    geolocation: null,
                    vendorPassword: ''
                });
                setSelectedLocation(null);
                if (marker.current) {
                    marker.current.remove();
                    marker.current = null;
                }
                window.location.href = '/profile';
            } else {
                throw new Error(data.error || 'Registration failed');
            }
        } catch (error: any) {
            alert('Registration failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <Store className="w-16 h-16 text-[#00bfff] mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-[#00bfff] mb-2">Business Information</h2>
                            <p className="text-gray-200">Let's start with your business name</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Business Name *
                            </label>
                            <input
                                type="text"
                                value={formData.vendor_name}
                                onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                                className={`bg-gray-900 w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#00bfff] focus:border-transparent ${errors.vendor_name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="eg. TastyBites Restaurant"
                            />
                            {errors.vendor_name && (
                                <p className="text-red-500 text-sm mt-1">{errors.vendor_name}</p>
                            )}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <User className="w-16 h-16 text-[#00bfff] mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-[#00bfff] mb-2">Business Category</h2>
                            <p className="text-gray-200">What type of business are you running?</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Select Category *
                            </label>
                            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                                <SelectTrigger className={`w-full bg-gray-900 h-12 ${errors.category ? 'border-red-500' : ''}`}>
                                    <SelectValue placeholder="Choose your business category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category && (
                                <p className="text-red-500 text-sm mt-2">{errors.category}</p>
                            )}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <MapPin className="w-16 h-16 text-[#00bfff] mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-[#00bfff] mb-2">Location & Delivery</h2>
                            <p className="text-gray-200">Set your business location and delivery options</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Business Location
                            </label>

                            {/* Location Selection Buttons */}
                            <div className="flex gap-3 mb-4">
                                <button
                                    type="button"
                                    onClick={getCurrentLocation}
                                    disabled={gettingLocation}
                                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {gettingLocation ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Target className="w-4 h-4" />
                                    )}
                                    <span>{gettingLocation ? 'Getting Location...' : 'Get My Location'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={clearLocation}
                                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Map className="w-4 h-4 text-[#00bfff]" />
                                    <span className='text-gray-200'>Clear</span>
                                </button>
                            </div>

                            {/* Mapbox Container */}
                            <div className="relative">
                                <div
                                    ref={mapContainer}
                                    className="w-full h-80 bg-gray-100 border rounded-lg"
                                    style={{ minHeight: '320px' }}
                                />

                                {/* Loading overlay */}
                                {!map.current && currentStep === 3 && (
                                    <div className="absolute inset-0 bg-gray-100 border rounded-lg flex items-center justify-center">
                                        <div className="text-center text-gray-500">
                                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <div>Loading Map...</div>
                                        </div>
                                    </div>
                                )}


                            </div>

                            {selectedLocation && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center space-x-2 text-green-800">
                                        <Check className="w-4 h-4" />
                                        <span className="text-sm font-medium">Location Selected</span>
                                    </div>
                                    <div className="text-sm text-green-700 mt-1">
                                        Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                                    </div>
                                    <div className="text-sm text-blue-700 mt-1">
                                        {selectedLocation && (
                                            <span>
                                                {/* TODO: Implement reverse geocoding here */}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.does_own_delivery}
                                    onChange={(e) => handleInputChange('does_own_delivery', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex items-center space-x-3">
                                    <Truck className="w-6 h-6 text-gray-600" />
                                    <div>
                                        <div className="font-medium text-gray-200">Own Delivery Service</div>
                                        <div className="text-sm text-gray-500">I handle my own deliveries</div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <Lock className="w-16 h-16 text-[#00bfff] mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-[#00bfff] mb-2">Security Setup</h2>
                            <p className="text-gray-200">Create a secure password for your vendor account</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Vendor Password *
                            </label>
                            <input
                                type="password"
                                value={formData.vendorPassword}
                                onChange={(e) => handleInputChange('vendorPassword', e.target.value)}
                                className={`w-full bg-gray-900 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.vendorPassword ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="Enter a secure password"
                            />
                            {errors.vendorPassword && (
                                <p className="text-red-500 text-sm mt-1">{errors.vendorPassword}</p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                                Password must be at least 6 characters long
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <Header />
            <PageWrapper>
            <div className="min-h-screen bg-black py-8">
                <div className="max-w-2xl mx-auto px-4">
                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isCompleted = currentStep > step.id;
                                const isCurrent = currentStep === step.id;

                                return (
                                    <React.Fragment key={step.id}>
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted
                                                    ? 'bg-green-500 border-green-500 text-white'
                                                    : isCurrent
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'bg-white border-gray-300 text-gray-400'
                                                    }`}
                                            >
                                                {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                            </div>
                                            <span
                                                className={`text-xs mt-2 font-medium ${isCompleted || isCurrent ? 'text-gray-200' : 'text-black'
                                                    }`}
                                            >
                                                {step.title}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div
                                                className={`flex-1 h-0.5 mx-4 transition-all ${isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                                    }`}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="bg-[#121212] rounded-xl shadow-lg p-4">
                        {renderStepContent()}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                            <button
                                onClick={handlePrevious}
                                disabled={currentStep === 1}
                                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${currentStep === 1
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                    }`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span>Previous</span>
                            </button>

                            {currentStep < steps.length ? (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex items-center space-x-2 bg-[#00bfff] text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        </>
                                    ) : (
                                        <>
                                            <span className='text-black font-semibold'>Let's Go</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="text-center mt-6 text-gray-600">
                        Step {currentStep} of {steps.length}
                    </div>
                </div>
                <div className='flex justify-center items-center mt-8'>
                    <Button variant='destructive' onClick={navigateToProfile}>Go Back to Profile</Button>
                </div>
            </div>
            </PageWrapper>
        </>
    );
};

export default VendorRegistration;