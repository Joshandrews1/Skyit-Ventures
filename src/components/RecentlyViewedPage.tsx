import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Clock, Trash2, ShoppingCart, Eye, Heart, ArrowRight, Sparkles, SlidersHorizontal, ArrowUpDown, Check, RefreshCw } from 'lucide-react';

interface RecentlyViewedPageProps {
  recentlyViewedIds: string[];
  allProducts: Product[];
  onClearHistory: () => void;
  onRemoveFromHistory: (productId: string) => void;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  wishlistIds: string[];
  onToggleWishlist: (product: Product) => void;
  onNavigateToShop: () => void;
}

export const RecentlyViewedPage: React.FC<RecentlyViewedPageProps> = ({
  recentlyViewedIds,
  allProducts,
  onClearHistory,
  onRemoveFromHistory,
  onViewProduct,
  onAddToCart,
  wishlistIds,
  onToggleWishlist,
  onNavigateToShop,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'price-low' | 'price-high'>('recent');
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Map recentlyViewedIds in order to products
  const viewedProducts = useMemo(() => {
    const list: Product[] = [];
    for (const id of recentlyViewedIds) {
      const found = allProducts.find(p => p.id === id);
      if (found && !list.some(p => p.id === found.id)) {
        list.push(found);
      }
    }
    return list;
  }, [recentlyViewedIds, allProducts]);

  // Available categories in viewed items
  const categories = useMemo(() => {
    const set = new Set<string>();
    viewedProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [viewedProducts]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    let result = [...viewedProducts];

    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [viewedProducts, selectedCategory, sortBy]);

  // Recommended backup products if list is empty or small
  const recommendedProducts = useMemo(() => {
    return allProducts
      .filter(p => !recentlyViewedIds.includes(p.id))
      .slice(0, 4);
  }, [allProducts, recentlyViewedIds]);

  const handleAddToCartWithToast = (product: Product, e?: React.MouseEvent) => {
    onAddToCart(product, e);
    setAddedToast(product.id);
    setTimeout(() => setAddedToast(null), 2000);
  };

  const formatNaira = (val: number) => {
    return "₦" + Math.floor(val || 0).toLocaleString('en-US').replace(/\s+/g, '');
  };

  return (
    <div className="space-y-8 w-full animate-fade-in pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0e131e] to-slate-900 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Clock size={14} />
              <span>Browsing History</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
              Recently Viewed Products
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Quickly re-visit microgrid inverters, solar panels, LFP battery banks, and security hardware you inspected during your session.
            </p>
          </div>

          {viewedProducts.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClearHistory}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Trash2 size={15} />
                <span>Clear History ({viewedProducts.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewedProducts.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 sm:p-16 border border-slate-200 text-center shadow-xs space-y-6 max-w-2xl mx-auto my-6">
          <div className="w-20 h-20 bg-blue-50 text-[#0066ff] rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
            <Clock size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 font-display">No Recently Viewed Products Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              As you browse our clean energy catalog, hardware components and solar packages will automatically appear here for easy comparison.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateToShop}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              <ShoppingCart size={18} />
              <span>Explore Hardware Catalog</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Populated State with Filters & Grid */
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
                <SlidersHorizontal size={14} />
                <span>Filter:</span>
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#0066ff] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown & Count */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <span className="text-xs font-medium text-slate-500">
                Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of {viewedProducts.length} items
              </span>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown size={13} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="recent">Most Recently Viewed</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => {
              const isWishlisted = wishlistIds.includes(product.id);
              const isJustAdded = addedToast === product.id;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group relative"
                >
                  {/* Item Order Badge */}
                  <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/10">
                    #{index + 1} Viewed
                  </div>

                  {/* Top Remove Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromHistory(product.id);
                    }}
                    className="absolute top-3 right-3 z-10 p-1.5 bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full shadow-sm border border-slate-200 transition-colors cursor-pointer"
                    title="Remove from recently viewed"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Image Container */}
                  <div
                    onClick={() => onViewProduct(product)}
                    className="w-full h-48 sm:h-52 bg-slate-50 p-4 relative flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-100"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />

                    {product.discountPercent > 0 && (
                      <div className="absolute bottom-3 left-3 bg-red-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs">
                        -{product.discountPercent}% OFF
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#0066ff] uppercase tracking-wider block">
                        {product.category}
                      </span>
                      <h3
                        onClick={() => onViewProduct(product)}
                        className="text-sm font-bold text-slate-900 hover:text-[#0066ff] transition-colors cursor-pointer line-clamp-2 leading-snug font-display"
                      >
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    {/* Price & Action Row */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          {product.discountPercent > 0 && product.originalPrice && (
                            <span className="text-[11px] text-slate-400 line-through font-mono block">
                              {formatNaira(product.originalPrice)}
                            </span>
                          )}
                          <span className="text-base font-extrabold text-slate-900 font-mono">
                            {formatNaira(product.price)}
                          </span>
                        </div>

                        {/* Wishlist Button */}
                        <button
                          type="button"
                          onClick={() => onToggleWishlist(product)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                            isWishlisted
                              ? 'bg-rose-50 border-rose-200 text-rose-500'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-500'
                          }`}
                          title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                        >
                          <Heart size={16} className={isWishlisted ? "fill-rose-500" : ""} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onViewProduct(product)}
                          className="w-full py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Eye size={14} />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleAddToCartWithToast(product, e)}
                          className={`w-full py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#0066ff] hover:bg-[#0052cc] text-white shadow-sm'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check size={14} />
                              <span>Added!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={14} />
                              <span>Add Cart</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Products Section */}
      {recommendedProducts.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-lg font-bold text-white font-display">
                Recommended For You
              </h3>
            </div>
            <button
              type="button"
              onClick={onNavigateToShop}
              className="text-xs font-bold text-[#b3c5ff] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>View All Catalog</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => onViewProduct(p)}
                className="bg-[#171b27] border border-white/10 rounded-2xl p-4 hover:border-blue-500/50 transition-all cursor-pointer flex items-center gap-3 group"
              >
                <div className="w-16 h-16 bg-[#0e131e] rounded-xl p-1 shrink-0 flex items-center justify-center border border-white/5 overflow-hidden">
                  <img src={p.image} alt={p.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">{p.category}</span>
                  <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">{p.name}</h4>
                  <div className="text-xs font-extrabold text-white font-mono mt-1">{formatNaira(p.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
