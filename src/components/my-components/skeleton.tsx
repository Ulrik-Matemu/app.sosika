import { useState } from "react";

export const SkeletonCard = () => {
    return (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse">
            <div className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-t-xl"></div>
            <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
        </div>
    )
};

export const SkeletonCard2 = () => {
    const [layout] = useState(() => {
        return localStorage.getItem("layout") || "compact";
    });

    return (
        <>
            {layout === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            )}
            {layout === 'list' && (
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            )}
            {layout === 'compact' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            )}
        </>
    );
}
