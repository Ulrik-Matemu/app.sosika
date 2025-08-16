import React, { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import { MapPin, Edit3, Save, X, Upload, Camera, Store, User, Truck } from 'lucide-react';
const VendorMap = React.lazy(() => import('../../components/my-components/vendorMap'));
import { Header } from '../../components/my-components/header';
import Navbar from '../../components/my-components/navbar'

type Vendor = {
    id: number;
    name: string;
    owner_name: string;
    college_id: number;
    geolocation: { x: number; y: number };
    is_open: boolean;
    category: string;
    does_own_delivery: boolean;
    logo_url: string;
};

const VendorProfile: React.FC = () => {
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const vendorId = localStorage.getItem('vendorId');

    useEffect(() => {
        const fetchVendor = async () => {
            try {
                const response = await axios.get(`https://sosika-backend.onrender.com/api/vendor/${vendorId}`);
                setVendor(response.data);
                setFormData({
                    name: response.data.name,
                    ownerName: response.data.owner_name,
                    collegeId: response.data.college_id,
                });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching vendor:', error);
                setLoading(false);
            }
        };

        fetchVendor();
    }, []);

    const handleGeolocationChange = (longitude: number, latitude: number) => {
        setFormData((prevData: any) => ({
            ...prevData,
            geolocation: { x: longitude, y: latitude },
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData: any) => ({ ...prevData, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedVendor = { ...formData, logo_url: vendor?.logo_url };
            await axios.put(`https://sosika-backend.onrender.com/api/vendor/${vendorId}`, updatedVendor);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating vendor:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async () => {
        if (logoFile) {
            const formData = new FormData();
            formData.append('logo', logoFile);

            try {
                await axios.post(`https://sosika-backend.onrender.com/api/vendors/${vendorId}/logo`, formData);
                setLogoFile(null);
            } catch (error) {
                console.error('Error uploading logo:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading vendor profile...</p>
                </div>
            </div>
        );
    }

    if (!vendor) return <div>Vendor not found</div>;

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <Header />
            <div className="max-w-4xl mx-auto px-2 pb-24">
                {/* Header Card */}
                <div className="bg-white dark:bg-black rounded-br-2xl overflow-hidden">
                    <div className="bg-white dark:bg-black h-20 relative">
                    </div>

                    <div className="px-4 pb-8 -mt-14 relative">
                        <div className="flex  sm:flex-row items-start sm:items-end gap-6">
                            {/* Logo Section */}
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg bg-white p-2">
                                    <img
                                        src={vendor.logo_url}
                                        alt="Vendor Logo"
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                </div>

                                {isEditing ? (
                                    <label className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                        />
                                    </label>
                                ) : logoFile ? (
                                    <button
                                        onClick={handleLogoUpload}
                                        className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                    </button>
                                ) : null}
                            </div>

                            {/* Title and Status */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-200">{vendor.name}</h1>

                                </div>

                                <div className="flex items-center text-gray-600 mb-4">
                                    <span className="flex bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm">
                                        <Store className="w-4 h-4 mr-2" />
                                        {vendor.category}
                                        <div className={`px-3 rounded text-sm font-medium`}>
                                            <div className="flex items-center gap-1">
                                                <div className={`w-2 h-2 rounded-full ${vendor.is_open ? 'bg-green-500' : 'bg-red-500'
                                                    }`}></div>
                                                {vendor.is_open ? 'Open' : 'Closed'}
                                            </div>
                                        </div>
                                    </span>
                                </div>

                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Details Card */}
                    <div className="bg-white dark:bg-black rounded-br-2xl px-4">
                        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-200">Vendor Details</h2>

                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                            <Store className="w-4 h-4 inline mr-2" />
                                            Vendor Name
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter vendor name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                            <User className="w-4 h-4 inline mr-2" />
                                            Owner Name
                                        </label>
                                        <input
                                            type="text"
                                            name="ownerName"
                                            value={formData.ownerName || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter owner name"
                                        />
                                    </div>


                                </>
                            ) : (
                                <>
                                    <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                                        <User className="w-5 h-5 text-gray-600 mr-3" />
                                        <div>
                                            <p className="text-sm text-gray-500">Owner</p>
                                            <p className="font-medium text-gray-900">{vendor.owner_name}</p>
                                        </div>
                                    </div>



                                    <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                                        <Truck className="w-5 h-5 text-gray-600 mr-3" />
                                        <div>
                                            <p className="text-sm text-gray-500">Own Delivery</p>
                                            <p className={`font-medium ${vendor.does_own_delivery ? 'text-green-600' : 'text-red-600'}`}>
                                                {vendor.does_own_delivery ? 'Available' : 'Not Available'}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {isEditing && (
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {saving ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>

                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Location Card */}
                    <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-lg p-6 mx-2">
                        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-200 flex items-center">
                            <MapPin className="w-5 h-5 mr-2" />
                            Location
                        </h2>

                        {isEditing ? (
                            <div className="mb-4">
                                <VendorMap
                                    initialLongitude={formData.geolocation?.x ?? vendor?.geolocation?.x ?? 0}
                                    initialLatitude={formData.geolocation?.y ?? vendor?.geolocation?.y ?? 0}
                                    onGeolocationChange={handleGeolocationChange}
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Suspense>
                                    <VendorMap
                                    initialLongitude={vendor.geolocation.x}
                                    initialLatitude={vendor.geolocation.y}
                                    onGeolocationChange={() => { }}
                                />
                                </Suspense>
                                

                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Latitude</p>
                                            <p className="font-mono font-medium text-gray-900">{vendor.geolocation.y}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Longitude</p>
                                            <p className="font-mono font-medium text-gray-900">{vendor.geolocation.x}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Navbar />
        </div>
    );
};

export default VendorProfile;