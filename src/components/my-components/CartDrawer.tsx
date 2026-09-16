import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Image as ImageIcon,
  Trash2,
  Loader2,
} from 'lucide-react';
import { DeliveryOptionId, DELIVERY_OPTIONS, DeliveryOption } from '../../hooks/useCart';

// Design canvas shows the 2x2 delivery grid in this order (Bodaboda selected
// by default, top-left). DELIVERY_OPTIONS itself must keep 'asap' at index 0
// — useCart.ts overrides that entry's surcharge from platform config — so we
// only reorder for display here.
const DELIVERY_DISPLAY_ORDER: DeliveryOptionId[] = ['bodaboda', 'asap', 'free', 'pickup'];
const sortForDisplay = (options: DeliveryOption[]) =>
  [...options].sort(
    (a, b) => DELIVERY_DISPLAY_ORDER.indexOf(a.id) - DELIVERY_DISPLAY_ORDER.indexOf(b.id)
  );
import { useWallet } from '../../context/WalletContext';
import TopUpWalletModal from './TopUpWalletModal';
import BottomSheet from './BottomSheet';

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
  // Paying with Sosika Cash at checkout is temporarily unavailable: wallet
  // debits used to run as a direct client-side Firestore write
  // (WalletContext.deductWalletBalance), which is no longer permitted now
  // that `wallets`/`wallet_transactions` are server-write-only. This comes
  // back once checkout moves behind the `placeOrder` callable, which will
  // debit the wallet atomically with order creation server-side.
  const { balance: walletBalance } = useWallet();

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const serviceFee = cartTotal > 0 ? cartTotal - subtotal - deliveryFee : 1000;
  const vendorName = cart[0]?.vendor_name || cart[0]?.vendorName;

  const handleCheckoutClick = async () => {
    const res = await checkout({
      paymentMethod: 'cash_on_delivery',
      walletDiscount: 0,
      cashPayable: cartTotal,
    });

    if (res?.orderId) {
      onClose();
      navigate(`/track/${res.orderId}`);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span className="flex items-baseline gap-2">
            Your order
            {vendorName && (
              <span className="text-xs font-semibold text-content-muted">{vendorName}</span>
            )}
          </span>
        }
      >
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-surface-1 border border-edge-2 text-content-muted flex items-center justify-center">
              <ShoppingCart size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-content">Your cart is empty</h3>
              <p className="text-xs text-content-muted max-w-xs">
                Discover delicious food according to your mood and add items to your cart.
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-sosika-cyan text-on-accent font-bold px-6 py-3 rounded-2xl text-sm active:opacity-90 transition-opacity"
            >
              Explore menus
            </button>
          </div>
        ) : (
          <>
            {/* Line items */}
            <div className="flex flex-col">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3.5 items-center py-3.5 border-b border-edge-1 last:border-b-0"
                >
                  <div className="flex-none w-[46px] h-[46px] rounded-[13px] overflow-hidden bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)] flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={16} className="text-content-faint" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-content truncate">{item.name}</h4>
                    <p className="font-mono text-xs text-content-muted mt-[3px]">
                      {parseFloat(item.price).toLocaleString()} each
                    </p>
                  </div>

                  <div className="flex-none flex items-center gap-3 bg-surface-2 border border-edge-2 rounded-full px-3 py-[6px]">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="text-[15px] text-content-tertiary leading-none"
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      −
                    </button>
                    <span className="font-mono text-[13px] font-bold text-content leading-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="text-[15px] text-accent-ink leading-none"
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-content-faint hover:text-red-400 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* How it gets to you */}
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-2.5">
                How it gets to you
              </div>
              <div className="grid grid-cols-2 gap-[9px]">
                {sortForDisplay(DELIVERY_OPTIONS).map((option) => {
                  const isSelected = selectedDeliveryOption === option.id;
                  // The Free Delivery Pass checkout path debits its usage
                  // counter with a direct client write to freeDeliveryPass
                  // (src/hooks/useCart.ts), which is now server-write-only —
                  // see firestore.rules. Force this option off until that
                  // debit moves into the `placeOrder` callable (Phase 1).
                  const isFreeDisabled = option.id === 'free';

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isFreeDisabled}
                      onClick={() => {
                        if (!isFreeDisabled) setSelectedDeliveryOption(option.id);
                      }}
                      className={`rounded-[15px] border px-[13px] py-3 text-left transition-colors ${
                        isFreeDisabled
                          ? 'opacity-40 cursor-not-allowed border-edge-1 bg-surface-1'
                          : isSelected
                          ? 'border-sosika-cyan/35 bg-sosika-cyan/[0.08]'
                          : 'border-edge-2 bg-surface-1'
                      }`}
                    >
                      <span className={`text-[13px] block truncate ${isSelected ? 'font-bold text-content' : 'font-semibold text-content-secondary'}`}>
                        {option.label}
                      </span>
                      <span className={`font-mono text-[11px] block mt-1 ${isSelected ? 'text-accent-ink' : 'text-content-muted'}`}>
                        {option.eta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sosika Cash toggle row (disabled until server-side checkout ships) */}
            <button
              type="button"
              onClick={() => setTopUpModalOpen(true)}
              title="Paying with Sosika Cash at checkout is temporarily unavailable"
              className="w-full flex items-center justify-between gap-3 rounded-[15px] border border-sosika-amber/25 bg-sosika-amber/[0.055] px-3.5 py-[13px] text-left opacity-60"
            >
              <div>
                <div className="text-[13px] font-bold text-amber-ink">
                  Pay {cartTotal.toLocaleString()} with Sosika Cash
                </div>
                <div className="text-[11px] text-content-tertiary mt-[3px]">
                  Balance {walletBalance.toLocaleString()} · rest in cash
                </div>
              </div>
              <span className="w-[42px] h-6 rounded-full bg-surface-3 flex items-center px-[3px] flex-none">
                <span className="w-[18px] h-[18px] rounded-full bg-ground" />
              </span>
            </button>

            {/* Breakdown */}
            <div className="flex flex-col gap-[7px] text-[13px]">
              <div className="flex justify-between text-content-tertiary">
                <span>Subtotal</span>
                <span className="font-mono text-content">{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-content-tertiary">
                <span>Delivery</span>
                <span className="font-mono text-content">{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-content-tertiary">
                <span>Service</span>
                <span className="font-mono text-content">{serviceFee.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={clearCart}
              className="self-start text-xs font-semibold text-content-muted hover:text-content transition-colors"
            >
              Clear cart
            </button>
          </>
        )}

        {cart.length > 0 && (
          <button
            onClick={handleCheckoutClick}
            disabled={loading || calculatingFee}
            className="w-full bg-sosika-cyan text-on-accent font-bold text-[15px] px-8 py-[18px] rounded-[18px] active:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : calculatingFee ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Calculating…</span>
              </>
            ) : (
              <span className="w-full flex items-center justify-between">
                <span>Place order · cash</span>
                <span className="font-mono text-base">{cartTotal.toLocaleString()}</span>
              </span>
            )}
          </button>
        )}
      </BottomSheet>

      <TopUpWalletModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
      />
    </>
  );
}
