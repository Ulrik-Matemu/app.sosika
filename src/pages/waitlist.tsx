export default function Waitlist() {
    return (
        <div
            className="h-screen w-full overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollBehavior: "smooth" }}
        >
            {/* Panel 1 */}
            <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-[#00bfff] px-4 py-10 snap-start">
                <header className="w-full flex justify-center absolute top-0 mt-8">
                    <div className="max-w-3xl text-center">
                        <h1 className="text-4xl font-extrabold text-red-500">
                            <span className="text-7xl text-[#00bfff]">Sosika</span><br />For Businesses
                        </h1>
                    </div>
                </header>
                <p className="mt-32 md:mx-16 text-3xl text-white text-center">
                    Since we launched, we've aimed at bringing more customers to vendors
                    — restaurants, stores, and solo entrepreneurs.
                </p>
                <div className="scroll-down text-white mt-20">
                    Scroll down
                </div>
            </section>
            {/* Panel 2 */}
            <section className="min-h-screen flex flex-col items-center justify-center bg-[#00bfff] px-4 py-10 snap-start">
                <h1 className="relative max-[320px]:-top-44 max-[360px]:-top-56 max-[380px]:-top-48 max-[400px]:-top-72 max-[460px]:-top-80 md:-top-44 text-6xl font-extrabold">Growth</h1>
                <h2 className="text-4xl font-bold text-white mb-6">Join the Waitlist</h2>
                <p className="text-xl text-white mb-4">
                    Be the first to know when we launch new features for businesses!
                </p>
                {/* Add your form or content here */}
            </section>
            <style>
                {`
                    .scroll-down {
                        animation: scrollDown 2s infinite;
                    }
                    @keyframes scrollDown {
                        0% { transform: translateY(0); }
                        50% { transform: translateY(10px); }
                        100% { transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
}
