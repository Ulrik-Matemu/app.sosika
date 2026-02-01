import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Vendor } from '../mood/types/types';

const AdminDashboard = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const vendorsCollection = collection(db, 'vendors');
      const vendorSnapshot = await getDocs(vendorsCollection);
      const vendorsList = vendorSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Vendor[];
      setVendors(vendorsList);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    } finally {
      setLoadingVendors(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#00bfff] mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AddVendorForm onVendorAdded={fetchVendors} />
          <AddMenuItemForm vendors={vendors} loadingVendors={loadingVendors} />
        </div>
        <div className="mt-8">
          <AddMenuItemsInBulkForm vendors={vendors} loadingVendors={loadingVendors} />
        </div>
      </div>
    </div>
  );
};

/* --- ADD VENDOR FORM COMPONENT --- */

const AddVendorForm = ({ onVendorAdded }: { onVendorAdded: () => void }) => {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerName || !collegeId || !lat || !lng) {
      setError('Please fill all fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await addDoc(collection(db, 'vendors'), {
        name,
        owner_name: ownerName,
        college_id: Number(collegeId),
        geolocation: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        },
        is_open: isOpen,
      });
      setSuccess('Vendor added successfully!');
      setName('');
      setOwnerName('');
      setCollegeId('');
      setLat('');
      setLng('');
      setIsOpen(true);
      onVendorAdded();
    } catch (err) {
      setError('Failed to add vendor. Check Firestore rules.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-800 p-6 rounded-lg h-fit">
      <h2 className="text-xl font-bold mb-4">Add New Vendor</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Vendor Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-700 rounded p-2" />
        <input type="text" placeholder="Owner Name" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full bg-zinc-700 rounded p-2" />
        <input type="number" placeholder="College ID" value={collegeId} onChange={e => setCollegeId(e.target.value)} className="w-full bg-zinc-700 rounded p-2" />
        <div className="flex gap-4">
          <input type="number" step="any" placeholder="Lat" value={lat} onChange={e => setLat(e.target.value)} className="w-full bg-zinc-700 rounded p-2" />
          <input type="number" step="any" placeholder="Lng" value={lng} onChange={e => setLng(e.target.value)} className="w-full bg-zinc-700 rounded p-2" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_open" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} />
          <label htmlFor="is_open">Is Open</label>
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-[#00bfff] text-black font-bold py-2 rounded disabled:bg-zinc-600">
          {submitting ? 'Adding...' : 'Add Vendor'}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">{success}</p>}
      </form>
    </div>
  );
};

/* --- ADD MENU ITEM FORM COMPONENT --- */

const AddMenuItemForm = ({ vendors, loadingVendors }: { vendors: Vendor[], loadingVendors: boolean }) => {
    const [vendorId, setVendorId] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'drinks'>('lunch');
    const [price, setPrice] = useState('');
    const [isAvailable, setIsAvailable] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Cloudinary Credentials from your request
    const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 
    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; 

    useEffect(() => {
        if (vendors.length > 0 && !vendorId) {
            setVendorId(vendors[0].id);
        }
    }, [vendors, vendorId]);

    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );

        if (!response.ok) throw new Error('Cloudinary upload failed');
        const data = await response.json();
        return data.secure_url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorId || !name || !price || !imageFile) {
            setError('Please fill all required fields and select an image.');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const uploadedImageUrl = await uploadImage(imageFile);

            await addDoc(collection(db, 'menuItems'), {
                vendor_id: vendorId,
                name,
                description,
                category,
                price: parseFloat(price),
                is_available: isAvailable,
                image_url: uploadedImageUrl,
                created_at: new Date()
            });

            setSuccess('Menu item added successfully!');
            setName('');
            setDescription('');
            setPrice('');
            setImageFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setIsAvailable(true);
            // Reset file input manually if needed via a ref, but state clear is usually enough
        } catch (err: any) {
            setError(err.message || 'Failed to add menu item.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-zinc-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Add New Menu Item</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-sm text-zinc-400">Select Vendor</label>
                    <select 
                        value={vendorId} 
                        onChange={e => setVendorId(e.target.value)} 
                        className="w-full bg-zinc-700 rounded p-2" 
                        disabled={loadingVendors}
                    >
                        {loadingVendors ? (
                            <option>Loading vendors...</option>
                        ) : (
                            vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                        )}
                    </select>
                </div>

                <input type="text" placeholder="Item Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-700 rounded p-2" />
                
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-zinc-700 rounded p-2 h-20" />
                
                <div className="grid grid-cols-2 gap-4">
                    <select value={category} onChange={e => setCategory(e.target.value as any)} className="bg-zinc-700 rounded p-2">
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snacks">Snacks</option>
                        <option value="drinks">Drinks</option>
                    </select>
                    <input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} className="bg-zinc-700 rounded p-2" />
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-zinc-400">Item Image</label>
                    <input 
                        type="file" 
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} 
                        className="w-full bg-zinc-700 rounded p-1 text-sm file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:bg-zinc-600 file:text-white hover:file:bg-zinc-500" 
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_available" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
                    <label htmlFor="is_available">Is Available</label>
                </div>

                <button type="submit" disabled={submitting} className="w-full bg-[#00bfff] text-black font-bold py-2 rounded disabled:bg-zinc-600">
                    {submitting ? 'Uploading & Saving...' : 'Add Menu Item'}
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-500 text-sm">{success}</p>}
            </form>
        </div>
    );
};

