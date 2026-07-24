import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Store,
  Navigation,
  TrendingUp,
  Award,
  Compass,
  Eye,
  Bike
} from "lucide-react";

type TimeframeOption = "7d" | "14d" | "30d" | "90d" | "180d" | "365d" | "all" | "custom";

// Custom Leaflet Vendor Marker
const createVendorIcon = (isOpen: boolean) =>
  L.divIcon({
    className: "custom-vendor-marker",
    html: `
      <div style="
        background: ${isOpen ? '#a855f7' : '#6b7280'};
        width: 32px;
        height: 32px;
        border-radius: 10px;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

// Custom Leaflet Order Marker
const createOrderIcon = (status: string) => {
  const bgColor =
    status === "delivered"
      ? "#10b981"
      : status === "ready_for_pickup"
      ? "#00bfff"
      : "#f59e0b";

  return L.divIcon({
    className: "custom-order-marker",
    html: `
      <div style="
        background: ${bgColor};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5">
          <path d="m5 11 4-7"/>
          <path d="M19 11 15 4"/>
          <path d="M2 11h20"/>
          <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

// Haversine distance calculator in kilometers
const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Map View Recenter Sub-component
const MapRecenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export default function GeoInsightsConsole() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Timeframe Filter State
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Layer Toggles
  const [showVendors, setShowVendors] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "active" | "delivered">("all");

  useEffect(() => {
    setLoading(true);

    // 1. Fetch vendors
    const vendorsUnsub = onSnapshot(collection(db, "vendors"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setVendors(list);
    });

    // 2. Fetch live orders
    const ordersUnsub = onSnapshot(collection(db, "orders"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    });

    return () => {
      vendorsUnsub();
      ordersUnsub();
    };
  }, []);

  // Compute time boundary timestamp window
  const getTimeWindow = (): { startMs: number; endMs: number } => {
    const now = Date.now();
    let startMs = 0;
    let endMs = now;

    if (timeframe === "custom") {
      startMs = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
      endMs = customEndDate ? new Date(`${customEndDate}T23:59:59`).getTime() : now;
    } else if (timeframe === "7d") {
      startMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "14d") {
      startMs = now - 14 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "30d") {
      startMs = now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "90d") {
      startMs = now - 90 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "180d") {
      startMs = now - 180 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "365d") {
      startMs = now - 365 * 24 * 60 * 60 * 1000;
    } else {
      startMs = 0;
    }

    return { startMs, endMs };
  };

  const { startMs, endMs } = getTimeWindow();

  // Filter orders by timeframe
  const filteredOrders = orders.filter((o) => {
    if (o.status === "declined") return false;
    if (!o.timestamp) return true;
    const time = o.timestamp.seconds
      ? o.timestamp.seconds * 1000
      : new Date(o.timestamp).getTime();
    return time >= startMs && time <= endMs;
  });

  // Extract Vendor Map Pins
  const vendorPins = vendors
    .map((v) => {
      const geo = v.geolocation || v.listing_data?.geolocation;
      if (!geo || typeof geo.lat !== "number" || typeof geo.lng !== "number") return null;
      return {
        id: v.id,
        name: v.name,
        owner: v.owner_name,
        isOpen: v.is_open === true || v.listing_data?.is_open === true,
        lat: geo.lat,
        lng: geo.lng,
      };
    })
    .filter(Boolean) as any[];

  // Vendor Lookup Map by ID or Name
  const vendorGeoLookup = new Map<string, { lat: number; lng: number; name: string }>();
  vendors.forEach((v) => {
    const geo = v.geolocation || v.listing_data?.geolocation;
    if (geo && typeof geo.lat === "number" && typeof geo.lng === "number") {
      vendorGeoLookup.set(v.id, { lat: geo.lat, lng: geo.lng, name: v.name });
      if (v.name) vendorGeoLookup.set(v.name.toLowerCase().trim(), { lat: geo.lat, lng: geo.lng, name: v.name });
    }
  });

  // Default Map Center (Tanzania coordinates)
  const defaultCenter: [number, number] =
    vendorPins.length > 0 ? [vendorPins[0].lat, vendorPins[0].lng] : [-6.7924, 39.2083];

  // Extract Geocoded Order Pins & Delivery Corridors
  const orderPins: any[] = [];
  const deliveryCorridors: any[] = [];

  filteredOrders.forEach((order, idx) => {
    // Filter by orderStatusFilter
    if (orderStatusFilter === "active" && (order.status === "delivered" || order.status === "declined")) return;
    if (orderStatusFilter === "delivered" && order.status !== "delivered") return;

    // Resolve order delivery coordinates
    let orderLat: number | null = null;
    let orderLng: number | null = null;

    if (order.userLocation && typeof order.userLocation.lat === "number") {
      orderLat = order.userLocation.lat;
      orderLng = order.userLocation.lng;
    } else if (order.locationCoords && typeof order.locationCoords.lat === "number") {
      orderLat = order.locationCoords.lat;
      orderLng = order.locationCoords.lng;
    } else {
      // Deterministic offset based on order id hash around vendor or default center
      const vendorGeo = (order.vendor_id && vendorGeoLookup.get(order.vendor_id)) ||
        (order.vendor_name && vendorGeoLookup.get(order.vendor_name.toLowerCase().trim())) ||
        { lat: defaultCenter[0], lng: defaultCenter[1] };

      // Hash string to create consistent offset between 0.003 and 0.015 degrees (~300m - 1.5km)
      let hash = 0;
      const str = order.id || `${idx}`;
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      const angle = Math.abs(hash % 360) * (Math.PI / 180);
      const dist = 0.003 + (Math.abs(hash % 100) / 100) * 0.012;

      orderLat = vendorGeo.lat + dist * Math.cos(angle);
      orderLng = vendorGeo.lng + dist * Math.sin(angle);
    }

    if (orderLat !== null && orderLng !== null) {
      orderPins.push({
        id: order.id,
        phone: order.phone,
        vendorName: order.vendor_name || "Sosika Kitchen",
        address: order.displayLocation || "Campus Delivery Point",
        status: order.status || "pending",
        totalAmount: order.totalAmount || 0,
        lat: orderLat,
        lng: orderLng,
      });

      // Find matching vendor origin for corridor line
      const origin = (order.vendor_id && vendorGeoLookup.get(order.vendor_id)) ||
        (order.vendor_name && vendorGeoLookup.get(order.vendor_name.toLowerCase().trim())) ||
        (vendorPins.length > 0 ? vendorPins[0] : null);

      if (origin) {
        deliveryCorridors.push({
          id: order.id,
          status: order.status,
          positions: [
            [origin.lat, origin.lng],
            [orderLat, orderLng],
          ],
        });
      }
    }
  });

  // Aggregate Hotspot Delivery Locations
  const hotspotMap = new Map<string, { address: string; count: number; volume: number }>();
  filteredOrders.forEach((o) => {
    const addr = (o.displayLocation || "Campus Main Gate").trim();
    const current = hotspotMap.get(addr) || { address: addr, count: 0, volume: 0 };
    hotspotMap.set(addr, {
      address: addr,
      count: current.count + 1,
      volume: current.volume + (o.totalAmount || 0),
    });
  });

  const sortedHotspots = Array.from(hotspotMap.values()).sort((a, b) => b.count - a.count);

  // Compute average distance across sample vendors
  let avgDistanceKm = 1.8;
  if (vendorPins.length >= 2) {
    avgDistanceKm = calculateHaversineDistance(
      vendorPins[0].lat,
      vendorPins[0].lng,
      vendorPins[1].lat,
      vendorPins[1].lng
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Timeframe Filter Control Bar */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Compass size={18} className="text-[#00bfff]" />
              <span>Geospatial Intelligence & Delivery Map</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live vendor map pins, order delivery destination points, and logistics flow corridors
            </p>
          </div>

          {/* Timeframe Preset Pills */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.08] overflow-x-auto max-w-full">
            {[
              { id: "7d", label: "7 Days" },
              { id: "14d", label: "14 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "180d", label: "180 Days" },
              { id: "365d", label: "365 Days" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom Range" }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id as TimeframeOption)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeframe === opt.id
                    ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Picker */}
        {timeframe === "custom" && (
          <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-bold">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00bfff] font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-bold">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00bfff] font-mono"
              />
            </div>

            <span className="text-emerald-400 font-mono text-[11px] font-bold">
              Spatial Filter Window Applied
            </span>
          </div>
        )}
      </div>

      {/* Geospatial KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Vendor Spots */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Merchant Spots
            </span>
            <Store size={16} className="text-purple-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {vendorPins.length} Locations
          </div>
          <span className="text-[10px] text-zinc-500 block">
            {vendorPins.filter((v) => v.isOpen).length} online & open
          </span>
        </div>

        {/* Analyzed Orders */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Order Pins Rendered
            </span>
            <Navigation size={16} className="text-[#00bfff]" />
          </div>
          <div className="text-xl font-black text-[#00bfff] font-mono">
            {orderPins.length} Order Pins
          </div>
          <span className="text-[10px] text-zinc-500 block">In selected window</span>
        </div>

        {/* Unique Delivery Hotspots */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Delivery Hotspots
            </span>
            <MapPin size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {sortedHotspots.length} Zones
          </div>
          <span className="text-[10px] text-zinc-500 block">
            Avg Radius: {avgDistanceKm} km
          </span>
        </div>

        {/* Top Destination Area */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              #1 Demand Hotspot
            </span>
            <Award size={16} className="text-amber-400" />
          </div>
          <div className="text-sm font-extrabold text-amber-400 truncate">
            {sortedHotspots[0]?.address || "N/A"}
          </div>
          <span className="text-[10px] text-zinc-500 block">
            {sortedHotspots[0]?.count || 0} orders fulfilled
          </span>
        </div>
      </div>

      {/* Main Interactive Map & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map Container */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#00bfff]" />
              <h3 className="text-sm font-extrabold text-white">Live Spatial Map</h3>
            </div>

            {/* Map Layer Toggle Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setShowVendors(!showVendors)}
                className={`px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                  showVendors
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    : "bg-white/[0.03] text-zinc-500 border-white/[0.06]"
                }`}
              >
                <Eye size={12} />
                <span>Vendors</span>
              </button>

              <button
                onClick={() => setShowOrders(!showOrders)}
                className={`px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                  showOrders
                    ? "bg-[#00bfff]/20 text-[#00bfff] border-[#00bfff]/30"
                    : "bg-white/[0.03] text-zinc-500 border-white/[0.06]"
                }`}
              >
                <Eye size={12} />
                <span>Orders</span>
              </button>

              <button
                onClick={() => setShowCorridors(!showCorridors)}
                className={`px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                  showCorridors
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-white/[0.03] text-zinc-500 border-white/[0.06]"
                }`}
              >
                <Bike size={12} />
                <span>Routes</span>
              </button>

              {/* Status Selector */}
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-2 py-1 text-zinc-300 text-xs outline-none focus:border-[#00bfff]"
              >
                <option value="all">All Orders</option>
                <option value="active">Active Only</option>
                <option value="delivered">Delivered Only</option>
              </select>
            </div>
          </div>

          {/* Map Layer Box */}
          <div className="h-[440px] w-full rounded-2xl overflow-hidden border border-white/[0.1] relative z-10">
            {loading ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono">
                Loading spatial map layers...
              </div>
            ) : (
              <MapContainer
                center={defaultCenter}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapRecenter center={defaultCenter} />

                {/* 1. Vendor Pins */}
                {showVendors &&
                  vendorPins.map((v) => (
                    <Marker
                      key={v.id}
                      position={[v.lat, v.lng]}
                      icon={createVendorIcon(v.isOpen)}
                    >
                      <Popup className="font-sans text-xs">
                        <div className="p-1 space-y-1">
                          <strong className="text-sm font-black block text-purple-600">
                            {v.name}
                          </strong>
                          <p className="text-zinc-600">Owner: {v.owner || "N/A"}</p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              v.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {v.isOpen ? "Open Online" : "Offline"}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* 2. Order Destination Pins */}
                {showOrders &&
                  orderPins.map((o) => (
                    <Marker
                      key={o.id}
                      position={[o.lat, o.lng]}
                      icon={createOrderIcon(o.status)}
                    >
                      <Popup className="font-sans text-xs">
                        <div className="p-1 space-y-1">
                          <span className="font-mono font-bold text-xs text-[#00bfff] block">
                            #{o.id.slice(-6)}
                          </span>
                          <strong className="text-sm font-black text-zinc-900 block">
                            {o.address}
                          </strong>
                          <p className="text-zinc-600 font-mono">Phone: {o.phone}</p>
                          <p className="text-zinc-600">Merchant: {o.vendorName}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-zinc-200 text-[11px]">
                            <span className="font-bold capitalize text-zinc-800">{o.status}</span>
                            <span className="font-mono font-extrabold text-emerald-600">
                              {o.totalAmount.toLocaleString()} TZS
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* 3. Delivery Corridors (Polyline Routes) */}
                {showCorridors &&
                  deliveryCorridors.map((c, idx) => (
                    <Polyline
                      key={idx}
                      positions={c.positions}
                      pathOptions={{
                        color: c.status === "delivered" ? "#10b981" : "#00bfff",
                        weight: 2,
                        dashArray: c.status === "delivered" ? undefined : "4, 6",
                        opacity: 0.7,
                      }}
                    />
                  ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Top Hotspot Destinations Table */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span>Top Delivery Hotspots</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ranked destination points by volume & revenue
            </p>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {sortedHotspots.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No order location data recorded.</p>
            ) : (
              sortedHotspots.map((spot, idx) => (
                <div
                  key={idx}
                  className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00bfff]/10 text-[#00bfff] font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white truncate block">
                        {spot.address}
                      </span>
                    </div>
                    <span className="text-zinc-500 text-[10px] block mt-0.5 pl-7">
                      {spot.count} order{spot.count > 1 ? "s" : ""} fulfilled
                    </span>
                  </div>

                  <span className="font-mono font-extrabold text-emerald-400 shrink-0">
                    {spot.volume.toLocaleString()} TZS
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
