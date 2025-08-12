import { Header } from "../components/my-components/header";
import React, { useEffect, useState } from "react";
import { useCartContext } from '../context/cartContext';
import CartDrawer from '../components/my-components/CartDrawer';
import { ShoppingCart } from 'lucide-react';
import Navbar from "../components/my-components/navbar";

interface Vendor {
  id: number;
  name: string;
  owner_name: string;
  college_id: number;
  is_open: boolean;
  geolocation: string;
  logo_url: string;
}

interface MenuItem {
  id: number;
  vendor_id: number;
  name: string;
  description: string;
  category: "breakfast" | "lunch" | "dinner" | "snacks" | "drinks";
  price: number;
  is_available: boolean;
  image_url: string;
}

const VendorPage: React.FC<{ vendorId: number }> = ({ vendorId }) => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "breakfast" | "lunch" | "dinner" | "snacks" | "drinks"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { addToCart, cart, cartTotal, updateQuantity, removeFromCart, clearCart } = useCartContext();

  const availableCategories = Array.from(
    new Set(menuItems.map((item) => item.category))
  ).sort();

  const categories = ["all", ...availableCategories];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [vendorRes, menuRes] = await Promise.all([
          fetch(`https://sosika-backend.onrender.com/api/vendor/${vendorId}`),
          fetch(`https://sosika-backend.onrender.com/api/menuItems/${vendorId}`),
        ]);

        if (!vendorRes.ok) {
          throw new Error(`Failed to fetch vendor details: ${vendorRes.statusText}`);
        }
        if (!menuRes.ok) {
          throw new Error(`Failed to fetch menu items: ${menuRes.statusText}`);
        }

        const vendorData = await vendorRes.json();
        const menuData = await menuRes.json();

        setVendor(vendorData);
        setMenuItems(menuData.menuItems);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [vendorId]);

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-4 h-48 sm:h-64 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        <div className="flex space-x-3 mb-6">
          {Array(4)
            .fill(0)
            .map((_, idx) => (
              <div
                key={idx}
                className="w-20 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
              ></div>
            ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, idx) => (
              <div
                key={idx}
                className="h-60 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
              ></div>
            ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          Vendor not found.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 dark:bg-[#2c2c2c] shadow-xl md:rounded-lg overflow-hidden">
      <div className="fixed w-full bg-transparent z-10">
        <Header />
      </div>
      {/* Vendor Header */}
      <div
        className="relative h-48 sm:h-64 bg-cover bg-center"
        style={{
          backgroundImage: `url('${vendor.logo_url}')`,
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{vendor.name}</h1>
            <p
              className={`mt-1 font-semibold text-sm ${vendor.is_open ? "text-green-400" : "text-red-400"
                }`}
            >
              {vendor.is_open ? "Open Now" : "Closed"}
            </p>
           
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex overflow-x-auto custom-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  setSelectedCategory(category as MenuItem["category"] | "all")
                }
                className={`flex-shrink-0 capitalize px-4 py-2 rounded-full text-sm font-medium mr-2 transition-all duration-200
                  ${selectedCategory === category
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                {category === "all" ? "All Items" : category}
              </button>
            ))}
          </div>
        </div>
        

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col"
              >
                <img
                  src={
                    item.image_url ||
                    "https://via.placeholder.com/400x250/F3F4F6/9CA3AF?text=No+Image"
                  }
                  alt={item.name}
                  className="w-full h-36 sm:h-48 object-cover rounded-t-xl"
                />
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {item.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-auto pt-2">
                    <p className="text-green-700 dark:text-green-500 font-bold text-lg">
                      ${item.price}
                    </p>
                    <p
                      className={`text-xs font-medium px-2 py-1 rounded-full
                        ${item.is_available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {item.is_available ? "Available" : "Out of Stock"}
                    </p>
                  </div>
                  {/* Add to Cart Button */}
                  <button
                    className="mt-4 w-full bg-[#00bfff] text-white py-2 rounded-lg font-semibold hover:bg-[#0099cc] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!item.is_available}
                    onClick={() => addToCart({
                      ...item,
                      vendorId: item.vendor_id,
                      imageUrl: item.image_url,
                      quantity: 1,
                      isAvailable: item.is_available,
                      price: item.price.toString(),
                    })}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-300 py-8">
              No items found in this category. Please try another!
            </p>
          )}
        </div>
      </div>

      {/* Floating Cart Button */}
      <button
        className="fixed bottom-24 right-8 z-50 bg-[#00bfff] hover:bg-[#0099cc] text-white rounded-full shadow-lg p-4 flex items-center gap-2 transition-all duration-200"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingCart className="h-6 w-6" />
        {cart.length > 0 && (
          <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        )}
      </button>
      <Navbar />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        checkout={() => { }}
        loading={false}
      />
    </div>
  );
};

export default VendorPage;
