import React from 'react';
import { Product } from '../types';
import { Star, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onViewDetails: (product: Product) => void;
}

const getInitialReviewsStats = (product: Product) => {
  const cat = product.category;
  if (cat === "Solar Panels") return { count: 3, average: 4.7 };
  if (cat === "Inverters") return { count: 3, average: 4.7 };
  if (cat === "Batteries") return { count: 3, average: 5.0 };
  if (cat === "Security Systems") return { count: 3, average: 4.7 };
  return { count: 2, average: 5.0 };
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onViewDetails }) => {
  const defaultStats = getInitialReviewsStats(product);

  // Directly utilize the product's rating and count or fallback to structured default stats
  const totalReviewsCount = product.ratingCount || 0;
  const averageRating = totalReviewsCount > 0 ? (product.rating || defaultStats.average) : 0;

  return (
    <div 
      id={`prod-card-${product.id}`}
      onClick={() => onViewDetails(product)}
      className="group bg-white rounded-xl border border-slate-200/70 hover:border-brand/40 hover:shadow-[0_6px_20px_rgba(30,50,90,0.06)] transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full select-none"
    >
      {/* Product Image & Badge */}
      <div className="relative bg-white aspect-square w-full overflow-hidden flex items-center justify-center p-3 sm:p-4 border-b border-slate-100">
        <img 
          src={product.image} 
          alt={product.name}
          referrerPolicy="no-referrer"
          className="object-contain w-full h-full max-h-full max-w-full transition-transform duration-300 group-hover:scale-102"
        />
        {/* Discount Badge */}
        {product.discountPercent > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-[#fff0e6] text-[#ff8a00] text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-sm border border-[#ff8a00]/10 shadow-[0_1px_2px_rgba(255,138,0,0.08)] z-10">
            -{product.discountPercent}%
          </div>
        )}
        
        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5 bg-slate-100 text-slate-600 text-[8px] sm:text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-xs">
          {product.category}
        </div>
      </div>

      {/* Content wrapper */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-grow justify-between gap-2 bg-white">
        <div>
          {/* Product Title */}
          <h3 className="font-sans font-normal text-slate-800 text-xs sm:text-[13px] line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {product.name}
          </h3>

          {/* Elegant Star Ratings with Count */}
          {totalReviewsCount > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => {
                  const filled = i < Math.round(averageRating);
                  return (
                    <Star 
                      key={i} 
                      size={11} 
                      className="sm:w-[12px] sm:h-[12px]" 
                      fill={filled ? "currentColor" : "none"} 
                      stroke={filled ? "none" : "currentColor"} 
                    />
                  );
                })}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 ml-0.5">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">
                ({totalReviewsCount})
              </span>
            </div>
          )}
          {totalReviewsCount === 0 && (
            <div className="h-6 mt-1.5 flex items-center">
              <span className="text-[10px] text-slate-400 italic">No ratings yet</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
          {/* Price & Actions */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex flex-col min-h-[34px] justify-center">
              {product.discountPercent > 0 && (
                <span className="text-[10px] sm:text-[11px] text-slate-400 line-through font-mono leading-none mb-0.5">
                  ₦{product.originalPrice.toLocaleString()}
                </span>
              )}
              <span className="text-13px sm:text-[15px] font-bold font-mono text-slate-900 leading-none">
                ₦{product.price.toLocaleString()}
              </span>
            </div>

            <button
              id={`add-btn-${product.id}`}
              onClick={(e) => onAddToCart(product, e)}
              className="bg-brand hover:bg-brand-hover active:scale-95 text-white p-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:shadow-sm shrink-0"
              title="Add to Cart"
            >
              <ShoppingCart size={12} strokeWidth={2.5} />
              <span className="hidden xs:inline text-[10px] font-bold uppercase tracking-wider">Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
