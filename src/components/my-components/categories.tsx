import  { useState } from 'react'; // Correct position for import

// Assuming 'categories' is defined elsewhere, e.g.:
// const categories = [
//     { label: 'Food', value: 'food', icon: 'https://via.placeholder.com/40/FF5733/FFFFFF?text=F' },
//     { label: 'Drinks', value: 'drinks', icon: 'https://via.placeholder.com/40/33FF57/FFFFFF?text=D' },
//     { label: 'Shopping', value: 'shopping', icon: 'https://via.placeholder.com/40/3357FF/FFFFFF?text=S' },
//     { label: 'Travel', value: 'travel', icon: 'https://via.placeholder.com/40/FF33E9/FFFFFF?text=T' },
//     { label: 'Work', value: 'work', icon: 'https://via.placeholder.com/40/33FFE9/FFFFFF?text=W' },
// ];

type Category = {
    label: string;
    value: string;
    icon: string;
};

type CategoryButtonsProps = {
    categories: Category[];
    selectedCategory: string;
    setSelectedCategory: (value: string) => void;
};

function CategoryButtons({ categories, selectedCategory, setSelectedCategory }: CategoryButtonsProps) {
    // We'll manage loading state locally for each icon
    const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});

    const handleImageLoad = (value: string) => { // Changed 'any' to 'string' for type safety
        setImageLoadingStates(prev => ({ ...prev, [value]: false }));
    };

    const handleImageError = (value: string) => { // Changed 'any' to 'string' for type safety
        // Optionally handle image loading errors, e.g., display a broken image icon
        setImageLoadingStates(prev => ({ ...prev, [value]: false }));
    };

    return (
        <div>
            <div className="flex gap-4 overflow-x-auto py-4 px-2 relative group">
                {categories.map(({ label, value, icon }) => {
                    const isSelected = selectedCategory === value;
                    const isLoading = imageLoadingStates[value] === undefined ? true : imageLoadingStates[value]; // Default to true if not set

                    return (
                        <button
                            key={value}
                            onClick={() => setSelectedCategory(value)}
                            className={`
                                flex flex-col items-center justify-center
                                p-3 border rounded-xl w-20 h-20
                                transition-all duration-200 ease-in-out
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                dark:text-gray-200
                                shadow-sm // Added shadow here
                                ${isSelected
                                    ? "bg-blue-500 text-white shadow-md border-blue-400 dark:bg-blue-600"
                                    : "bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-gray-700 dark:border-gray-700 hover:dark:bg-gray-600/50"
                                }
                            `}
                            aria-pressed={isSelected}
                        >
                            {isLoading ? (
                                // Skeleton UI
                                <div
                                    className={`
                                        w-7 h-7 mb-2 rounded-full
                                        ${isSelected ? "bg-blue-400" : "bg-gray-300 dark:bg-gray-600"}
                                        animate-pulse
                                    `}
                                ></div>
                            ) : (
                                // Actual Icon
                                <img
                                    src={icon}
                                    alt={label}
                                    onLoad={() => handleImageLoad(value)}
                                    onError={() => handleImageError(value)}
                                    className={`
                                        w-7 h-7 mb-2
                                        transition-transform duration-150
                                        ${isSelected ? "scale-110" : "group-hover:scale-105"}
                                    `}
                                />
                            )}
                            {/* Removed the span for label to make it icon-only */}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default CategoryButtons;