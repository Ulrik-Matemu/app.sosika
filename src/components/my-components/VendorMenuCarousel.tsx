// import * as React from "react";
// import { Vendor, MenuItem } from "../../pages/mood/types/types";
// import {
//   Carousel,
//   CarouselContent,
//   CarouselItem,
//   CarouselNext,
//   CarouselPrevious,
//   type CarouselApi,
// } from "../ui/carousel";
// import MenuItemCard from "./MenuItemCard";
// import { useCart } from "../../hooks/useCart";
// import { useToast } from "../../hooks/use-toast";

// interface VendorMenuCarouselProps {
//   vendor: Vendor;
//   items: MenuItem[];
// }

// const VendorMenuCarousel = ({  items }: VendorMenuCarouselProps) => {
//   const [api, setApi] = React.useState<CarouselApi>();
//   const { addToCart } = useCart();
//   const { toast } = useToast();

//   const handleAddToCart = (item: MenuItem) => {
//     addToCart(item);
//     toast({
//       title: "Added to Cart",
//       description: `${item.name} has been added to your cart.`,
//     });
//   };

//   React.useEffect(() => {
//     if (!api) {
//       return;
//     }

//     const TWEEN_FACTOR = 2.2;

//     const tweenOpacity = (api: CarouselApi) => {
//       const engine = api.internalEngine();
//       const scrollSnapList = engine.scrollSnapList;

//       api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
//         let alpha = 1;
//         const target = scrollSnapList[snapIndex];
//         const diffToTarget = scrollSnap - api.scrollProgress();

//         if (engine.options.loop) {
//             engine.slideLooper.loopPoints.forEach((loopItem) => {
//                 const target = loopItem.target();
//                 if (snapIndex === loopItem.index && target !== 0) {
//                     const sign = Math.sign(target);
//                     if (sign === -1) alpha = 1 - Math.abs(diffToTarget);
//                     if (sign === 1) alpha = 1 + Math.abs(diffToTarget);
//                 }
//             });
//         } else {
//             alpha = 1 - Math.abs(diffToTarget);
//         }
        
//         const tweenValue = 1 - Math.abs(diffToTarget) * TWEEN_FACTOR;
//         const opacity = Math.max(0, Math.min(1, tweenValue)).toString();
//         api.slideNodes()[snapIndex].style.opacity = opacity;
//       });
//     };

//     api.on("scroll", () => {
//       tweenOpacity(api);
//     });
//     api.on("reInit", () => tweenOpacity(api));
    
//     // Set initial opacity
//     tweenOpacity(api);

//   }, [api]);

//   return (
//     <div className="relative w-full max-w-lg mx-auto">
//         <Carousel 
//             setApi={setApi}
//             opts={{
//                 align: "start",
//                 loop: items.length > 4, // Loop only if there are enough items to make it worthwhile
//             }}
//             className="w-full"
//         >
//             <CarouselContent className="-ml-2">
//             {items.map((item, index) => (
//                 <CarouselItem key={index} className="basis-auto pl-2">
//                     <MenuItemCard item={item} onAddToCart={handleAddToCart} />
//                 </CarouselItem>
//             ))}
//             </CarouselContent>
//             <CarouselPrevious className="hidden sm:flex" />
//             <CarouselNext className="hidden sm:flex" />
//         </Carousel>
//         <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-900 to-transparent pointer-events-none z-10" />
//         <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-900 to-transparent pointer-events-none z-10" />
//     </div>
//   );
// };

// export default VendorMenuCarousel;
