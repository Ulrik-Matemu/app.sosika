import React, { useEffect, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "../ui/carousel"
import { Link } from "react-router-dom"

type Vendor = {
  id: number
  name: string
  logo_url: string
}

const VendorCarousel: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch(
          "https://sosika-backend.onrender.com/api/vendor"
        )
        const data = await res.json()
        setVendors(data)
      } catch (err) {
        console.error("Error fetching vendors:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchVendors()
  }, [])

  // Skeleton placeholders
  const skeletonItems = Array.from({ length: 6 }).map((_, idx) => (
    <CarouselItem key={idx} className="basis-1/3 flex justify-center">
      <div className="p-2">
        <div className="h-20 w-20 rounded-lg bg-gray-300 animate-pulse"></div>
      </div>
    </CarouselItem>
  ))

  return (
    <div className="w-full px-4">
      <Carousel className="w-full max-w-lg mx-auto">
        <CarouselContent>
          {loading
            ? skeletonItems
            : vendors.map((vendor) => (
                <CarouselItem
                  key={vendor.id}
                  className="basis-1/3 flex justify-center"
                >
                  <div className="p-2">
                    <Link to={`/vendor/${vendor.id}`}>
                      <img
                        src={vendor.logo_url}
                        alt={vendor.name}
                        className="h-20 w-20 object-contain rounded-lg shadow-md"
                      />
                    </Link>
                  </div>
                </CarouselItem>
              ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}

export default VendorCarousel
