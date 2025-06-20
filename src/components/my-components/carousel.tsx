import Autoplay from "embla-carousel-autoplay"
import { Card, CardContent } from "../ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "../ui/carousel";
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const specialOffers = [
    {
        image: "/slide1.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "#"
    },
    {
        image: "/s-snacks.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "#"
    },
    {
        image: "/3.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "https://ulrik-matemu.github.io/sosika-delivery/"
    },
    {
        image: "/icons/4.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "https://sosikavendor.netlify.app"
    },
]

// Skeleton component for loading state
const ImageSkeleton = () => (
    <div className="w-full h-48 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
        </div>
    </div>
);

export const CarouselPlugin = () => {
    const [loadedImages, setLoadedImages] = useState(new Set());
    const [failedImages, setFailedImages] = useState(new Set());
    
    const plugin = React.useRef(
        Autoplay({ delay: 4000, stopOnInteraction: false })
    )

    const handleImageLoad = (index: any) => {
        setLoadedImages(prev => new Set([...prev, index]));
    };

    const handleImageError = (index: any) => {
        setFailedImages(prev => new Set([...prev, index]));
    };

    return (
        <Carousel
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            opts={{
                align: "start",
                loop: true
            }}
        >
            <CarouselContent>
                {specialOffers.map((item, index) => (
                    <CarouselItem key={index}>
                        <div className="p-2">
                            <Card>
                                <CardContent className="p-0">
                                    <Link to={item.link}>
                                        <div className="relative">
                                            {/* Show skeleton while image is loading */}
                                            {!loadedImages.has(index) && !failedImages.has(index) && (
                                                <ImageSkeleton />
                                            )}
                                            
                                            {/* Show error state if image failed to load */}
                                            {failedImages.has(index) && (
                                                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <div className="text-center text-gray-500">
                                                        <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        <p className="text-sm">Failed to load image</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Actual image */}
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                loading="lazy"
                                                className={`w-full object-cover rounded-lg transition-opacity duration-300 ${
                                                    loadedImages.has(index) ? 'opacity-100' : 'opacity-0 absolute inset-0'
                                                }`}
                                                onLoad={() => handleImageLoad(index)}
                                                onError={() => handleImageError(index)}
                                            />
                                        </div>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    )
}