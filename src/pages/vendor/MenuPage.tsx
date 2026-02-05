import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Search, ShoppingBag } from "lucide-react";
import { fetchVendorMenu } from "../mood/api/mood-api";
import { Vendor, MenuItem, Review } from "../mood/types/types";
import { useCartContext } from "../../context/cartContext";
import { getReviews, addReview } from "../../services/reviews-api";
import Navbar from "../../components/my-components/navbar";
import StarRating from "../../components/my-components/StarRating";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Helmet } from "react-helmet-async";

// --- Sub-Components ---

const MenuItemRow = ({ item }: { item: MenuItem }) => {
  const { addToCart } = useCartContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start justify-between py-4 border-b border-zinc-800 last:border-b-0"
    >
      <div className="flex-1 pr-4">
        <h4 className="font-semibold text-white text-md">{item.name}</h4>
        <p className="text-zinc-400 text-sm mt-1">{item.description}</p>
        <p className="text-[#00bfff] font-bold text-md mt-2">
          {Number(item.price).toLocaleString()} TZS
        </p>
        {item.ratingCount ? (
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={item.averageRating || 0} readOnly size={16} />
            <span className="text-xs text-zinc-500">({item.ratingCount})</span>
          </div>
        ) : null}
      </div>
      <button
        onClick={() => addToCart({ ...item, quantity: 1 } as any)}
        className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <ShoppingBag className="w-5 h-5 text-[#00bfff]" />
      </button>
    </motion.div>
  );
};

const CategorySection = ({
  category,
  items,
  refProp,
}: {
  category: string;
  items: MenuItem[];
  refProp: React.RefObject<HTMLDivElement | null>;
}) => (
  <div ref={refProp} className="pt-20 -mt-20">
    <h3 className="text-2xl font-bold text-white capitalize mb-2 sticky top-40 bg-zinc-900 py-2 z-10">
      {category}
    </h3>
    <div className="divide-y divide-zinc-800">
      {items.map((item) => (
        <MenuItemRow key={item.id} item={item} />
      ))}
    </div>
  </div>
);

const ReviewsSection = ({ vendorId }: { vendorId: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    const fetchedReviews = await getReviews(vendorId, "vendor");
    setReviews(fetchedReviews.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [vendorId]);

  const handleSubmitReview = async () => {
    if (!vendorId || newRating === 0 || !newReviewText) return;
    
    setIsSubmitting(true);
    try {
      const reviewData: Omit<Review, "id" | "createdAt"> = {
        targetId: vendorId,
        targetType: "vendor",
        rating: newRating,
        reviewText: newReviewText,
        userName: newUserName || "Anonymous",
      };

      await addReview(reviewData);
      
      setNewRating(0);
      setNewReviewText("");
      setNewUserName("");
      await fetchReviews(); // Refresh reviews
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-4 border border-zinc-800 rounded-lg">
        <h3 className="font-bold text-lg mb-3">Leave a Review</h3>
        <div className="space-y-4">
          <StarRating rating={newRating} onRatingChange={setNewRating} size={24} />
          <Input
            type="text"
            placeholder="Your name (optional)"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
          <Textarea
            value={newReviewText}
            onChange={(e) => setNewReviewText(e.target.value)}
            placeholder="Share your experience..."
            className="bg-zinc-800 border-zinc-700"
          />
          <Button onClick={handleSubmitReview} disabled={isSubmitting || !newReviewText || newRating === 0}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
          </Button>
        </div>
      </div>

      <h3 className="font-bold text-xl">All Reviews</h3>
      {loading ? (
        <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00bfff]" /></div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{review.userName || 'Anonymous'}</span>
                <StarRating rating={review.rating} readOnly size={16} />
              </div>
              <p className="text-zinc-300">{review.reviewText}</p>
              <p className="text-xs text-zinc-500 mt-3 text-right">{new Date(review.createdAt?.toDate()).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 text-center py-8">No reviews yet. Be the first!</p>
      )}
    </div>
  );
};


// --- Main Menu Page ---

const VendorMenuPage = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews'>('menu');

  const categoryRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!vendorId) return;
      setLoading(true);
      try {
        const { vendor, menuItems } = await fetchVendorMenu(vendorId);
        setVendor(vendor);
        setMenuItems(menuItems);
      } catch (error) {
        console.error("Failed to fetch vendor menu:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [vendorId]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [menuItems, searchTerm]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredItems.forEach((item) => {
      const category = item.category || "other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    Object.keys(groups).forEach(cat => {
        if (!categoryRefs.current[cat]) categoryRefs.current[cat] = React.createRef<HTMLDivElement>();
    });
    return groups;
  }, [filteredItems]);

  const categories = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    categoryRefs.current[category]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0]);
  }, [categories, activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
        <Loader2 className="w-12 h-12 text-[#00bfff] animate-spin" />
      </div>
    );
  }

  if (!vendor || !vendorId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
        <p className="text-zinc-400">Vendor not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <Helmet>
        <title>{vendor.name} Menu | Sosika</title>
        <meta name="description" content={`Explore the menu of ${vendor.name} on Sosika. Browse delicious dishes, read reviews, and place your order today!`} />
        <meta property="og:title" content={`Order from ${vendor.name}`} />
        <meta property="og:description" content={`Explore the menu of ${vendor.name} on Sosika. Browse delicious dishes, read reviews, and place your order today!`} />
        <meta property="og:image" content='https://sosika.app/sosika-vendor-whatsapp-link.png' />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-zinc-800">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{vendor.name}</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <StarRating rating={vendor.averageRating || 0} readOnly size={16} />
                <span>({vendor.ratingCount || 0} reviews)</span>
              </div>
            </div>
          </div>
          {activeTab === 'menu' && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border-zinc-700 pl-10 !ring-offset-0"
              />
            </div>
          )}
        </div>
        <div className="max-w-4xl mx-auto px-4 flex border-b border-zinc-800">
            <TabButton label="Menu" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
            <TabButton label="Reviews" active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} />
        </div>
      </div>

      {/* Category Filters - only for Menu tab */}
      {activeTab === 'menu' && (
        <div className="sticky top-[158px] z-20 bg-zinc-900/95 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 border-b border-zinc-800/50">
                {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => scrollToCategory(category)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === category ? "bg-[#00bfff] text-black" : "bg-zinc-800 text-zinc-300"
                    }`}
                >
                    <span className="capitalize">{category}</span>
                </button>
                ))}
            </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 mb-20">
        {activeTab === 'menu' ? (
          categories.length > 0 ? (
            <div className="space-y-12">
            {categories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                items={groupedItems[category]}
                refProp={categoryRefs.current[category]}
              />
            ))}
            </div>
          ) : (
            <div className="text-center py-16"><p className="text-zinc-500">No menu items found.</p></div>
          )
        ) : (
          <ReviewsSection vendorId={vendorId} />
        )}
      </main>

      <Navbar />
    </div>
  );
};

const TabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`px-4 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-white border-b-2 border-[#00bfff]' : 'text-zinc-400 hover:text-white'}`}>
        {label}
    </button>
)

export default VendorMenuPage;
