import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface MenuListProps {
  filteredItems: any[];
  menuItems: any[];
  layout: string;
  loadingMenu: boolean;
  addToCart: (item: any) => void;
  logEvent: (...args: any[]) => void;
}

const MenuList: React.FC<MenuListProps> = ({
  filteredItems,
  menuItems,
  layout,
  loadingMenu,
  addToCart,
  logEvent,
}) => {
  return (
    <div className="lg:col-span-9 mb-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 font-bold dark:text-white">
          Showing {filteredItems.length} of {menuItems.length} items
        </p>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {/* Layout buttons should be handled in parent for state */}
        </div>
      </div>
      {loadingMenu ? (
        // Show Skeletons
        <></>
      ) : filteredItems.length > 0 ? (
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
                      onClick={() => {
                        logEvent("button_click", {
                          button_name: `Added ${item.name} to cart`,
                          location: "Explore page",
                        });
                        addToCart({
                          ...item,
                          vendorId: item.vendor_id,
                          imageUrl: item.image_url,
                          isAvailable: item.is_available,
                        });
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
          {/* Add list and compact layouts here if needed, similar to above */}
        </>
      ) : (
        <div className="text-center py-12">
          <X className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-2">No items found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}
    </div>
  );
};

export default MenuList;
