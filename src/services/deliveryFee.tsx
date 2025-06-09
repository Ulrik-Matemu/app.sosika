interface GeoLocation {
    lat: number;
    lng: number;
}

interface Location extends GeoLocation {
    name: string;
}

export const getDeliveryFee = async (vendorId: string): Promise<number> => {
    if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser.");
    }

    const getCurrentLocation = (): Promise<Location> => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    resolve({
                        name: "Current Location",
                        lat: latitude,
                        lng: longitude,
                    });
                },
                (_error) => {
                    reject(new Error("Unable to fetch your location."));
                }
            );
        });
    };

    const fetchVendorGeolocation = async (vendorId: string): Promise<GeoLocation> => {
        try {
            const response = await fetch(`https://sosika-backend.onrender.com/api/auth/delivery/${vendorId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch vendor geolocation');
            }
            const data = await response.json();
            localStorage.setItem("vendorGeolocation", JSON.stringify(data.geolocation));
           
            console.log("Vendor geolocation fetched and stored:", data.geolocation);
            return data.geolocation;
        } catch (error) {
            throw new Error("Error fetching vendor geolocation");
        }
    };

    const calculateDistance = async (current: GeoLocation, vendor: GeoLocation): Promise<number> => {
        const MAPBOX_TOKEN = "pk.eyJ1IjoiLS11bHJpa2siLCJhIjoiY203YzV5dHIyMGY3NjJqc2Q5MmpxNm4ycCJ9.TilyKOmKcw2ekL2PY8Xofw";
        const to = `${current.lng},${current.lat}`;
        const vendorLocation = JSON.parse(localStorage.getItem("vendorGeolocation") || "{}");
        console.log("Using vendor geolocation:", vendorLocation);
        const vendorLng = vendorLocation.y || vendor.lng;
        const vendorLat = vendorLocation.x || vendor.lat;
        if (!vendorLng || !vendorLat) {
            throw new Error("Vendor geolocation is not available");
        }
        const from = `${vendorLng},${vendorLat}`;
        console.log(`Calculating distance from ${from} to ${to}`);
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from};${to}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch route');

        const data = await response.json();
        localStorage.setItem("distance", JSON.stringify(data.routes[0].distance / 1000)); // Store distance in kilometers
        const route = data.routes[0];
        if (!route || typeof route.distance !== 'number') {
            throw new Error('No route found');
        }
        // Mapbox returns distance in meters, convert to kilometers
        return route.distance / 1000;
    };

    const calculateDeliveryFee = (distance: number): number => {
        // Round up to the nearest 50 TZS note
        const rawFee = distance * 1000;
        const fee = Math.ceil(rawFee / 50) * 50;
        return fee;
    };

    try {
        const [currentLocation, vendorLocation] = await Promise.all([
            getCurrentLocation(),
            fetchVendorGeolocation(vendorId)
        ]);
        const distance = await calculateDistance(currentLocation, vendorLocation);
        return calculateDeliveryFee(distance);
    } catch (error) {
        console.error('Error calculating delivery fee:', error);
        throw error;
    }
};
