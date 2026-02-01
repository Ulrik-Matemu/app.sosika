import { useEffect, useState,  useMemo } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, ChevronLeft, Loader2, ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMood } from "../../hooks/useMood";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { fetchMoodResults } from "./api/mood-api";
import { Vendor, MenuItem, SectionProps } from "../mood/types/types";
import { useCartContext } from "../../context/cartContext";
import Navbar from "../../components/my-components/navbar";

// --- Helpers ---

const isIconImage = (url: string) => url?.includes('/icons/menu/');

// --- Sub-Components ---

const LazyImage = ({ src, alt, className }: { src: string; alt: string; className: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative ${className} overflow-hidden`}>
      {isLoading && <div className="absolute inset-0 bg-zinc-700 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          e.currentTarget.src = `https://via.placeholder.com/400x300/27272a/71717a?text=${encodeURIComponent(alt)}`;
          setIsLoading(false);
        }}
      />
    </div>
  );
};

const MenuItemCard = ({ item, vendor }: { item: MenuItem; vendor?: Vendor }) => {
  const { addToCart } = useCartContext();
  const isIcon = isIconImage(item.image_url);

  const handleAddToCart = () => {
    if (item.id && item.price !== undefined) {
      addToCart({ ...item, quantity: 1 } as any);
    }
  };

  // --- ELEGANT HORIZONTAL ICON CARD ---
  if (isIcon) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="flex-shrink-0 w-[280px] h-[90px] flex items-center gap-3 bg-zinc-800/30 border border-zinc-800/50 p-2.5 rounded-2xl group relative"
      >
        <div className="w-16 h-full rounded-xl bg-zinc-900/60 flex items-center justify-center p-2.5 border border-zinc-700/30 flex-shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain filter drop-shadow-md" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
          <div className="pr-2">
            <h3 className="font-bold text-zinc-100 text-[12px] truncate leading-tight">{item.name}</h3>
            <p className="text-zinc-500 text-[9px] line-clamp-1 italic">{item.description || "Freshly made"}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#00bfff] text-[11px] font-black">{Number(item.price).toLocaleString()}</span>
            <button onClick={handleAddToCart} className="p-1 rounded-lg bg-zinc-800 text-[#00bfff] border border-zinc-700/50 hover:bg-[#00bfff] hover:text-black transition-all">
              <ShoppingBag className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- ELEGANT GRID PHOTO CARD ---
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="flex-shrink-0 w-[260px] bg-zinc-800/40 border border-zinc-800/50 backdrop-blur rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="relative h-44 bg-zinc-900">
        <LazyImage src={item.image_url} alt={item.name} className="w-full h-full" />
        <div className="absolute top-3 left-3">
          <span className="bg-black/70 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-lg font-bold border border-white/10">
            {Number(item.price).toLocaleString()} TZS
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-white text-sm mb-1 truncate">{item.name}</h3>
        <p className="text-zinc-500 text-[11px] line-clamp-2 mb-4 h-8 leading-relaxed">{item.description}</p>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 opacity-70">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-white uppercase">{vendor?.name[0]}</div>
            <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[80px]">{vendor?.name}</span>
          </div>
          <button onClick={handleAddToCart} className="px-4 py-2 rounded-xl bg-[#00bfff] text-black text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all">
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- Updated Smart Section with Isolated Scrolling ---

const Section = ({ title, subtitle, icon, items, vendors, accentColor }: SectionProps) => {
  const photoItems = items.filter((i: any) => !isIconImage(i.image_url));
  const iconItems = items.filter((i: any) => isIconImage(i.image_url));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-zinc-800 rounded-lg ${accentColor}`}>{icon}</div>
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-xs font-medium text-zinc-500">{subtitle}</p>}
        </div>
      </div>

      {/* Row 1: High-Quality Photo Cards */}
      {photoItems.length > 0 && (
        <div className="flex flex-row gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 px-1">
          {photoItems.map((item: any) => (
            <MenuItemCard key={item.id} item={item} vendor={vendors?.find((v: any) => v.id === item.vendor_id)} />
          ))}
        </div>
      )}

      {/* Row 2: Elegant Icon Horizontal List */}
      {iconItems.length > 0 && (
        <div className="space-y-3">
          {photoItems.length > 0 && (
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold px-1">More from the menu</p>
          )}
          <div className="flex flex-row gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-1">
            {iconItems.map((item: any) => (
              <MenuItemCard key={item.id} item={item} vendor={vendors?.find((v: any) => v.id === item.vendor_id)} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// --- Main Results Page ---

const ResultsPage = () => {
  const navigate = useNavigate();
  const { mood } = useMood();
  const { locations } = useLocationStorage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVendorId, setActiveVendorId] = useState<string | "all">("all");

  const location = locations[0] || { lat: -3.37, lng: 36.70 };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchMoodResults({ mood: mood || "any", location: { lat: location.lat, lng: location.lng } });
        setVendors(data.vendors);
        setItems(data.menuItems);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadData();
  }, [mood, location.lat, location.lng]);

  const scrollToSection = (id: string) => {
    setActiveVendorId(id);
    if (id === "all") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const element = document.getElementById(`vendor-section-${id}`);
    if (element) {
      window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - 210, behavior: "smooth" });
    }
  };

  const groupedItemsByVendor = useMemo(() => {
    return vendors.map(v => ({ 
      vendor: v, 
      items: items.filter(i => i.vendor_id === v.id) 
    })).filter(g => g.items.length > 0);
  }, [items, vendors]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
      <Loader2 className="w-12 h-12 text-[#00bfff] animate-spin mb-4" />
      <p className="text-zinc-400 font-medium tracking-wide italic">Curating your {mood} experience...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-900 pb-24 text-zinc-100">
      <div className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors">
              <ChevronLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-black text-[#00bfff]">Sosika</h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Mood: {mood || "Discovery"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
            <FilterButton label="All" active={activeVendorId === "all"} onClick={() => scrollToSection("all")} />
            {vendors.map(v => <FilterButton key={v.id} label={v.name} active={activeVendorId === v.id.toString()} onClick={() => scrollToSection(v.id.toString())} />)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">
        {groupedItemsByVendor.map(({ vendor, items: vItems }) => (
          <div key={vendor.id} id={`vendor-section-${vendor.id}`}>
            <Section 
              title={vendor.name} 
              subtitle={vendor.is_open ? "Available Now" : "Currently Closed"} 
              icon={<MapPin className="w-5 h-5" />} 
              items={vItems} 
              vendors={vendors} 
              accentColor={vendor.is_open ? "text-green-400" : "text-zinc-600"} 
            />
          </div>
        ))}
      </div>
      <Navbar />
    </div>
  );
};

const FilterButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${active ? "bg-[#00bfff] text-black shadow-lg shadow-blue-500/20" : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800"}`}>
    {label}
  </button>
);

export default ResultsPage;