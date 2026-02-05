import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Search, ShoppingBag, X } from "lucide-react";
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

const MenuItemRow = React.memo(({ item }: { item: MenuItem }) => {
  const { addToCart } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = useCallback(async () => {
    setIsAdding(true);
    addToCart({ ...item, quantity: 1 } as any);
    // Quick visual feedback
    setTimeout(() => setIsAdding(false), 600);
  }, [item, addToCart]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start justify-between py-4 border-b border-zinc-800 last:border-b-0 gap-3"
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white text-base leading-snug">{item.name}</h4>
        {item.description && (
          <p className="text-zinc-400 text-sm mt-1.5 line-clamp-2">{item.description}</p>
        )}
        <p className="text-[#00bfff] font-bold text-base mt-2">
          {Number(item.price).toLocaleString()} TZS
        </p>
        {item.ratingCount ? (
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={item.averageRating || 0} readOnly size={14} />
            <span className="text-xs text-zinc-500">({item.ratingCount})</span>
          </div>
        ) : null}
      </div>
      <button
        onClick={handleAddToCart}
        disabled={isAdding}
        className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50"
        aria-label={`Add ${item.name} to cart`}
      >
        <motion.div
          animate={isAdding ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <ShoppingBag className="w-5 h-5 text-[#00bfff]" />
        </motion.div>
      </button>
    </motion.div>
  );
});

MenuItemRow.displayName = "MenuItemRow";

const CategorySection = React.memo(({
  category,
  items,
  refProp,
}: {
  category: string;
  items: MenuItem[];
  refProp: React.RefObject<HTMLDivElement | null>;
}) => (
  <div ref={refProp} className="scroll-mt-52">
    <h3 className="text-xl font-bold text-white capitalize mb-4 sticky top-36 bg-zinc-900/95 backdrop-blur-sm py-3 z-10 -mx-4 px-4">
      {category}
    </h3>
    <div className="space-y-0">
      {items.map((item) => (
        <MenuItemRow key={item.id} item={item} />
      ))}
    </div>
  </div>
));

CategorySection.displayName = "CategorySection";

const ReviewsSection = React.memo(({ vendorId }: { vendorId: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedReviews = await getReviews(vendorId, "vendor");
      setReviews(fetchedReviews.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = useCallback(async () => {
    if (!vendorId || newRating === 0 || !newReviewText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const reviewData: Omit<Review, "id" | "createdAt"> = {
        targetId: vendorId,
        targetType: "vendor",
        rating: newRating,
        reviewText: newReviewText.trim(),
        userName: newUserName.trim() || "Anonymous",
      };

      await addReview(reviewData);
      
      setNewRating(0);
      setNewReviewText("");
      setNewUserName("");
      await fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [vendorId, newRating, newReviewText, newUserName, fetchReviews]);

  const canSubmit = newRating > 0 && newReviewText.trim().length > 0;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 border border-zinc-800 rounded-xl bg-zinc-800/30"
      >
        <h3 className="font-bold text-lg mb-4">Leave a Review</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Your Rating</label>
            <StarRating rating={newRating} onRatingChange={setNewRating} size={28} />
          </div>
          <Input
            type="text"
            placeholder="Your name (optional)"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            maxLength={50}
            className="bg-zinc-800 border-zinc-700 focus:border-[#00bfff] transition-colors"
          />
          <Textarea
            value={newReviewText}
            onChange={(e) => setNewReviewText(e.target.value)}
            placeholder="Share your experience..."
            maxLength={500}
            rows={4}
            className="bg-zinc-800 border-zinc-700 focus:border-[#00bfff] transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">{newReviewText.length}/500</span>
            <Button 
              onClick={handleSubmitReview} 
              disabled={isSubmitting || !canSubmit}
              className="bg-[#00bfff] hover:bg-[#00a6e0] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      <div>
        <h3 className="font-bold text-xl mb-4">All Reviews ({reviews.length})</h3>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#00bfff]" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{review.userName || 'Anonymous'}</span>
                    <StarRating rating={review.rating} readOnly size={14} />
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{review.reviewText}</p>
                  <p className="text-xs text-zinc-500 mt-3">
                    {new Date(review.createdAt?.toDate()).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <p className="text-zinc-500 text-lg">No reviews yet</p>
            <p className="text-zinc-600 text-sm mt-1">Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  );
});

ReviewsSection.displayName = "ReviewsSection";

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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const categoryRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Optimized scroll handler with requestAnimationFrame
  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDifference = currentScrollY - lastScrollY.current;

        if (currentScrollY < 50) {
          setIsHeaderVisible(true);
        } else if (Math.abs(scrollDifference) > 5) {
          setIsHeaderVisible(scrollDifference < 0);
        }

        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
    if (!searchTerm.trim()) return menuItems;
    const search = searchTerm.toLowerCase().trim();
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
    );
  }, [menuItems, searchTerm]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredItems.forEach((item) => {
      const category = item.category || "other";
      if (!groups[category]) {
        groups[category] = [];
        if (!categoryRefs.current[category]) {
          categoryRefs.current[category] = React.createRef<HTMLDivElement>();
        }
      }
      groups[category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const categories = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);

  const scrollToCategory = useCallback((category: string) => {
    setActiveCategory(category);
    const ref = categoryRefs.current[category];
    if (ref?.current) {
      const yOffset = -200;
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  const handleTabChange = useCallback((tab: 'menu' | 'reviews') => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Update active category based on scroll position
  useEffect(() => {
    if (activeTab !== 'menu') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const category = entry.target.getAttribute('data-category');
            if (category) setActiveCategory(category);
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );

    Object.entries(categoryRefs.current).forEach(([category, ref]) => {
      if (ref.current) {
        ref.current.setAttribute('data-category', category);
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [categories, activeTab]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
        <Loader2 className="w-12 h-12 text-[#00bfff] animate-spin" />
        <p className="text-zinc-400 mt-4">Loading menu...</p>
      </div>
    );
  }

  if (!vendor || !vendorId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 px-4">
        <p className="text-zinc-400 text-lg">Vendor not found</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
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
      
      {/* Header with slide animation */}
      <motion.div
        initial={false}
        animate={{ y: isHeaderVisible ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-30 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800/50 shadow-xl"
      >
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{vendor.name}</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <StarRating rating={vendor.averageRating || 0} readOnly size={14} />
                <span>({vendor.ratingCount || 0})</span>
              </div>
            </div>
          </div>
          
          {activeTab === 'menu' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border-zinc-700 pl-10 pr-10 focus:border-[#00bfff] transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-700 rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              )}
            </motion.div>
          )}
        </div>
        
        <div className="max-w-4xl mx-auto px-4 flex border-t border-zinc-800/50">
          <TabButton label="Menu" active={activeTab === 'menu'} onClick={() => handleTabChange('menu')} />
          <TabButton label="Reviews" active={activeTab === 'reviews'} onClick={() => handleTabChange('reviews')} />
        </div>
      </motion.div>

      {/* Spacer */}
      <div className="h-[140px]" />

      {/* Category Filters */}
      <AnimatePresence>
        {activeTab === 'menu' && categories.length > 0 && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: isHeaderVisible ? 0 : -150, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-[140px] left-0 right-0 z-20 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/50 pt-6"
          >
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => scrollToCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                      activeCategory === category 
                        ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20" 
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    <span className="capitalize">{category}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 pb-24">
        {activeTab === 'menu' ? (
          <div className="pt-4">
            {categories.length > 0 ? (
              <div className="space-y-8">
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
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 text-lg">No items found</p>
                {searchTerm && (
                  <Button 
                    onClick={clearSearch} 
                    variant="ghost" 
                    className="mt-4 text-[#00bfff] hover:text-[#00a6e0]"
                  >
                    Clear search
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4"
          >
            <ReviewsSection vendorId={vendorId} />
          </motion.div>
        )}
      </main>

      <Navbar />
    </div>
  );
};

const TabButton = React.memo(({ 
  label, 
  active, 
  onClick 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) => (
  <button 
    onClick={onClick} 
    className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
      active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
    }`}
  >
    {label}
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00bfff]"
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    )}
  </button>
));

TabButton.displayName = "TabButton";

export default VendorMenuPage;