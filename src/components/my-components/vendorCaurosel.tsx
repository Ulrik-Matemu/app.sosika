import React, { useEffect, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "../ui/carousel";

type Vendor = {
  id: number
  name: string
  logo_url: string // assumes your DB has a column for logo
}

const VendorCarousel: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch("https://sosika-backend.onrender.com/api/vendor") // adjust if you need query params or proxy
        const data = await res.json()
        setVendors(data)
      } catch (err) {
        console.error("Error fetching vendors:", err)
      }
    }
    fetchVendors()
  }, [])

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Our Vendors</h2>
      <Carousel className="w-full max-w-lg mx-auto">
        <CarouselContent>
          {vendors.map((vendor) => (
            <CarouselItem
              key={vendor.id}
              className="basis-1/3 flex justify-center"
            >
              <div className="p-2">
                <img
                  src={vendor.logo_url}
                  alt={vendor.name}
                  className="h-20 w-20 object-contain rounded-lg shadow-md"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}

export default VendorCarousel
