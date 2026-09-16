import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Search, ShoppingBag, X } from "lucide-react";
import { fetchVendorMenu } from "../mood/api/mood-api";
import { Vendor, MenuItem, Review } from "../mood/types/types";
import { useCartContext } from "../../context/cartContext";
import { getReviews, addReview } from "../../services/reviews-api";
import Navbar from "../../components/my-components/navbar";
import CartSummaryBar from "../../components/my-components/CartSummaryBar";
import CartDrawer from "../../components/my-components/CartDrawer";
import StarRating from "../../components/my-components/StarRating";
import { triggerAddToCartToast } from "../../components/my-components/AddToCartToast";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Helmet } from "react-helmet-async";
import posthog from "./../../lib/posthog";

// --- Sub-Components ---

const MenuItemRow = React.memo(({ item, isVendorOpen = true }: { item: MenuItem; isVendorOpen?: boolean }) => {
  const { addToCart } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);

  const isAvailable = item.is_available !== false;
  const canAdd = isAvailable && isVendorOpen;

  const handleAddToCart = useCallback(async () => {
    if (!canAdd) return;
    setIsAdding(true);
    addToCart({ ...item, quantity: 1 } as any);
    triggerAddToCartToast(item);
    // Quick visual feedback
    setTimeout(() => setIsAdding(false), 600);
  }, [item, addToCart, canAdd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3.5 items-center py-[15px] border-b border-edge-1 last:border-b-0 transition-opacity ${
        isAvailable ? "" : "opacity-50"
      }`}
    >
      <div className="flex-none w-14 h-14 rounded-[15px] overflow-hidden bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)]">
        {item.image_url && (
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-content text-[15px] tracking-[-0.01em] truncate">{item.name}</h4>
          {!isAvailable && (
            <span className="text-[9px] font-bold text-content-tertiary bg-surface-3 border border-edge-2 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Out of stock
            </span>
          )}
          {!isVendorOpen && isAvailable && (
            <span className="text-[9px] font-bold text-amber-ink bg-sosika-amber/10 border border-sosika-amber/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Closed
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-content-muted mt-1 truncate">{item.description}</p>
        )}
        {item.ratingCount ? (
          <div className="flex items-center gap-1.5 mt-1">
            <StarRating rating={item.averageRating || 0} readOnly size={12} />
            <span className="text-[11px] text-content-faint">({item.ratingCount})</span>
          </div>
        ) : null}
      </div>

      <div className="flex-none flex flex-col items-end gap-2">
        <span className="font-mono text-sm font-bold text-content">
          {Number(item.price).toLocaleString()}
        </span>
        <button
          onClick={() => {
            if (!canAdd) return;
            posthog.capture("order_started", {
              platform: 'app',
              item_id: item.id,
              item_name: item.name,
            })
            handleAddToCart();
          }}
          disabled={isAdding || !canAdd}
          className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 transition-all border ${
            !canAdd
              ? "border-edge-2 cursor-not-allowed opacity-40"
              : "border-edge-3 active:scale-90"
          }`}
          aria-label={!isAvailable ? `${item.name} is out of stock` : !isVendorOpen ? `${item.name} is unavailable (Vendor is closed)` : `Add ${item.name} to cart`}
        >
          <motion.div
            animate={isAdding ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <ShoppingBag className={`w-3.5 h-3.5 ${!canAdd ? "text-content-faint" : "text-content-secondary"}`} />
          </motion.div>
        </button>
      </div>
    </motion.div>
  );
});

MenuItemRow.displayName = "MenuItemRow";

