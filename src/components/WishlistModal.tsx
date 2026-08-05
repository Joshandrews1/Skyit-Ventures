import React from 'react';
import { Product } from '../types';
import { X, Heart, ShoppingCart, Trash2, ArrowRight, ShieldAlert, UserCheck } from 'lucide-react';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  allProducts: Product[];
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onViewProduct: (product: Product) => void;
  onNavigateToShop: () => void;
  currentUser?: any;
  onOpenLogin?: () => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlistIds,
  allProducts,
  onToggleWishlist,
  onAddToCart,
  onViewProduct,
  onNavigateToShop,
  currentUser,
  onOpenLogin,
}) => {
  if (!isOpen) return null;

  const wishlistedProducts = allProducts.filter(p => wishlistIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <Heart size={20} className="fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">My Wishlist</h2>
              <p className="text-xs text-slate-500">
                {wishlistedProducts.length} {wishlistedProducts.length === 1 ? 'saved item' : 'saved items'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Guest Session Notice */}
        {!currentUser && (
          <div className="bg-amber-50 border-b border-amber-200/80 p-3.5 px-5 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Guest Mode:</strong> Saved items are temporary and will be cleared upon logout.
              </span>
            </div>
            {onOpenLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3 py-1 rounded-lg text-[11px] uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {wishlistedProducts.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <Heart size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">Your wishlist is empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {!currentUser 
                    ? 'Sign in to save wishlist items permanently across devices or click the heart icon on any product to save temporarily.'
                    : 'Save items you like by clicking the heart icon on any product card while browsing.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                {!currentUser && onOpenLogin && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenLogin();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <UserCheck size={14} />
                    <span>Sign In / Register</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToShop();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Browse Shop</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {wishlistedProducts.map((product) => (
                <div key={product.id} className="py-3.5 flex items-center gap-3 sm:gap-4 group">
                  {/* Product Image */}
                  <div 
                    onClick={() => {
                      onClose();
                      onViewProduct(product);
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-xl p-1.5 border border-slate-100 shrink-0 cursor-pointer overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {product.category}
                    </span>
                    <h4 
                      onClick={() => {
                        onClose();
                        onViewProduct(product);
                      }}
                      className="text-xs sm:text-sm font-bold text-slate-800 truncate cursor-pointer hover:text-[#0066ff] transition-colors"
                    >
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                        ₦{product.price.toLocaleString()}
                      </span>
                      {product.discountPercent > 0 && (
                        <span className="text-[10px] text-slate-400 line-through font-mono">
                          ₦{product.originalPrice?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        onAddToCart(product, e);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                      title="Add to Cart"
                    >
                      <ShoppingCart size={13} />
                      <span className="hidden sm:inline">Add to Cart</span>
                    </button>
                    <button
                      onClick={() => onToggleWishlist(product)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove from Wishlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {wishlistedProducts.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <button
              onClick={() => {
                onClose();
                onNavigateToShop();
              }}
              className="text-xs font-bold text-[#0066ff] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Explore More Products</span>
              <ArrowRight size={12} />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