/* --- ADD MENU ITEMS IN BULK FORM COMPONENT --- */

const AddMenuItemsInBulkForm = ({ vendors, loadingVendors }: { vendors: Vendor[], loadingVendors: boolean }) => {
  const [vendorId, setVendorId] = useState('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vendors.length > 0 && !vendorId) {
        setVendorId(vendors[0].id);
    }
  }, [vendors, vendorId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setJsonFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !jsonFile) {
      setError('Please select a vendor and a JSON file.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const fileContent = await jsonFile.text();
      const menuItems = JSON.parse(fileContent);

      if (!Array.isArray(menuItems)) {
        throw new Error('JSON file must contain an array of menu items.');
      }

      const batch = writeBatch(db);
      const menuItemsCollection = collection(db, 'menuItems');
      let itemCount = 0;

      for (const item of menuItems) {
        if (!item.name || !item.price || !item.category || !item.image_url) {
            console.warn('Skipping invalid menu item:', item);
            continue;
        }
        const newItemRef = doc(menuItemsCollection);
        batch.set(newItemRef, {
          vendor_id: vendorId,
          name: item.name,
          description: item.description || '',
          category: item.category,
          price: parseFloat(item.price),
          is_available: item.is_available !== undefined ? item.is_available : true,
          image_url: item.image_url,
          created_at: new Date()
        });
        itemCount++;
      }

      await batch.commit();

      setSuccess(`${itemCount} menu items added successfully!`);
      setJsonFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add menu items in bulk.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Add Menu Items in Bulk (JSON)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
            <label className="text-sm text-zinc-400">Select Vendor</label>
            <select 
                value={vendorId} 
                onChange={e => setVendorId(e.target.value)} 
                className="w-full bg-zinc-700 rounded p-2" 
                disabled={loadingVendors}
            >
                {loadingVendors ? (
                    <option>Loading vendors...</option>
                ) : (
                    vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                )}
            </select>
        </div>

        <div className="space-y-1">
            <label className="text-sm text-zinc-400">
                JSON File (.json)
                <a href="https://firebasestorage.googleapis.com/v0/b/sosika-a4328.appspot.com/o/misc%2FmenuItems-template.json?alt=media&token=33b68758-f8a3-482f-a39e-969895832b8f" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="text-xs text-[#00bfff] hover:underline ml-2">
                    (Download Template)
                </a>
            </label>
            <input 
                type="file" 
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileChange} 
                className="w-full bg-zinc-700 rounded p-1 text-sm file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:bg-zinc-600 file:text-white hover:file:bg-zinc-500" 
            />
        </div>

        <button type="submit" disabled={submitting || !jsonFile} className="w-full bg-[#00bfff] text-black font-bold py-2 rounded disabled:bg-zinc-600">
            {submitting ? 'Uploading & Saving...' : 'Add Bulk Items'}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">{success}</p>}
      </form>
    </div>
  );
};


export default AdminDashboard;