import React from "react"
import { Card, CardContent } from "../components/ui/card"
import Autoplay from "embla-carousel-autoplay"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "../components/ui/carousel"


export default function Waitlist() {
    const plugin = React.useRef(
        Autoplay({ delay: 2000, stopOnInteraction: true })
    )
    return (
        <div
            className="h-screen w-full overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollBehavior: "smooth" }}
        >
            {/* Panel 1 */}
            <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-[#00bfff] px-4 py-10 snap-start">
                <header className="w-full flex justify-center absolute z-0 top-0 mt-8">
                    <div className="max-w-3xl text-center">
                        <h1 className="text-4xl font-extrabold text-red-500">
                            <span className="text-7xl text-[#00bfff] sosika">Sosika</span><br />Business
                        </h1>
                    </div>
                </header>
                <p className="mt-32 z-10 md:mx-16 text-3xl text-white text-center">
                    Since we launched, we've aimed at bringing more customers to vendors
                    — restaurants, stores, and solo entrepreneurs.
                </p>
                <div className="scroll-down text-white mt-20">
                    Scroll down
                </div>
            </section>
            {/* Panel 2 */}
            <section className="min-h-screen flex flex-col items-center bg-[#00bfff] px-4 snap-start" id="testimonials">
                <h2 className="text-5xl z-10 text-center font-extrabold text-white mt-36 mb-6">Growth Accelerated</h2>
                <p className="text-xl z-10 text-black mb-4 text-center">
                    We've helped businesses raise up to <span className="font-bold">Tsh100,000</span> in weekly sales and we plan to do more but we can only do that with your help.
                </p>
                <Carousel
                    plugins={[plugin.current]}
                    className="w-full max-w-xs"
                    onMouseEnter={plugin.current.stop}
                    onMouseLeave={plugin.current.reset}
                >
                    <CarouselContent>
                        {[
                            {
                                name: "Asha, Restaurant Owner",
                                testimonial: "Sosika helped me reach more customers than ever before. My weekly sales have doubled!",
                            },
                            {
                                name: "John, Boutique Vendor",
                                testimonial: "The platform is easy to use and has brought in new clients every week.",
                            },
                            {
                                name: "Fatma, Food Vendor",
                                testimonial: "I love how Sosika supports small businesses. My business is growing fast!",
                            },
                            {
                                name: "Peter, Solo Entrepreneur",
                                testimonial: "Joining Sosika was the best decision for my side hustle. Highly recommended!",
                            },
                            {
                                name: "Maria, Store Owner",
                                testimonial: "The exposure and support from Sosika have been amazing for my shop.",
                            },
                        ].map((item, index) => (
                            <CarouselItem key={index}>
                                <div className="w-full p-6">
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center p-6">
                                            <span className="text-lg text-gray-200 italic text-center mb-4">"{item.testimonial}"</span>
                                            <span className="text-base font-semibold text-[#00bfff]">{item.name}</span>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
                {/* Add your form or content here */}
            </section>
            <section className="min-h-screen flex flex-col  items-center bg-black px-4 snap-start" id="waitlist">
                <h2 className="text-3xl text-center font-extrabold text-white mt-36 mb-6">Join Us and Our Community</h2>
                <p className="text-xl text-center text-white mb-4">
                    Get notified when we launch our official rollout and be part of our growing community of vendors.
                </p>
                {/* Add your form or content here */}
                <form className="mt-8">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        className="p-2 rounded-l-md"
                    />
                    <button className="bg-[#00bfff] text-white p-2 rounded-r-md">
                        Join Waitlist
                    </button>
                </form>
                <p className="text-xl text-center text-gray-500 mt-16 mb-4">
                    To help us boost your sales, please reach out to us via our socials.
                </p>
                <div className="flex gap-4 mt-4">
                    <div className="bg-white p-4 rounded-full flex items-center justify-center gap-4">
                        <img width="40" height="40" src="/icons/whatsapp.png" alt="whatsapp--v2" />
                    </div>
                    <div className="bg-white p-4 rounded-full flex items-center justify-center gap-4">
                        <img width="40" height="40" src="/icons/instagram.png" alt="whatsapp--v2" />
                    </div>
                </div>
            </section>
            <footer className="relative bottom-0 w-full">
                <div className="bg-black text-white p-6 text-center">
                    <p className="text-sm">© 2023 Sosika. All rights reserved.</p>
                </div>
            </footer>
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
