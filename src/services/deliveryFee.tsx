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
                () => reject(new Error("Unable to fetch your location."))
            );
        });
    };

    const fetchVendorGeolocation = async (vendorId: string): Promise<GeoLocation> => {
        try {
            const response = await fetch(
                `https://sosika-backend.onrender.com/api/auth/delivery/${vendorId}`
            );
            if (!response.ok) throw new Error("Failed to fetch vendor geolocation");

            const data = await response.json();

            // Ensure consistent {lat, lng} format
            const geo: GeoLocation = {
                lat: data.geolocation.lat ?? data.geolocation.x,
                lng: data.geolocation.lng ?? data.geolocation.y,
            };

            // Validation: coords must be in proper range
            if (
                geo.lat < -90 || geo.lat > 90 ||
                geo.lng < -180 || geo.lng > 180
            ) {
                throw new Error("Invalid vendor coordinates received");
            }

            localStorage.setItem("vendorGeolocation", JSON.stringify(geo));
            console.log("Vendor geolocation fetched and stored:", geo);
            return geo;
        } catch (error) {
            throw new Error("Error fetching vendor geolocation");
        }
    };

    const calculateDistance = async (
        current: GeoLocation,
        vendor: GeoLocation
    ): Promise<number> => {
        const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

        // Mapbox requires lng,lat
        const from = `${vendor.lng},${vendor.lat}`;
        const to = `${current.lat},${current.lng}`;

        console.log(`Calculating distance from ${from} to ${to}`);

        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from};${to}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch route");

        const data = await response.json();
        const route = data.routes[0];
        if (!route || typeof route.distance !== "number") {
            throw new Error("No route found");
        }

        // Convert meters → kilometers
        const distanceKm = route.distance / 1000;

        
        localStorage.setItem("distance", JSON.stringify(distanceKm));
        return distanceKm;
    };

    const calculateDeliveryFee = (distance: number): number => {
        console.log(`Calculating delivery fee for distance: ${distance} km`);

        const baseFee = 1000; // flat starting fee (TZS)
        const perKm = 300;    // cost per km (TZS)
        const rawFee = baseFee + distance * perKm;

        // Round up to the nearest 50 TZS
        return Math.ceil(rawFee / 50) * 50;
    };

    try {
        const [currentLocation, vendorLocation] = await Promise.all([
            getCurrentLocation(),
            fetchVendorGeolocation(vendorId),
        ]);

        const distance = await calculateDistance(currentLocation, vendorLocation);
        return calculateDeliveryFee(distance);
    } catch (error) {
        console.error("Error calculating delivery fee:", error);
        throw error;
    }
};
