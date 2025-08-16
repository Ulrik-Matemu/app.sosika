import React, { useEffect, useState, Suspense, useRef } from 'react';
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

type VendorFormData = {
  name: string;
  ownerName: string;
  collegeId: number;
  geolocation?: { x: number; y: number };
};

const VendorProfile: React.FC = () => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    ownerName: '',
    collegeId: 0,
  });
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const vendorId = localStorage.getItem('vendorId');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch vendor
  useEffect(() => {
    const fetchVendor = async () => {
      if (!vendorId) return;
      try {
        const response = await axios.get<Vendor>(`https://sosika-backend.onrender.com/api/vendor/${vendorId}`);
        setVendor(response.data);
        setFormData({
          name: response.data.name,
          ownerName: response.data.owner_name,
          collegeId: response.data.college_id,
          geolocation: response.data.geolocation,
        });
      } catch (error) {
        console.error('Error fetching vendor:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [vendorId]);

  // File change handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size <= 5 * 1024 * 1024) {
        setSelectedLogo(file);
      } else {
        alert('File too large. Please select an image under 5MB.');
      }
    }
  };

  const handleCancelUpload = () => {
    setSelectedLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGeolocationChange = (longitude: number, latitude: number) => {
    setFormData(prev => ({
      ...prev,
      geolocation: { x: longitude, y: latitude },
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'collegeId' ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    if (!vendorId) return;
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
    if (!selectedLogo || !vendorId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('logo', selectedLogo);

    try {
      await axios.post(`https://sosika-backend.onrender.com/api/vendors/${vendorId}/logo`, formData);
      setSelectedLogo(null);
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                                        src={selectedLogo ? URL.createObjectURL(selectedLogo) : vendor.logo_url}
                                        alt="Vendor Logo"
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                </div>

                                {/* Hover overlay for file selection */}
                                <label className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="text-center">
                                        <Camera className="w-8 h-8 text-white mx-auto mb-1" />
                                        <span className="text-white text-xs">Change Logo</span>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        ref={fileInputRef}
                                    />
                                </label>

                                {/* Upload button - shows when file is selected */}
                                {selectedLogo && (
                                    <button
                                        onClick={handleLogoUpload}
                                        disabled={uploading}
                                        className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                    </button>
                                )}

                                {/* Cancel button - shows when file is selected */}
                                {selectedLogo && (
                                    <button
                                        onClick={handleCancelUpload}
                                        className="absolute -bottom-2 -left-2 bg-gray-600 text-white rounded-full p-2 shadow-lg hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {/* File size/type indicator */}
                                {selectedLogo && (
                                    <div className="absolute -top-8 left-0 right-0 text-center">
                                        <span className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            {(selectedLogo.size / 1024 / 1024).toFixed(1)}MB
                                        </span>
                                    </div>
                                )}
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
                                            className="w-full dark:text-gray-900 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                            className="w-full dark:text-gray-900 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter owner name"
                                        />
                                    </div>


                                </>
                            ) : (
                                <>
                                    <div className="flex items-center p-4 bg-gray-50 dark:bg-[#121212] rounded-xl">
                                        <User className="w-5 h-5 text-gray-600 mr-3 dark:text-gray-200" />
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Owner</p>
                                            <p className="font-medium text-gray-900 dark:text-gray-200">{vendor.owner_name}</p>
                                        </div>
                                    </div>



                                    <div className="flex items-center p-4 bg-gray-50 dark:bg-[#121212] rounded-xl">
                                        <Truck className="w-5 h-5 text-gray-600 mr-3 dark:text-gray-200" />
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Own Delivery</p>
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
                                    {saving ? '' : 'Save'}
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
                           Business Location
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