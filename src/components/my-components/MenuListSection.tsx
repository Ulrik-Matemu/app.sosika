import React from "react";
import SkeletonCard from "../../pages/explore/SkeletonCard.tsx";
import { Columns, List, LayoutGrid, X, Frown, ImageIcon } from "lucide-react";

interface MenuListSectionProps {
  filteredItems: any[];
  menuItems: any[];
  layout: string;
  setLayout: (layout: string) => void;
  loadingMenu: boolean;
  addToCart: (item: any) => void;
  logEvent: (...args: any[]) => void;
  analytics: any;
}

const MenuListSection: React.FC<MenuListSectionProps> = ({
  filteredItems,
  menuItems,
  layout,
  setLayout,
  loadingMenu,
  addToCart,
  logEvent,
  analytics,
}) => {
  return (
    <div className="lg:col-span-9 mb-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 font-bold dark:text-white">
          Showing {filteredItems.length} of {menuItems.length} items
        </p>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setLayout("grid")}
            className={`p-1.5 rounded-md ${layout === "grid" ? "bg-[#ededed] dark:bg-gray-700 shadow-sm" : ""}`}
            title="Grid view"
          >
            <Columns className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayout("list")}
            className={`p-1.5 rounded-md ${layout === "list" ? "bg-[#ededed] dark:bg-gray-700 shadow-sm" : ""}`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayout("compact")}
            className={`p-1.5 rounded-md ${layout === "compact" ? "bg-[#ededed] dark:bg-gray-700 shadow-sm" : ""}`}
            title="Compact view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loadingMenu ? (
        <>
          {layout === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {layout === "list" && (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {layout === "compact" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
        </>
      ) : filteredItems.length > 0 ? (
        <>
          {layout === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${!item.is_available ? "opacity-70" : ""}`}
                >
                  <div className="relative aspect-square rounded-t-xl overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
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
                        logEvent(analytics, "button_click", {
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
          {layout === "list" && (
            <div className="flex flex-col gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex ${!item.is_available ? "opacity-70" : ""}`}
                >
                  <div className="relative h-32 w-32 rounded-l-xl overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
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
                        onClick={() => {
                          logEvent(analytics, "button_click", {
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
          {layout === "compact" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-[#ededed] dark:bg-[#1a1919] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${!item.is_available ? "opacity-70" : ""}`}
                >
                  <div className="relative aspect-video rounded-t-xl overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
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
                      onClick={() => {
                        logEvent(analytics, "button_click", {
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
        <div className="text-center py-12">
          <Frown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-2">No items found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}
    </div>
  );
};

export default MenuListSection;
