import Autoplay from "embla-carousel-autoplay"
import { Card, CardContent } from "../ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "../ui/carousel";
import React from 'react';
import { Link } from 'react-router-dom';


const specialOffers = [
    {
        image: "/icons/1.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "#"
    },
    {
        image: "/icons/2.png",
        title: "Buy 1 Get 1 Free!",
        description: "Available this weekend only.",
        link: "#"
    },
    {
        image: "/icons/3.png",
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

export const CarouselPlugin = () => {
    const plugin = React.useRef(
        Autoplay({ delay: 4000, stopOnInteraction: false })
    )

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
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            loading="lazy"
                                            className="w-full  object-cover rounded-lg"
                                        />
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