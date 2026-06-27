import { trackEvent } from '../lib/analytics';
import React from 'react';
import { CartItem } from '../types';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQty: (prodId: string, quantity: number) => void;
  onRemoveItem: (prodId: string) => void;
  onInitiateCheckout: () => void;
  currentUser?: any;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onInitiateCheckout,
  currentUser,
}) => {
  if (!isOpen) return null;

  // Calculators
  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalOriginal = cartItems.reduce((acc, item) => acc + (item.product.originalPrice * item.quantity), 0);
  const totalDiscount = totalOriginal - subtotal;
  
  // Custom Logistics rules: flat N15,000 for order < N500k, free delivery/installation above!
  const deliveryFee = subtotal > 0 ? (subtotal >= 500000 ? 0 : 15000) : 0;
  const grandTotal = subtotal + deliveryFee;

  const formatNaira = (val: number) => {
    return "₦" + Math.floor(val).toLocaleString();
  };

  const handleInitiateCheckout = () => {
    trackEvent('begin_checkout', {
      currency: 'NGN',
      value: grandTotal,
      items: cartItems.map(item => ({
        item_id: item.product.id,
        item_name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      }))
    });
    onInitiateCheckout();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-end z-50 animate-fade-in">
      <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl relative border-l border-slate-200 text-slate-600">
               {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <ShoppingBag className="text-brand" size={18} />
            <h2 className="font-display font-semibold text-base">My Cart</h2>
            <span className="bg-slate-200 text-slate-800 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border border-slate-300">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} Items
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-150 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="bg-slate-100 p-6 rounded-full text-slate-400 mb-4 border border-slate-200">
                 <ShoppingBag size={44} />
              </div>
              <h3 className="text-slate-800 font-display font-semibold text-sm">Your Cart is Empty</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
                Explore our premium monocrystalline solar panels, pure sine wave inverters, and starlight dome security camera systems.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div 
                key={item.product.id}
                className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/85 items-center justify-between hover:border-brand/40 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-md overflow-hidden bg-white border border-slate-200 shrink-0">
                  <img 
                    src={item.product.image} 
                    alt={item.product.name} 
                    className="w-full h-full object-cover opacity-95"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-display font-bold text-slate-800 truncate leading-snug">
                    {item.product.name}
                  </h4>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1.5 font-medium">
                    {item.product.category}
                  </p>
                  
                  {/* Quantity Controller */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-sm bg-white">
                      <button 
                        onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 text-xs font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold font-mono text-slate-800">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 text-xs font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pricing summary */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-bold font-mono text-slate-800">
                    {formatNaira(item.product.price * item.quantity)}
                  </span>
                  
                  {item.product.discountPercent > 0 && (
                    <span className="text-[9px] bg-red-50 text-red-650 border border-red-100 px-1 py-0.2 rounded font-semibold">
                      Saved {formatNaira((item.product.originalPrice - item.product.price) * item.quantity)}
                    </span>
                  )}

                  <button 
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-slate-400 hover:text-red-500 p-1 hover:bg-slate-100 rounded transition-colors mt-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Checkout Block */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="space-y-1.5 text-xs text-slate-500 mb-4">
              <div className="flex justify-between">
                <span>Original Subtotal</span>
                <span className="line-through text-slate-400 font-mono">{formatNaira(totalOriginal)}</span>
              </div>
              <div className="flex justify-between text-red-650 font-medium">
                <span>Campaign Savings</span>
                <span className="font-mono">-{formatNaira(totalDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Installation & Delivery Fee</span>
                <span className="font-mono">{deliveryFee === 0 ? "FREE" : formatNaira(deliveryFee)}</span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-[10px] text-brand font-bold text-right">
                  Add {formatNaira(500000 - subtotal)} more for FREE System Deployment!
                </p>
              )}
              <div className="flex justify-between text-sm font-semibold text-slate-800 pt-2 border-t border-slate-200">
                <span>Total Amount Due</span>
                <span className="text-base font-bold font-mono text-slate-900">{formatNaira(grandTotal)}</span>
              </div>
            </div>

            {/* Security Guarantee */}
            <div className="flex items-center gap-1.5 justify-center text-[9px] uppercase tracking-wider text-slate-400 mb-3 bg-white p-2 rounded-lg border border-slate-200">
              <ShieldCheck className="text-emerald-500" size={13} />
              <span>Secure SkyIT Escrow Payment Certified</span>
            </div>

            {!currentUser && (
              <div className="bg-blue-50 border border-blue-150 rounded-xl p-3 mb-3 text-[11px] text-blue-800 leading-normal">
                <span className="font-bold flex items-center gap-1 mb-0.5">💡 Checking out as Guest</span>
                <span>You can check out as a guest. To save orders to your profile and track them easily, please log in first.</span>
              </div>
            )}

            <button
              onClick={handleInitiateCheckout}
              className="w-full bg-brand hover:bg-brand-hover active:scale-98 transition-all text-white font-bold uppercase tracking-widest py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-xs text-xs cursor-pointer"
            >
              <span>Secure Checkout</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
