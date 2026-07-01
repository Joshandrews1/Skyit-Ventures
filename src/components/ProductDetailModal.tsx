import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect } from 'react';
import { Product, Review } from '../types';
import { 
  X, Star, ShoppingCart, ShieldCheck, Truck, Wrench, MessageSquare, Check, 
  Lock, AlertCircle, ChevronLeft, Edit, Save, Loader2, Plus, Upload 
} from 'lucide-react';
import { db, auth, logAuditEvent } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';

interface ProductDetailModalProps {
  product: Product | null;
  allProducts: Product[];
  onViewProduct: (product: Product) => void;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  isAdmin?: boolean;
  onRefreshProducts?: () => void;
}


export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
  product, allProducts, onViewProduct, onClose, onAddToCart, isAdmin, onRefreshProducts 
}) => {
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

  // Inline edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState(product?.name || '');
  const [editCategory, setEditCategory] = useState(product?.category || 'Solar Panels');
  const [editPrice, setEditPrice] = useState(product?.price || 0);
  const [editOriginalPrice, setEditOriginalPrice] = useState(product?.originalPrice || 0);
  const [editDiscountPercent, setEditDiscountPercent] = useState(product?.discountPercent || 0);
  const [editStock, setEditStock] = useState(product?.stock || 0);
  const [editDescription, setEditDescription] = useState(product?.description || '');
  const [editFeatures, setEditFeatures] = useState<string[]>(product?.features || []);
  const [editSpecs, setEditSpecs] = useState<{ key: string; value: string }[]>(
    product?.specs ? Object.entries(product.specs).map(([key, value]) => ({ key, value })) : []
  );
  const [editImage, setEditImage] = useState(product?.image || '');
  const [editImages, setEditImages] = useState<string[]>(product?.images || []);
  const [newExtraUrl, setNewExtraUrl] = useState('');
  const [compressingExtra, setCompressingExtra] = useState(false);
  const [compressingMain, setCompressingMain] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Helper functions for image management
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleExtraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressingExtra(true);
    setEditError('');
    try {
      const listPromise = Array.from(files).map(file => compressImage(file as File));
      const optimizedBase64s = await Promise.all(listPromise);
      setEditImages(prev => [...prev, ...optimizedBase64s].slice(0, 8));
    } catch (err: any) {
      setEditError("Extra Image optimization: " + (err?.message || "Invalid file format."));
    } finally {
      setCompressingExtra(false);
    }
  };

  const handleMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressingMain(true);
    setEditError('');
    try {
      const file = files[0];
      const optimizedBase64 = await compressImage(file);
      setEditImage(optimizedBase64);
    } catch (err: any) {
      setEditError("Main Image optimization: " + (err?.message || "Invalid file format."));
    } finally {
      setCompressingMain(false);
    }
  };

  const handleAddExtraUrl = () => {
    if (!newExtraUrl.trim()) return;
    if (!newExtraUrl.trim().startsWith('http') && !newExtraUrl.trim().startsWith('data:image')) {
      setEditError("Please enter a valid image Web Link URL starting with http.");
      return;
    }
    setEditImages(prev => [...prev, newExtraUrl.trim()].slice(0, 8));
    setNewExtraUrl('');
  };

  const handleRemoveExtraImage = (index: number) => {
    setEditImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Synchronize edit state when product updates
  useEffect(() => {
    if (product) {
      setEditName(product.name);
      setEditCategory(product.category);
      setEditPrice(product.price);
      setEditOriginalPrice(product.originalPrice);
      setEditDiscountPercent(product.discountPercent);
      setEditStock(product.stock);
      setEditDescription(product.description);
      setEditFeatures(product.features || []);
      setEditSpecs(product.specs ? Object.entries(product.specs).map(([key, value]) => ({ key, value })) : []);
      setEditImage(product.image);
      setEditImages(product.images || []);
      setIsEditMode(false);
      setEditError(null);
      setEditSuccess(null);
    }
  }, [product]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!editName.trim()) {
      setEditError("Product name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setEditError(null);
    setEditSuccess(null);

    // Build specs object from the editSpecs list
    const specsObject: Record<string, string> = {};
    editSpecs.forEach(item => {
      if (item.key.trim() && item.value.trim()) {
        specsObject[item.key.trim()] = item.value.trim();
      }
    });

    const updatedProduct: Product = {
      ...product,
      name: editName.trim(),
      category: editCategory,
      price: editPrice,
      originalPrice: editOriginalPrice,
      discountPercent: editDiscountPercent,
      stock: editStock,
      description: editDescription.trim(),
      features: editFeatures.filter(f => f.trim() !== ''),
      specs: specsObject,
      image: editImage.trim(),
      images: editImages
    };

    try {
      // Save directly to Firestore 'products' collection
      await setDoc(doc(db, 'products', product.id), updatedProduct);

      // Log audit event
      await logAuditEvent(
        'UPDATE_PRODUCT',
        product.id,
        'product',
        `Direct inline edit: updated details and specifications for product ID: ${product.id} (${editName.trim()})`
      );

      setEditSuccess("🎉 Product successfully updated!");
      
      // Refresh the products list in App
      if (onRefreshProducts) {
        onRefreshProducts();
      }

      // Exit edit mode after a brief delay
      setTimeout(() => {
        setIsEditMode(false);
        setEditSuccess(null);
      }, 1500);

    } catch (err: any) {
      console.error("[SAVE_INLINE_PRODUCT_ERROR]", err);
      setEditError("Failed to update product database record. Please verify permissions.");
    } finally {
      setIsSaving(false);
    }
  };

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

          {isAdmin && (
            <button
              onClick={() => setIsEditMode(prev => !prev)}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                isEditMode 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Edit size={13} />
              <span>{isEditMode ? 'Exit Edit Mode' : 'Admin Edit Product'}</span>
            </button>
          )}
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
          {isEditMode ? (
            <form onSubmit={handleSaveChanges} className="flex-1 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span>✏️ Edit Mode Active</span>
                  </h3>
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-sm font-semibold">Direct Firestore Update</span>
                </div>

                {editError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{editError}</span>
                  </div>
                )}

                {editSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-2">
                    <Check size={14} className="stroke-[3]" />
                    <span>{editSuccess}</span>
                  </div>
                )}

                {/* Product Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Product Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-850 rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Category slot</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-850 font-extrabold rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
                  >
                    <option value="Solar Panels">Solar Panels</option>
                    <option value="Inverters">Inverters</option>
                    <option value="Batteries">Batteries</option>
                    <option value="Security Systems">Security Systems</option>
                    <option value="Smart Home">Smart Home</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                {/* Pricing & Stock Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Selling Price (₦)</label>
                    <input 
                      type="number" 
                      value={editPrice || ''}
                      onChange={(e) => setEditPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Original Price (₦)</label>
                    <input 
                      type="number" 
                      value={editOriginalPrice || ''}
                      onChange={(e) => setEditOriginalPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-455 tracking-wider">Discount %</label>
                    <input 
                      type="number" 
                      value={editDiscountPercent || ''}
                      onChange={(e) => setEditDiscountPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-455 tracking-wider">Available Stock</label>
                    <input 
                      type="number" 
                      value={editStock}
                      onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Overview Description</label>
                  <textarea 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl p-2.5 focus:border-brand focus:outline-hidden leading-relaxed"
                    required
                  />
                </div>

                {/* Main Product Image Setup */}
                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/50">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider block">1. Main Cover Image</span>
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-100/50 transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1">
                      {compressingMain ? (
                        <Loader2 size={18} className="animate-spin text-brand" />
                      ) : (
                        <Upload size={18} className="text-indigo-500" />
                      )}
                      <span className="text-[11px] font-bold text-slate-700">Replace Cover Photo</span>
                      <span className="text-[9px] text-slate-400">Click to upload JPG, PNG or WebP</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Or Paste Web URL Link:</span>
                    <input 
                      type="text" 
                      value={editImage}
                      onChange={(e) => setEditImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-50 border border-slate-200 text-[11px] p-2 rounded-lg focus:border-brand focus:outline-hidden font-mono"
                      required
                    />
                  </div>
                  {editImage && (
                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mt-2">
                       <img src={editImage} alt="Cover Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>

                {/* Gallery Image Setup block */}
                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/50">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider block">2. Auxiliary Gallery Images</span>
                  
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-100/50 transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleExtraFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <Plus size={18} className="text-indigo-500" />
                      <span className="text-[11px] font-bold text-slate-700">Upload Gallery Photos</span>
                      <span className="text-[9px] text-slate-400">Add multiple extra images together</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Or Add Custom Image URL Link:</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newExtraUrl}
                        onChange={(e) => setNewExtraUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/promo..."
                        className="flex-1 bg-slate-50 border border-slate-200 text-[11px] p-2 rounded-lg focus:border-brand focus:outline-hidden font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddExtraUrl}
                        className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 rounded-lg uppercase tracking-wider"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Extra previews carousel grid */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Active Gallery ({editImages.length}/8):</span>
                    {compressingExtra ? (
                      <div className="flex items-center gap-1 text-slate-450">
                        <Loader2 size={12} className="animate-spin text-brand" />
                        <span className="text-[9px] uppercase font-bold">Compressing Extra Images...</span>
                      </div>
                    ) : editImages.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic block pb-1">No additional slides configured yet.</span>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {editImages.map((img, index) => (
                          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img 
                              src={img} 
                              alt={`Slide ${index + 1}`} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraImage(index)}
                              className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black"
                              title="Remove picture"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Capabilities / Features */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Key Capabilities ({editFeatures.length})</label>
                    <button 
                      type="button" 
                      onClick={() => setEditFeatures(prev => [...prev, ''])}
                      className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded font-bold cursor-pointer"
                    >
                      + Add Capability
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFeatures.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={feat}
                          onChange={(e) => {
                            const updated = [...editFeatures];
                            updated[i] = e.target.value;
                            setEditFeatures(updated);
                          }}
                          placeholder={`Capability ${i + 1}`}
                          className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg p-2 focus:border-brand focus:outline-hidden"
                        />
                        <button 
                          type="button" 
                          onClick={() => setEditFeatures(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specifications */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Specifications ({editSpecs.length})</label>
                    <button 
                      type="button" 
                      onClick={() => setEditSpecs(prev => [...prev, { key: '', value: '' }])}
                      className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded font-bold cursor-pointer"
                    >
                      + Add Spec Row
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editSpecs.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={spec.key}
                          onChange={(e) => {
                            const updated = [...editSpecs];
                            updated[i].key = e.target.value;
                            setEditSpecs(updated);
                          }}
                          placeholder="Key"
                          className="w-1/2 bg-slate-50 border border-slate-200 text-xs text-slate-850 rounded-lg p-2 focus:border-brand focus:outline-hidden font-semibold"
                        />
                        <input 
                          type="text" 
                          value={spec.value}
                          onChange={(e) => {
                            const updated = [...editSpecs];
                            updated[i].value = e.target.value;
                            setEditSpecs(updated);
                          }}
                          placeholder="Value"
                          className="w-1/2 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg p-2 focus:border-brand focus:outline-hidden"
                        />
                        <button 
                          type="button" 
                          onClick={() => setEditSpecs(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Buttons Footer */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditMode(false);
                    setEditError(null);
                    setEditSuccess(null);
                  }}
                  disabled={isSaving}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
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
            </>
          )}
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
