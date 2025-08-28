export const Maintenance = () => {
    return (
        
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
            <img
            src="/maintenance.svg"
            alt="Maintenance"
            className="w-40 h-40 sm:w-64 sm:h-64 mb-4"
            style={{ maxWidth: '100%', height: 'auto' }}
            />
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-4 text-center">
            Maintenance Mode
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mb-8 text-center">
            We improving a few things to provide you with top-notch service.
            </p>
        </div>
    );
}