const CategorySection = React.memo(({
  category,
  items,
  refProp,
  isVendorOpen = true,
}: {
  category: string;
  items: MenuItem[];
  refProp: React.RefObject<HTMLDivElement | null>;
  isVendorOpen?: boolean;
}) => (
  <div ref={refProp} className="scroll-mt-[368px]">
    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink sticky top-[356px] bg-chrome backdrop-blur-sm py-3 z-10 -mx-5 px-5">
      {category}
    </div>
    <div>
      {items.map((item) => (
        <MenuItemRow key={item.id} item={item} isVendorOpen={isVendorOpen} />
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
        className="p-5 border border-edge-2 rounded-xl bg-surface-1"
      >
        <h3 className="font-bold text-lg mb-4">Leave a Review</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-content-tertiary mb-2 block">Your Rating</label>
            <StarRating rating={newRating} onRatingChange={setNewRating} size={28} />
          </div>
          <Input
            type="text"
            placeholder="Your name (optional)"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            maxLength={50}
            className="bg-surface-2 border-edge-2 focus:border-sosika-cyan transition-colors"
          />
          <Textarea
            value={newReviewText}
            onChange={(e) => setNewReviewText(e.target.value)}
            placeholder="Share your experience..."
            maxLength={500}
            rows={4}
            className="bg-surface-2 border-edge-2 focus:border-sosika-cyan transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-muted">{newReviewText.length}/500</span>
            <Button 
              onClick={handleSubmitReview} 
              disabled={isSubmitting || !canSubmit}
              className="bg-sosika-cyan hover:bg-sosika-cyan text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
            <Loader2 className="w-8 h-8 animate-spin text-accent-ink" />
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
                  className="p-4 bg-surface-1 rounded-xl border border-edge-2 hover:border-edge-2 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-content">{review.userName || 'Anonymous'}</span>
                    <StarRating rating={review.rating} readOnly size={14} />
                  </div>
                  <p className="text-content-secondary text-sm leading-relaxed">{review.reviewText}</p>
                  <p className="text-xs text-content-muted mt-3">
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
            <p className="text-content-muted text-lg">No reviews yet</p>
            <p className="text-content-faint text-sm mt-1">Be the first to share your experience!</p>
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
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    cart,
    cartTotal,
    deliveryFee,
    baseFee,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    loading: cartLoading,
    selectedDeliveryOption,
    setSelectedDeliveryOption,
    calculatingFee,
    freeDeliveryUsesLeft,
    freeDeliveryResetDate,
  } = useCartContext();

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

  // Cart items belonging to this vendor — for the floating "N items · Vendor →" bar
  const vendorCartItems = useMemo(
    () => cart.filter((item) => item.vendor_id === vendorId),
    [cart, vendorId]
  );
  const vendorCartCount = vendorCartItems.reduce((sum, i) => sum + i.quantity, 0);
  const vendorCartTotal = vendorCartItems.reduce(
    (sum, i) => sum + parseFloat(i.price as unknown as string) * i.quantity,
    0
  );

  const scrollToCategory = useCallback((category: string) => {
    setActiveCategory(category);
    const ref = categoryRefs.current[category];
    if (ref?.current) {
      const yOffset = -360;
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-ground">
        <Loader2 className="w-12 h-12 text-accent-ink animate-spin" />
        <p className="text-content-tertiary mt-4">Loading menu...</p>
      </div>
    );
  }

  if (!vendor || !vendorId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ground px-4">
        <p className="text-content-tertiary text-lg">Vendor not found</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ground text-content-secondary">
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
        className="fixed top-0 left-0 right-0 z-30 bg-chrome backdrop-blur-xl border-b border-edge-2 shadow-xl"
      >
        {/* Storefront cover photo */}
        <div className="relative h-40 bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)]">
          {vendor.cover_image_url && (
            <img src={vendor.cover_image_url} alt="" className="w-full h-full object-cover" />
          )}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-5 left-5 w-9 h-9 rounded-xl bg-black/70 border border-edge-3 flex items-center justify-center text-white"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-[22px] font-bold text-content tracking-[-0.02em] truncate">{vendor.name}</h1>
            <span className="text-[10px] font-bold text-emerald-ink border border-sosika-emerald/30 px-2 py-1 rounded-full">
              {vendor.is_open ? "OPEN" : "CLOSED"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-content-tertiary mb-3">
            <StarRating rating={vendor.averageRating || 0} readOnly size={14} />
            <span>({vendor.ratingCount || 0})</span>
          </div>

          {activeTab === 'menu' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface-2 border-edge-2 pl-10 pr-10 focus:border-sosika-cyan transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-3 rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-content-tertiary" />
                </button>
              )}
            </motion.div>
          )}
        </div>
        
        <div className="max-w-md mx-auto px-4 flex border-t border-edge-2">
          <TabButton label="Menu" active={activeTab === 'menu'} onClick={() => handleTabChange('menu')} />
          <TabButton label="Reviews" active={activeTab === 'reviews'} onClick={() => handleTabChange('reviews')} />
        </div>
      </motion.div>

      {/* Spacer */}
      <div className="h-[300px]" />

      {/* Category Filters */}
      <AnimatePresence>
        {activeTab === 'menu' && categories.length > 0 && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: isHeaderVisible ? 0 : -150, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-[300px] left-0 right-0 z-20 bg-chrome backdrop-blur-md border-b border-edge-2 pt-6"
          >
            <div className="max-w-md mx-auto px-4 py-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => scrollToCategory(category)}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                      activeCategory === category
                        ? "bg-sosika-cyan text-on-accent"
                        : "bg-surface-2 text-content-tertiary border border-edge-2"
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
      <main className="max-w-md mx-auto px-4 pb-24">
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
                    isVendorOpen={vendor?.is_open !== false}
                  />
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <Search className="w-12 h-12 text-content-faint mx-auto mb-4" />
                <p className="text-content-muted text-lg">No items found</p>
                {searchTerm && (
                  <Button 
                    onClick={clearSearch} 
                    variant="ghost" 
                    className="mt-4 text-accent-ink hover:text-accent-ink"
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

      {vendorCartCount > 0 && (
        <CartSummaryBar
          label={`${vendorCartCount} item${vendorCartCount !== 1 ? "s" : ""} · ${vendor.name}`}
          total={vendorCartTotal}
          onClick={() => setIsCartOpen(true)}
        />
      )}

      <Navbar />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        checkout={checkout}
        loading={cartLoading}
        deliveryFee={deliveryFee}
        baseFee={baseFee}
        updateQuantity={updateQuantity}
        selectedDeliveryOption={selectedDeliveryOption}
        setSelectedDeliveryOption={setSelectedDeliveryOption}
        calculatingFee={calculatingFee}
        freeDeliveryUsesLeft={freeDeliveryUsesLeft}
        freeDeliveryResetDate={freeDeliveryResetDate}
      />
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
      active ? 'text-content' : 'text-content-tertiary hover:text-content-secondary'
    }`}
  >
    {label}
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-sosika-cyan"
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    )}
  </button>
));

TabButton.displayName = "TabButton";

export default VendorMenuPage;