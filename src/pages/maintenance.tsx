

export const Maintenance = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Logo */}
                <h1 className="text-5xl font-extrabold tracking-wide text-slate-800 mb-12">
                    Sosika
                </h1>
                
                {/* Maintenance Icon */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/maintenance.svg"
                        alt="Maintenance"
                        className="w-48 h-48 opacity-80"
                    />
                </div>
                
                {/* Message */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-light text-slate-700">
                        We'll be right back
                    </h2>
                    <p className="text-slate-600 leading-relaxed font-light">
                        We're improving a few things to provide you with top-notch service. 
                        We'll notify you once we're back online.
                    </p>
                </div>
                
                {/* Subtle decorative element */}
                <div className="pt-8">
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-auto"></div>
                </div>
            </div>
        </div>
    );
}