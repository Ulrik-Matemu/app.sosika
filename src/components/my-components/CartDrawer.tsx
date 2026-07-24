import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  X,
  Image as ImageIcon,
  Minus,
  Plus,
  Trash2,
  Loader2,
  Wallet,
  Banknote,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeliveryOptionId, DELIVERY_OPTIONS } from '../../hooks/useCart';
import { useWallet } from '../../context/WalletContext';
import TopUpWalletModal from './TopUpWalletModal';

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
  checkout: (paymentDetails?: { paymentMethod?: string; walletDiscount?: number; cashPayable?: number }) => Promise<any>;
  loading: boolean;
  selectedDeliveryOption: DeliveryOptionId;
  setSelectedDeliveryOption: (id: DeliveryOptionId) => void;
  calculatingFee: boolean;
  freeDeliveryUsesLeft: number;
  freeDeliveryResetDate: number;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  cartTotal,
  deliveryFee,
  updateQuantity,
  removeFromCart,
  clearCart,
  checkout,
  loading,
  selectedDeliveryOption,
  setSelectedDeliveryOption,
  calculatingFee,
}: CartDrawerProps) {
  const navigate = useNavigate();
  const { balance: walletBalance, deductWalletBalance } = useWallet();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  const isWalletInsufficient = paymentMethod === 'wallet' && walletBalance < cartTotal;
  const missingWalletBalance = Math.max(0, cartTotal - walletBalance);

  const appliedWalletDiscount = paymentMethod === 'wallet' ? Math.min(walletBalance, cartTotal) : 0;
  const cashPayable = Math.max(0, cartTotal - appliedWalletDiscount);
  const paymentCode = paymentMethod === 'wallet' ? (appliedWalletDiscount >= cartTotal ? 'sosika_cash' : 'hybrid_wallet_cash') : 'cash_on_delivery';

  const handleCheckoutClick = async () => {
    if (paymentMethod === 'wallet') {
      if (walletBalance < cartTotal) {
        alert(`Insufficient Sosika Cash balance (Required: TZS ${cartTotal.toLocaleString()}, Available: TZS ${walletBalance.toLocaleString()}). Please Top Up or choose Cash on Delivery.`);
        return;
      }
      const walletSuccess = await deductWalletBalance(cartTotal, 'Sosika Meal Order Payment');
      if (!walletSuccess) {
        alert('Failed to deduct Sosika Cash balance. Please check your balance or choose Cash on Delivery.');
        return;
      }
    }

    const res = await checkout({
      paymentMethod: paymentCode,
      walletDiscount: appliedWalletDiscount,
      cashPayable,
    });

    if (res?.orderId) {
      onClose();
      navigate(`/track/${res.orderId}`);
    }
  };

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-[#0a0a0d] border-l border-white/[0.08] h-full shadow-2xl flex flex-col z-10 text-white font-sans overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#0a0a0d]/90 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>Your Order Cart</span>
                    <span className="text-[10px] font-mono font-extrabold bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.1] text-zinc-300">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                    </span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">Review items & checkout</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Body */}
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-zinc-500 flex items-center justify-center">
                  <ShoppingCart size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Your Cart is Empty</h3>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Discover delicious food according to your mood and add items to your cart.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-[#00bfff]/10 cursor-pointer"
                >
                  Explore Menus
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {/* Item List */}
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                    Order Items
                  </span>

                  <div className="space-y-2.5">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-white/[0.1] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-white/[0.08] shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-500 flex items-center justify-center shrink-0">
                              <ImageIcon size={18} />
                            </div>
                          )}

                          <div className="min-w-0 space-y-0.5">
                            <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-mono">
                              {parseFloat(item.price).toLocaleString()} TZS / unit
                            </p>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
                            <button
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center text-xs font-bold font-mono text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Option Selector */}
                <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                    Delivery Option
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {DELIVERY_OPTIONS.map((option) => {
                      const isSelected = selectedDeliveryOption === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedDeliveryOption(option.id as DeliveryOptionId)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#00bfff] bg-[#00bfff]/10 ring-1 ring-[#00bfff]/30'
                              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className={`text-xs font-extrabold block ${isSelected ? 'text-[#00bfff]' : 'text-zinc-200'}`}>
                            {option.label}
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{option.eta}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Means of Payment Section */}
                <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                      Means of Payment
                    </span>
                    <button
                      onClick={() => setTopUpModalOpen(true)}
                      className="text-[10px] font-extrabold text-[#00bfff] hover:underline cursor-pointer"
                    >
                      + Top Up Balance
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Cash Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'border-[#00bfff] bg-[#00bfff]/10 ring-1 ring-[#00bfff]/30'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote size={16} className={paymentMethod === 'cash' ? 'text-[#00bfff]' : 'text-zinc-400'} />
                        <span className={`text-xs font-bold ${paymentMethod === 'cash' ? 'text-white' : 'text-zinc-300'}`}>
                          Cash on Delivery
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">Pay vendor/driver on arrival</p>
                    </button>

                    {/* Sosika Cash Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'wallet'
                          ? 'border-[#00bfff] bg-[#00bfff]/10 ring-1 ring-[#00bfff]/30'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wallet size={16} className={paymentMethod === 'wallet' ? 'text-[#00bfff]' : 'text-zinc-400'} />
                        <span className={`text-xs font-bold ${paymentMethod === 'wallet' ? 'text-white' : 'text-zinc-300'}`}>
                          Sosika Cash
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#00bfff]">
                        Bal: {walletBalance.toLocaleString()} TZS
                      </p>
                    </button>
                  </div>

                  {/* Insufficient Wallet Warning & Actions */}
                  {isWalletInsufficient && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3 mt-2 text-xs"
                    >
                      <div className="flex items-start gap-2 text-amber-300">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-amber-200">Insufficient Sosika Cash Balance</p>
                          <p className="text-[11px] text-amber-300/90 leading-relaxed">
                            Required: <strong>TZS {cartTotal.toLocaleString()}</strong> | Available: <strong>TZS {walletBalance.toLocaleString()}</strong>.
                            Please top up your wallet or switch to Cash on Delivery.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setTopUpModalOpen(true)}
                          className="flex-1 bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-2.5 rounded-xl text-xs transition-all cursor-pointer text-center"
                        >
                          💳 Top Up (+{missingWalletBalance.toLocaleString()} TZS)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className="px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold text-xs transition-all cursor-pointer"
                        >
                          💵 Use Cash
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Summary & Checkout */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-white/[0.08] bg-[#0a0a0d] space-y-4 sticky bottom-0">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-zinc-200">{subtotal.toLocaleString()} TZS</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Service Fee</span>
                    <span className="font-mono text-zinc-200">1,000 TZS</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Delivery Fee</span>
                    <span className="font-mono text-zinc-200">{deliveryFee.toLocaleString()} TZS</span>
                  </div>
                  {paymentMethod === 'wallet' && !isWalletInsufficient && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Sosika Cash Deducted</span>
                      <span className="font-mono">-{cartTotal.toLocaleString()} TZS</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/[0.08] pt-2 text-sm font-extrabold text-white">
                    <span>Total Amount</span>
                    <span className="text-[#00bfff] font-mono">{cartTotal.toLocaleString()} TZS</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="px-3.5 py-3.5 border border-white/[0.08] bg-white/[0.02] text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleCheckoutClick}
                    disabled={loading || calculatingFee || isWalletInsufficient}
                    className="flex-1 bg-[#00bfff] hover:bg-[#00a8e6] disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00bfff]/10"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : calculatingFee ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Calculating...</span>
                      </>
                    ) : isWalletInsufficient ? (
                      'Top Up Required to Proceed'
                    ) : (
                      <>
                        <span>Place Order Now</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          <TopUpWalletModal
            isOpen={topUpModalOpen}
            onClose={() => setTopUpModalOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
