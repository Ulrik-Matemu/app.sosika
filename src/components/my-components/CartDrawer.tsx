import React from 'react';
import { ShoppingCart, X, Image as ImageIcon, Minus, Plus, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeliveryOptionId, DELIVERY_OPTIONS } from '../../hooks/useCart';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  cartTotal: number;
  deliveryFee: number;
  baseFee: number;
  updateQuantity: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  checkout: () => void;
  loading: boolean;
  selectedDeliveryOption: DeliveryOptionId;
  setSelectedDeliveryOption: (id: DeliveryOptionId) => void;
  calculatingFee: boolean;
  freeDeliveryUsesLeft: number;
  freeDeliveryResetDate: number;
}

const getResetDateString = (resetTimestamp: number) => {
  return new Date(resetTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  cartTotal,
  deliveryFee,
  baseFee,
  updateQuantity,
  removeFromCart,
  clearCart,
  checkout,
  loading,
  selectedDeliveryOption,
  setSelectedDeliveryOption,
  calculatingFee,
  freeDeliveryUsesLeft,
  freeDeliveryResetDate,
}) => {
  const [showBanner, setShowBanner] = React.useState(() => {
    return localStorage.getItem('sosika_free_delivery_pass_banner_dismissed') !== 'true';
  });

  const dismissBanner = () => {
    localStorage.setItem('sosika_free_delivery_pass_banner_dismissed', 'true');
    setShowBanner(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="relative w-full max-w-md bg-[#0a0a0b] border-l border-white/[0.08] h-full flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.01]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-[18px] w-[18px] text-[#00bfff]" />
                Your Cart
                <span className="text-xs font-semibold bg-white/[0.06] px-2 py-0.5 rounded-full text-zinc-400">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-5 w-5 text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 text-sm font-medium">Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-xl flex gap-3.5 items-start">
                    <div className="w-14 h-14 bg-white/[0.04] rounded-lg overflow-hidden flex-shrink-0 border border-white/[0.06]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate leading-snug">{item.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {Number(item.price).toLocaleString()} TZS each
                      </p>

                      {/* Controls */}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded transition-all"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold text-white text-center min-w-6">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded transition-all"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/[0.08] transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-sm text-[#00bfff] text-right flex-shrink-0 pl-1">
                      {(parseFloat(item.price) * item.quantity).toLocaleString()} TZS
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-white/[0.06] bg-white/[0.01] space-y-4">
                {/* Intro Banner */}
                {showBanner && (Date.now() >= new Date('2026-07-22T00:00:00+03:00').getTime()) && (
                  <div className="relative p-3 rounded-xl bg-white/[0.02] border border-[#00bfff]/20 text-xs text-zinc-300 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00bfff] animate-pulse" />
                      Sosika Free Delivery Pass
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Enjoy 3 free scheduled 24hr deliveries every two weeks! The pass resets 14 days after your first usage of each cycle.
                    </p>
                    <button
                      onClick={dismissBanner}
                      className="mt-1 text-[10px] font-bold text-[#00bfff] hover:text-[#00a6e0] transition-colors"
                    >
                      Got it, thanks!
                    </button>
                  </div>
                )}

                {/* Delivery Option Selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Delivery Option</span>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                    {DELIVERY_OPTIONS.filter(option => {
                      const isSuspended = Date.now() < new Date('2026-07-22T00:00:00+03:00').getTime();
                      return !(isSuspended && option.id === 'free');
                    }).map((option) => {
                      const isSelected = selectedDeliveryOption === option.id;
                      const isFreeOption = option.id === 'free';
                      const isOutOfFreeUses = isFreeOption && freeDeliveryUsesLeft === 0;

                      // Calculate displayed fee
                      let feeDisplay = '';
                      if (option.isFree) {
                        feeDisplay = isOutOfFreeUses ? 'Unavailable' : 'Free';
                      } else if (option.isPickup) {
                        feeDisplay = 'You pick up';
                      } else {
                        let optionFee = Math.ceil((baseFee * option.feeMultiplier + option.fixedSurcharge) / 100) * 100;
                        const hour = new Date().getHours();
                        if (hour >= 19 || hour < 6) {
                          optionFee += 2000;
                        }
                        feeDisplay = `${optionFee.toLocaleString()} TZS`;
                      }

                      const labelText = isFreeOption ? 'Free Delivery Pass' : option.label;
                      const etaText = isFreeOption 
                        ? (isOutOfFreeUses 
                            ? `Resets ${getResetDateString(freeDeliveryResetDate)}` 
                            : `${option.eta} (${freeDeliveryUsesLeft} of 3 left)`)
                        : option.eta;

                      return (
                        <button
                          key={option.id}
                          disabled={isOutOfFreeUses}
                          onClick={() => {
                            if (!isOutOfFreeUses) {
                              setSelectedDeliveryOption(option.id);
                            }
                          }}
                          className={`flex-shrink-0 text-left p-3 rounded-xl border transition-all duration-200 min-w-[125px] bg-white/[0.01] flex flex-col justify-between ${
                            isOutOfFreeUses
                              ? 'opacity-40 cursor-not-allowed border-white/[0.04] text-zinc-600'
                              : isSelected
                                ? 'border-[#00bfff] text-[#00bfff] bg-white/[0.02]'
                                : 'border-white/[0.06] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-300'
                          }`}
                        >
                          <div>
                            <div className={`text-xs font-bold truncate ${
                              isOutOfFreeUses 
                                ? 'text-zinc-600' 
                                : isSelected 
                                  ? 'text-[#00bfff]' 
                                  : 'text-zinc-200'
                            }`}>
                              {labelText}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${isOutOfFreeUses ? 'text-red-500/80 font-medium' : 'text-zinc-500'}`}>
                              {etaText}
                            </div>
                          </div>
                          <div className={`text-xs font-semibold mt-2 ${
                            isOutOfFreeUses 
                              ? 'text-zinc-600' 
                              : isSelected 
                                ? 'text-[#00bfff]' 
                                : 'text-zinc-400'
                          }`}>
                            {feeDisplay}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price summary block */}
                <div className="space-y-1.5 text-sm pt-2 border-t border-t-white/[0.04]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-medium text-white">{subtotal.toLocaleString()} TZS</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Service Fee</span>
                    <span className="font-medium text-white">1000 TZS</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Delivery Fee</span>
                    <span className="font-medium text-white">{deliveryFee.toLocaleString()} TZS</span>
                  </div>
                  {selectedDeliveryOption === 'free' && (
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Scheduled batched delivery · up to 24 hrs
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/[0.06] pt-2 text-base font-bold text-white">
                    <span>Total</span>
                    <span className="text-[#00bfff]">{cartTotal.toLocaleString()} TZS</span>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={clearCart}
                    className="px-4 py-3 border border-white/[0.08] bg-white/[0.02] text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all flex-1"
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={checkout}
                    disabled={loading || calculatingFee}
                    className="px-4 py-3 bg-[#00bfff] hover:bg-[#00a6e0] disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-bold rounded-xl transition-all flex-[2] flex items-center justify-center gap-2 active:scale-98"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : calculatingFee ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Calculating...</span>
                      </>
                    ) : selectedDeliveryOption === 'pickup' ? (
                      'Confirm Pickup'
                    ) : (
                      'Place Order'
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
