import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect } from 'react';
import { Product, Review } from '../types';
import { X, Star, ShoppingCart, ShieldCheck, Truck, Wrench, MessageSquare, Check, Lock, AlertCircle, ChevronLeft } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';

interface ProductDetailModalProps {
  product: Product | null;
  allProducts: Product[];
  onViewProduct: (product: Product) => void;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}


export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, allProducts, onViewProduct, onClose, onAddToCart }) => {
  if (!product) return null;

  const [qty, setQty] = useState(1);
  const [activeImgUrl, setActiveImgUrl] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');

  // Firestore reviews & eligibility states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);

  // Review submission form states
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Standard One-Time Firestore Review Fetching
  const fetchReviewsOnce = async () => {
    if (!product) return;
    setLoadingReviews(true);
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', product.id)
      );
      const snapshot = await getDocs(q);
      const fbReviews: Review[] = [];
      snapshot.forEach((docSnap) => {
        fbReviews.push(docSnap.data() as Review);
      });
      // Sort reviews descending by date
      fbReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(fbReviews);
    } catch (err) {
      console.warn("Firestore reviews sync notice:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    trackEvent('view_item', {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price
    });
    setActiveTab('details');
  }, [product]);

  // Eligibility Verification Check
  useEffect(() => {
    if (!product) return;
    const checkPurchaseHistory = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setHasPurchased(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        let matchFound = false;

        querySnapshot.forEach((docSnap) => {
          const orderData = docSnap.data();
          if (orderData.items && Array.isArray(orderData.items)) {
            const hasItem = orderData.items.some((item: any) => item.product?.id === product.id);
            if (hasItem) {
              matchFound = true;
            }
          }
        });

        setHasPurchased(matchFound);
      } catch (err) {
        console.warn("Eligibility purchase check warning:", err);
        setHasPurchased(false);
      }
    };

    checkPurchaseHistory();
  }, [product, auth.currentUser]);

  if (!product) return null;

  const handleAdd = () => {
    trackEvent('add_to_cart', {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      quantity: qty
    });
    onAddToCart(product, qty);
    setQty(1);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2500);
  };

  const formatNaira = (val: number) => {
    return "₦" + Math.floor(val).toLocaleString();
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (!newComment.trim()) {
      setReviewError("Please type a descriptive comment first.");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    const reviewId = `rev-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const reviewData: Review = {
      id: reviewId,
      productId: product.id,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email?.split('@')[0] || "SkyIT Customer",
      userEmail: currentUser.email || "",
      rating: newRating,
      comment: newComment,
      createdAt: new Date().toISOString(),
      isVerifiedPurchase: hasPurchased
    };

    try {
      await setDoc(doc(db, 'reviews', reviewId), reviewData);
      setNewComment('');
      setNewRating(5);
      await fetchReviewsOnce();
    } catch (err: any) {
      console.error("[SUBMIT_REVIEW_ERROR]", err);
      setReviewError("Failed to publish your review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Compile full list of reviews from Firestore
  const allReviews = [...reviews];

  // Dynamic Rating stats
  const averageRating = allReviews.length > 0 
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length 
    : 0;

  // Compile unique images list
  const gallery = [product.image, ...(product.images || [])].filter((val, idx, self) => val && self.indexOf(val) === idx);
  const currentShowcase = activeImgUrl && gallery.includes(activeImgUrl) ? activeImgUrl : product.image;

  const relatedProducts = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="w-full bg-slate-50 animate-fade-in text-slate-800 flex-grow py-6 sm:py-10 px-4">
      <div className="bg-white rounded-2xl max-w-6xl mx-auto w-full shadow-sm relative flex flex-col border border-slate-200">
        
        {/* Close Button -> Back Button */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold text-sm cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200"
          >
            <ChevronLeft size={16} />
            Back to Catalog
          </button>
        </div>

        {/* Top Product Content: split columns */}
        <div className="flex flex-col md:flex-row w-full shrink-0">
          {/* Left column: Image showcase & Gallery list */}
        <div className="md:w-1/2 bg-slate-50 flex flex-col items-center justify-start p-6 sm:p-10 border-b md:border-b-0 md:border-r border-slate-200 gap-6 md:sticky md:top-24 self-start">
          <div className="relative aspect-square w-full max-w-[420px] rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white flex items-center justify-center">
            
            {/* Mobile Swipe Gallery */}
            <div 
              className="md:hidden flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
              onScroll={(e) => {
                const target = e.currentTarget;
                const index = Math.round(target.scrollLeft / target.clientWidth);
                if (index !== activeIndex && index >= 0 && index < gallery.length) {
                  setActiveIndex(index);
                  setActiveImgUrl(gallery[index]);
                }
              }}
            >
              {gallery.map((imgUrl, i) => (
                <div key={i} className="w-full h-full shrink-0 snap-center flex items-center justify-center p-4">
                  <img 
                    src={imgUrl} 
                    alt={`${product.name} view ${i + 1}`}
                    className="object-contain w-full h-full max-h-full max-w-full opacity-95"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>

            {/* Desktop Static Showcase */}
            <div className="hidden md:flex w-full h-full items-center justify-center p-4">
              <img 
                src={currentShowcase} 
                alt={product.name}
                className="object-contain w-full h-full max-h-full max-w-full opacity-95 transition-all duration-350"
                referrerPolicy="no-referrer"
              />
            </div>

            {product.discountPercent > 0 && (
              <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded-sm shadow-sm z-10 font-sans">
                -{product.discountPercent}% Promo
              </span>
            )}

            {/* Pagination dots for mobile swipe gallery */}
            {gallery.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/30 backdrop-blur-xs px-2.5 py-1 rounded-full z-10 md:hidden">
                {gallery.map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      activeIndex === i ? 'w-3.5 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails grid */}
          {gallery.length > 1 && (
            <div className="w-full max-w-[320px] space-y-1.5 hidden md:block">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-sans">Product Gallery:</span>
              <div className="grid grid-cols-4 gap-2">
                {gallery.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveImgUrl(imgUrl);
                      setActiveIndex(i);
                    }}
                    className={`aspect-square rounded-lg overflow-hidden border-2 bg-white transition-all cursor-pointer ${
                      currentShowcase === imgUrl 
                        ? 'border-brand ring-2 ring-brand/10' 
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`Thumbnail ${i + 1}`} 
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Content information */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between text-slate-600 bg-white">
          <div className="flex-1 flex flex-col">
            <span className="text-xs uppercase tracking-widest text-brand font-bold font-sans">{product.category}</span>
            <h2 className="text-lg font-display font-bold text-slate-900 leading-snug mt-1 mb-1">{product.name}</h2>
            
            {/* Rating summary */}
            {allReviews.length > 0 ? (
              <button 
                onClick={() => setActiveTab('reviews')}
                className="flex items-center gap-1.5 mb-3 hover:opacity-85 transition-opacity cursor-pointer text-left w-fit"
              >
                <div className="flex items-center text-brand">
                  <Star size={14} fill="currentColor" />
                  <span className="text-xs font-bold ml-1 text-slate-700">{averageRating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-bold underline font-sans">{allReviews.length} Verified Reviews</span>
              </button>
            ) : (
              <div className="mb-3 text-xs text-slate-400 italic">No ratings yet</div>
            )}

            {/* Pricing block */}
            <div className="bg-slate-50 p-3 rounded-xl mb-4 flex items-center justify-between border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block tracking-wider font-semibold font-sans">Premium Cost</span>
                <span className="text-lg font-bold font-mono text-slate-900">{formatNaira(product.price)}</span>
                {product.discountPercent > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono line-through ml-2 block sm:inline">
                    Was {formatNaira(product.originalPrice)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block tracking-wider font-semibold font-sans">Stock Status</span>
                <span className={`text-xs font-bold font-sans ${product.stock > 10 ? 'text-emerald-600' : 'text-brand'}`}>
                  {product.stock > 0 ? `${product.stock} units available` : 'Call for Inventory'}
                </span>
              </div>
            </div>

            {/* Responsive Tabs Row */}
            <div className="flex border-b border-slate-200 mb-4 text-[10px] font-black uppercase tracking-widest font-sans">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 pr-4 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'details' 
                    ? 'border-brand text-slate-950 font-black' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🎒 Specs & Info
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-2 px-4 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reviews' 
                    ? 'border-brand text-slate-950 font-black' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                💬 Customer Feedbacks ({allReviews.length})
              </button>
            </div>

            {/* Tab content 1: Details */}
            {activeTab === 'details' && (
              <div className="space-y-4 animate-fade-in">
                {/* Product description */}
                <p className="text-xs text-slate-600 leading-relaxed font-sans">{product.description}</p>

                {/* Bullet features */}
                <div>
                  <span className="text-xs font-bold font-display text-slate-800 block mb-1.5 font-sans">Key Capabilities:</span>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4 leading-relaxed font-sans">
                    {product.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>

                {/* Technical specs */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold font-display text-slate-800 block mb-2 font-sans">Specifications:</span>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-600 border border-slate-200/80">
                    {Object.entries(product.specs).map(([key, val]) => (
                      <div key={key} className="flex flex-col border-b border-slate-200/50 pb-1">
                        <span className="text-slate-400 font-medium text-[9.5px] leading-tight font-sans">{key}</span>
                        <span className="text-slate-800 font-semibold truncate font-sans">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Brand guarantees */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-[9px] text-slate-500 text-center uppercase tracking-wider font-semibold font-sans">
                  <div className="flex flex-col items-center">
                    <ShieldCheck className="text-brand mb-1" size={15} />
                    <span>5 Yr Inverter Cert</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Wrench className="text-slate-500 mb-1" size={15} />
                    <span>SkyIT Install</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Truck className="text-brand mb-1" size={15} />
                    <span>Heavy Cargo Safe</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab content 2: Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
                {/* List Container */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {allReviews.map((rev) => (
                    <div key={rev.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs font-sans">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <span className="font-bold text-slate-800 block leading-tight">{rev.userName}</span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {new Date(rev.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                size={11} 
                                fill={i < rev.rating ? "currentColor" : "none"} 
                                stroke={i < rev.rating ? "none" : "currentColor"} 
                              />
                            ))}
                          </div>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider scale-90 origin-right border border-emerald-200">
                              <Check size={8} className="stroke-[4]" /> Verified Buyer
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed italic">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>

                {/* Review Lock check or Form */}
                {auth.currentUser ? (
                  hasPurchased ? (
                    /* User IS logged in AND has purchased this product */
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-800 block mb-1 font-sans">Write a Verified Review</span>
                      {reviewError && (
                        <div className="bg-red-50 text-red-700 text-[10px] p-2 rounded-lg mb-2 flex items-center gap-1.5 border border-red-200 font-sans">
                          <AlertCircle size={12} />
                          <span>{reviewError}</span>
                        </div>
                      )}
                      <form onSubmit={handleSubmitReview} className="space-y-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Your Rating:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((starValue) => (
                              <button
                                key={starValue}
                                type="button"
                                onClick={() => setNewRating(starValue)}
                                className="text-amber-500 hover:scale-115 transition-transform cursor-pointer"
                              >
                                <Star 
                                  size={16} 
                                  fill={starValue <= newRating ? "currentColor" : "none"} 
                                  stroke={starValue <= newRating ? "none" : "currentColor"} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your experience (e.g. durability, Solar backup power length, installation quality...)"
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-slate-50 focus:bg-white transition-all text-slate-800 min-h-[50px]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          {submittingReview ? "Publishing rating..." : "Publish Review"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* User IS logged in, but has NOT purchased this product */
                    <div className="mt-4 pt-3 border-t border-slate-100 bg-amber-50/40 p-2.5 rounded-lg border border-amber-200/60 text-center space-y-1">
                      <AlertCircle size={14} className="text-amber-500 mx-auto" />
                      <p className="text-[10px] text-amber-900 font-bold leading-none font-sans">Verified purchase only</p>
                      <p className="text-[9px] text-amber-600/90 leading-snug font-sans">
                        Only verified customers who have bought this product can leave a rating. We found no past orders matching this product ID for <strong>{auth.currentUser.email}</strong>.
                      </p>
                    </div>
                  )
                ) : (
                  /* User is NOT logged in */
                  <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center space-y-1">
                    <Lock size={14} className="text-slate-400 mx-auto" strokeWidth={2.5} />
                    <p className="text-[10px] text-slate-700 font-bold leading-none font-sans">Ratings restricted</p>
                    <p className="text-[9px] text-slate-400 leading-snug font-sans">
                      Please log in with Google to post stars and comments. Only customers who have ordered this custom item previously are permitted to submit evaluations.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity selector & Add trigger (Sticky Bottom) */}
          <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-100">
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
              <button 
                onClick={() => setQty(prev => Math.max(1, prev - 1))}
                className="px-3 py-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 border-r border-slate-200 transition-colors cursor-pointer font-sans"
              >
                -
              </button>
              <span className="px-4 py-1 text-xs font-bold font-mono text-slate-800">{qty}</span>
              <button 
                onClick={() => setQty(prev => Math.min(product.stock, prev + 1))}
                className="px-3 py-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 border-l border-slate-200 transition-colors cursor-pointer font-sans"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={product.stock <= 0}
              className={`flex-1 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10.5px] font-black uppercase tracking-widest py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer font-sans ${
                isAdded ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10' : 'bg-brand hover:bg-brand-hover'
              }`}
            >
              {isAdded ? (
                <>
                  <Check size={15} strokeWidth={3} className="text-white animate-bounce" />
                  <span>Added to Cart ✓</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={15} strokeWidth={2.5} />
                  <span>Add to Cart - {formatNaira(product.price * qty)}</span>
                </>
              )}
            </button>
          </div>

        </div>
        </div>

        {/* Bottom Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="w-full bg-slate-50 border-t border-slate-200 p-5 sm:p-7 shrink-0 rounded-b-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4 font-sans uppercase tracking-wider">You might also like in {product.category}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map(rp => (
                <div 
                  key={rp.id}
                  onClick={() => onViewProduct(rp)}
                  className="bg-white p-3 border border-slate-200 rounded-xl hover:border-brand hover:shadow-md transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center p-2 mb-1 overflow-hidden relative">
                    <img src={rp.image} alt={rp.name} className="object-contain w-full h-full max-h-24 mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                    {rp.discountPercent > 0 && (
                      <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm">
                        -{rp.discountPercent}%
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight line-clamp-2 min-h-[30px] font-sans group-hover:text-brand transition-colors">{rp.name}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 mb-1 font-sans">{rp.brand}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 items-end">
                        <span className="text-sm font-black font-mono text-slate-900 leading-none">
                          ₦{Math.round(rp.price * (1 - rp.discountPercent / 100)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
