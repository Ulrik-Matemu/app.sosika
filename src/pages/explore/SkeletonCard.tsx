

 const SkeletonCard = () => (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse">
            <div className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-t-xl"></div>
            <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
        </div>
    );

export default SkeletonCard;
