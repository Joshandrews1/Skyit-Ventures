import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { db, logAuditEvent } from '../firebase';
import { mockProducts } from '../data/products';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Check, 
  RefreshCw, 
  ArrowRight,
  Package,
  Image as ImageIcon,
  DollarSign,
  Layers,
  Archive,
  Star,
  Settings,
  Info,
  Edit,
  Download,
  Search
} from 'lucide-react';

interface CatalogManagerProps {
  onProductUploaded?: () => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ onProductUploaded }) => {
  // Products management list
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [listQuery, setListQuery] = useState('');

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [newExtraUrl, setNewExtraUrl] = useState('');
  const [compressingExtra, setCompressingExtra] = useState(false);

  // Individual product form values
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Solar Panels');
  const [originalPrice, setOriginalPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [stock, setStock] = useState(25);
  const [allowCOD, setAllowCOD] = useState(true);
  const [features, setFeatures] = useState<string[]>(['', '', '']);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([
    { key: 'Brand', value: '' },
    { key: 'Warranty', value: '' }
  ]);

  // Derived price calculating
  const price = Math.round(originalPrice * (1 - discountPercent / 100));

  const fetchProductsOnce = async () => {
    setLoadingList(true);
    try {
      const ref = collection(db, 'products');
      const snap = await getDocs(ref);
      const prodItems: Product[] = [];
      snap.forEach((d) => {
        prodItems.push(d.data() as Product);
      });
      setCustomProducts(prodItems);
    } catch (e) {
      console.error("Firestore loading crashed:", e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchProductsOnce();
  }, []);

  // Helper: Client-side canvas compression & scaling
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Downscale to max 800px boundary while preserving aspect ratio
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          // Export at 82% JPEG quality (gorgeous detail, small under 100KB footprint)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Failed to render file onto canvas bounds."));
      };
      reader.onerror = (e) => reject(e);
    });
  };

  // Image upload trigger
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    setErrorMsg('');
    try {
      const optimizedBase64 = await compressImage(file);
      setImagePreview(optimizedBase64);
    } catch (err: any) {
      setErrorMsg("Image optimization: " + (err?.message || "Invalid file format."));
    } finally {
      setCompressing(false);
    }
  };

  const handleExtraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressingExtra(true);
    setErrorMsg('');
    try {
      const listPromise = Array.from(files).map(file => compressImage(file as File));
      const optimizedBase64s = await Promise.all(listPromise);
      setExtraImages(prev => [...prev, ...optimizedBase64s].slice(0, 8)); // Max 8 auxiliary images
    } catch (err: any) {
      setErrorMsg("Extra Image optimization: " + (err?.message || "Invalid file format."));
    } finally {
      setCompressingExtra(false);
    }
  };

  const handleAddExtraUrl = () => {
    if (!newExtraUrl.trim()) return;
    if (!newExtraUrl.trim().startsWith('http') && !newExtraUrl.trim().startsWith('data:image')) {
      setErrorMsg("Please enter a valid image Web Link URL starting with http.");
      return;
    }
    setExtraImages(prev => [...prev, newExtraUrl.trim()].slice(0, 8));
    setNewExtraUrl('');
  };

  const handleRemoveExtraImage = (index: number) => {
    setExtraImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Agent API Call: Suggest structured form based on simple user instructions
  const handleAiRetrieve = async () => {
    if (!aiDraft.trim()) {
      setErrorMsg("Please enter a short description first to prompt the AI helper.");
      return;
    }

    setIsAiGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/suggest-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftPrompt: aiDraft })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to contact backend generator.");
      }

      const generated: Partial<Product> = await res.json();

      // Hydrate state properties
      if (generated.name) setName(generated.name);
      if (generated.description) setDescription(generated.description);
      if (generated.category) setCategory(generated.category);
      if (generated.originalPrice) setOriginalPrice(generated.originalPrice);
      if (generated.discountPercent !== undefined) setDiscountPercent(generated.discountPercent);
      if (generated.stock) setStock(generated.stock);
      
      if (generated.features) {
        setFeatures(generated.features);
      }
      if (generated.specs) {
        const mappedSpecs = Object.entries(generated.specs).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        setSpecs(mappedSpecs);
      }
      if (generated.image) {
        setImagePreview(generated.image);
      }
      if (generated.images && Array.isArray(generated.images)) {
        setExtraImages(generated.images);
      } else {
        setExtraImages([]);
      }

      setSuccessMsg("✨ AI Catalog Specialist successfully pre-filled your catalog entry fields with multiple images! Review and customize as needed.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("AI Assistant Failure: " + (err.message || "Failed to process natural language request."));
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Form management helpers
  const handleAddFeatureField = () => setFeatures([...features, '']);
  const handleRemoveFeatureField = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };
  const handleFeatureChange = (idx: number, val: string) => {
    const updated = [...features];
    updated[idx] = val;
    setFeatures(updated);
  };

  const handleAddSpecField = () => setSpecs([...specs, { key: '', value: '' }]);
  const handleRemoveSpecField = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx));
  };
  const handleSpecChange = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...specs];
    updated[idx][field] = val;
    setSpecs(updated);
  };

  // Commit dynamic product upload to Firestore catalog
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg("Product display name is required.");
    if (!description.trim()) return setErrorMsg("Product overview description is required.");
    if (price <= 0) return setErrorMsg("Selling price must be greater than zero.");
    if (!imagePreview) return setErrorMsg("A product image (file upload or online URL link) is required.");

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const productId = editingProduct ? editingProduct.id : `custom-${Date.now()}`;
    
    // Package features & specs cleanly
    const filteredFeatures = features.filter(f => f.trim() !== '');
    const mappedSpecsObject: Record<string, string> = {};
    specs.forEach(s => {
      if (s.key.trim() && s.value.trim()) {
        mappedSpecsObject[s.key.trim()] = s.value.trim();
      }
    });

    const newProductPayload: Product = {
      id: productId,
      name: name.trim(),
      description: description.trim(),
      category: category,
      price: price,
      originalPrice: originalPrice,
      discountPercent: discountPercent,
      rating: editingProduct ? editingProduct.rating : 5.0,
      ratingCount: editingProduct ? editingProduct.ratingCount : 1,
      image: imagePreview,
      images: [imagePreview, ...extraImages].filter(Boolean),
      features: filteredFeatures.length > 0 ? filteredFeatures : ["Heavy-duty performance guarantees", "Premium quality build design"],
      specs: mappedSpecsObject,
      stock: stock,
      allowCOD: allowCOD
    };

    try {
      await setDoc(doc(db, 'products', productId), newProductPayload);

      // Log product publishing / update
      await logAuditEvent(
        editingProduct ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
        productId,
        'product',
        `${editingProduct ? 'Updated details and configuration for' : 'Created new product element:'} ${name.trim()} (Price: ₦${price.toLocaleString()})`
      );

      setSuccessMsg(editingProduct 
        ? "🎉 Product details successfully updated and saved!" 
        : "🎉 Product successfully published into Live Catalog database!"
      );
      
      // Clear form
      setName('');
      setDescription('');
      setCategory('Solar Panels');
      setOriginalPrice(0);
      setDiscountPercent(0);
      setStock(25);
      setAllowCOD(true);
      setImagePreview('');
      setExtraImages([]);
      setNewExtraUrl('');
      setFeatures(['', '', '']);
      setSpecs([
        { key: 'Brand', value: '' },
        { key: 'Warranty', value: '' }
      ]);
      setAiDraft('');
      setEditingProduct(null);
      await fetchProductsOnce();
      
      if (onProductUploaded) onProductUploaded();
    } catch (err: any) {
      console.error("Firestore Publish error:", err);
      setErrorMsg("Failed to write product document: " + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product from the live catalog?")) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await deleteDoc(doc(db, 'products', id));
      await fetchProductsOnce();

      // Log the product deletion
      await logAuditEvent(
        'DELETE_PRODUCT',
        id,
        'product',
        `Permanently removed product ${id} from live catalog catalog`
      );

      setSuccessMsg("Product successfully removed from live database catalog.");
    } catch (err: any) {
      setErrorMsg("Failed to delete product: " + err.message);
    }
  };

  // Compile unique active list of all available catalog items: Custom (Firestore) first, then static mockProducts
  const allShownProducts = React.useMemo(() => {
    const list = [...customProducts];
    mockProducts.forEach((mp) => {
      if (!list.some(p => p.id === mp.id)) {
        list.push(mp);
      }
    });

    if (!listQuery.trim()) return list;
    const q = listQuery.toLowerCase();
    return list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    );
  }, [customProducts, listQuery]);

  const downloadProductsCSV = () => {
    const listToExport = [...customProducts];
    mockProducts.forEach((mp) => {
      if (!listToExport.some(p => p.id === mp.id)) {
        listToExport.push(mp);
      }
    });

    const headers = ['ID', 'Name', 'Category', 'Price_NGN', 'Original_Price_NGN', 'Discount_Percent', 'Stock_Available', 'Rating', 'Source'];
    const csvRows = listToExport.map(p => {
      const isCustom = customProducts.some(cp => cp.id === p.id);
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category.replace(/"/g, '""')}"`,
        p.price,
        p.originalPrice,
        p.discountPercent,
        p.stock,
        p.rating.toFixed(1),
        isCustom ? 'Firestore Catalog Custom' : 'Default Preset'
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `skyit_ventures_products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setDescription(prod.description);
    setCategory(prod.category);
    setOriginalPrice(prod.originalPrice);
    setDiscountPercent(prod.discountPercent);
    setStock(prod.stock);
    setAllowCOD(prod.allowCOD ?? true);
    setImagePreview(prod.image || '');
    setExtraImages(prod.images || [prod.image].filter(Boolean));
    setFeatures(prod.features && prod.features.length ? [...prod.features] : ['', '', '']);
    
    const mappedSpecs = Object.entries(prod.specs || {}).map(([key, value]) => ({ key, value }));
    setSpecs(mappedSpecs.length ? mappedSpecs : [{ key: 'Brand', value: '' }, { key: 'Warranty', value: '' }]);
    
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pt-4">
      
      {/* LEFT COLUMN: UPLOAD PRODUCT WORKSPACE (lg:col-span-7) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Gemini Catalog AI Assistant Card */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles size={80} />
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-indigo-500/20 text-indigo-300 p-2 rounded-xl mt-1 shrink-0">
              <Sparkles size={18} className="fill-indigo-400" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm tracking-tight text-white">Gemini Catalog Writer Assistant</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Type simple specs and click "Auto-fill". We will automatically write the sales copy, select professional stock pictures, calibrate the category, and formulate perfect technical specifications!
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <textarea
              value={aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              placeholder="e.g. Add an enterprise-grade 10KVA Pure Sine Wave Inverter, Brand is SunVolt, original price ₦1,850,000, features 20% promotional discount..."
              rows={3}
              className="w-full bg-slate-950/70 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl p-3 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none leading-relaxed font-sans"
            />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-[10px] text-slate-400">
                💡 Natural language inputs support any specification detail.
              </span>
              <button
                type="button"
                onClick={handleAiRetrieve}
                disabled={isAiGenerating || compressing}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 cursor-pointer text-white"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Analyzing Draft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="fill-white" />
                    <span>Auto-Fill Form via AI Writer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Core Manual & AI Controlled Form */}
        <form onSubmit={handlePublish} className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-3xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Package size={16} className={editingProduct ? "text-amber-500 animate-pulse" : "text-brand"} />
              <span>{editingProduct ? `Edit Product: ${editingProduct.name}` : "Product Identity & Pricing Form"}</span>
            </h3>
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
              {editingProduct ? "✏️ Edit Mode Active" : "Complete Manual Control"}
            </span>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-xs flex gap-2 items-center">
              <Check size={14} className="shrink-0 bg-emerald-500 text-white rounded-full p-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl text-xs">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Row 1: Name and Category */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="display name e.g. Voltaic Lithium wall 5KWH"
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Category slot</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 font-extrabold rounded-xl p-2.5 focus:border-brand focus:outline-hidden"
              >
                <option value="Solar Panels">Solar Panels</option>
                <option value="Inverters">Inverters</option>
                <option value="Batteries">Batteries</option>
                <option value="Security Systems">Security Systems</option>
                <option value="Smart Home">Smart Home</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Market Overview description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a compelling commercial and engineering description of the product and its target performance environment..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-xl focus:border-brand focus:outline-hidden leading-relaxed"
              required
            />
          </div>

          {/* Row 3: Pricing, Stock, and COD Toggle */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 bg-slate-50/50 p-3 sm:p-4 rounded-2xl border border-slate-200/60">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1">
                <DollarSign size={10} />
                <span>Base Price (₦)</span>
              </label>
              <input
                type="number"
                value={originalPrice || ''}
                onChange={(e) => setOriginalPrice(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="400000"
                className="w-full bg-white border border-slate-200 text-xs font-mono rounded-xl p-2 focus:border-brand focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Discount (%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="95"
                  value={discountPercent || '0'}
                  onChange={(e) => setDiscountPercent(Math.min(95, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-white border border-slate-200 text-xs font-mono rounded-xl p-2 focus:border-brand focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider text-indigo-600 font-extrabold font-sans">Computed (₦)</label>
              <div className="w-full bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold rounded-xl p-2 border border-slate-200 text-slate-800">
                ₦{price.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Stock qty</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white border border-slate-200 text-xs font-mono rounded-xl p-2 focus:border-brand focus:outline-hidden"
              />
            </div>

            <div className="col-span-2 lg:col-span-1 space-y-1 flex flex-col justify-between">
              <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Payment Limit</label>
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2 transition-colors select-none h-[34px] sm:h-auto">
                <input
                  type="checkbox"
                  checked={allowCOD}
                  onChange={(e) => setAllowCOD(e.target.checked)}
                  className="w-3.5 h-3.5 text-brand rounded focus:ring-brand accent-indigo-600 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700">Allow COD</span>
              </label>
            </div>
          </div>

          {/* Row 4: Image Selector and Optimizations */}
          <div className="space-y-4 bg-slate-50/40 p-4 rounded-2xl border border-slate-200/60 font-sans">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-550 tracking-wider block mb-0.5">Product Picture Setup</span>
              <p className="text-[10px] text-slate-450 leading-normal">Configure the primary catalog cover photograph followed by optional gallery views for maximum customer immersion.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Cover Image Setup block */}
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/50">
                <span className="text-[10px] font-bold uppercase text-brand tracking-wider block">1. Cover Image (Required)</span>
                
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-100/50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon size={18} className="text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-700">Replace Cover Photo</span>
                    <span className="text-[9px] text-slate-400">Click to upload JPG, PNG or WebP</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Or Paste Web URL Link:</span>
                  <input
                    type="text"
                    value={imagePreview}
                    onChange={(e) => setImagePreview(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-50 border border-slate-200 text-[11px] p-2 rounded-lg focus:border-brand focus:outline-hidden font-mono"
                  />
                </div>

                {/* Cover Preview slot */}
                <div className="flex items-center gap-3 pt-1">
                  {compressing ? (
                    <div className="flex items-center gap-1 text-slate-450">
                      <Loader2 size={12} className="animate-spin text-brand" />
                      <span className="text-[9px] uppercase font-bold">Compiling...</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={imagePreview} 
                        alt="Primary Preview" 
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="text-[10px] font-bold text-slate-700 block">Cover Loaded</span>
                        <span className="text-[9px] text-emerald-600 font-medium">Ready in high quality</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No cover photo set yet.</span>
                  )}
                </div>
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
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Active Gallery ({extraImages.length}/8):</span>
                  {compressingExtra ? (
                    <div className="flex items-center gap-1 text-slate-450">
                      <Loader2 size={12} className="animate-spin text-brand" />
                      <span className="text-[9px] uppercase font-bold">Compressing Extra Images...</span>
                    </div>
                  ) : extraImages.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic block pb-1">No additional slides configured yet.</span>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {extraImages.map((img, index) => (
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

            </div>

            {/* Performance information notice box */}
            <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-indigo-700" />
              <div>
                <span className="font-bold block text-indigo-800">Dynamic Multi-Image Gallery Asset Compactor Active:</span>
                Every manual file upload undergoes custom layout rendering, high-fidelity sizing and client-side quantization. This protects rapid boutique response speeds while ensuring crisp image detail in high density desktop views.
              </div>
            </div>
          </div>

          {/* Row 5: Bullet Points & Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            {/* Highlights Lists */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Selling Highlights (4-5 bullet points)</span>
                <button
                  type="button"
                  onClick={handleAddFeatureField}
                  className="text-xs text-brand hover:text-indigo-600 font-extrabold flex items-center gap-0.5"
                >
                  <Plus size={12} /> Add Row
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {features.map((feat, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-xs text-slate-350 self-center font-mono">{idx + 1}.</span>
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => handleFeatureChange(idx, e.target.value)}
                      placeholder="e.g. Smart Wi-Fi tracker metrics"
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 focus:border-brand focus:outline-hidden font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFeatureField(idx)}
                      disabled={features.length <= 1}
                      className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-2 rounded-lg disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Specs Specs */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Technical Specifications</span>
                <button
                  type="button"
                  onClick={handleAddSpecField}
                  className="text-xs text-brand hover:text-indigo-600 font-extrabold flex items-center gap-0.5"
                >
                  <Plus size={12} /> Add Row
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {specs.map((spec, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                      placeholder="e.g. Battery Voltage"
                      className="w-1/3 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg p-2 focus:border-brand focus:outline-hidden font-sans"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                      placeholder="e.g. 48V DC"
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 focus:border-brand focus:outline-hidden font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecField(idx)}
                      disabled={specs.length <= 1}
                      className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-2 rounded-lg disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Action Controls */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
            {editingProduct && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setName('');
                  setDescription('');
                  setCategory('Solar Panels');
                  setOriginalPrice(0);
                  setDiscountPercent(0);
                  setStock(25);
                  setImagePreview('');
                  setExtraImages([]);
                  setNewExtraUrl('');
                  setFeatures(['', '', '']);
                  setSpecs([
                    { key: 'Brand', value: '' },
                    { key: 'Warranty', value: '' }
                  ]);
                  setAllowCOD(true);
                  setAiDraft('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-full sm:w-auto text-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all"
              >
                Cancel Edit
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || compressing}
              className={`${
                editingProduct ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand hover:bg-slate-900'
              } disabled:bg-slate-400 w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-black tracking-wide uppercase text-white transition-all flex items-center justify-center gap-2 cursor-pointer`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{editingProduct ? 'Saving details...' : 'Publishing document...'}</span>
                </>
              ) : (
                <>
                  {editingProduct ? <Edit size={14} /> : <Plus size={14} />}
                  <span>{editingProduct ? 'Save Product Changes' : 'Publish Into Store Catalog'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>

      {/* RIGHT COLUMN: REVIEWS ACTIVE CUSTOM PRODUCTS (lg:col-span-12) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-50 border border-slate-250 rounded-3xl p-4 sm:p-5 shadow-3xs space-y-4">
          
          {/* Header & CSV Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider flex items-center gap-1.5 matches-draft">
                <Archive size={14} className="text-slate-500" />
                <span>Manage Store Catalog ({allShownProducts.length})</span>
              </h3>
              <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                See, search, and edit active products.
              </p>
            </div>
            
            <button
              type="button"
              onClick={downloadProductsCSV}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 self-start sm:self-auto transition-all shadow-xs"
              title="Download full catalog as spreadsheet"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Search bar inside admin list */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
            <input
              type="text"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Search active catalog products by keyword..."
              className="w-full bg-white border border-slate-200 rounded-xl p-2 pl-9 text-xs text-slate-800 placeholder-slate-450 focus:ring-1 focus:ring-brand focus:outline-hidden"
            />
            {listQuery && (
              <button
                type="button"
                onClick={() => setListQuery('')}
                className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {loadingList ? (
            <div className="py-12 text-center text-slate-450 space-y-1.5">
              <Loader2 size={20} className="animate-spin mx-auto text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-wider block">Querying Database Collections...</span>
            </div>
          ) : allShownProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl py-12 text-center text-slate-400 text-xs">
              🔍 No products match your search keyword.
            </div>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {allShownProducts.map((prod) => {
                const isCustom = customProducts.some(cp => cp.id === prod.id);
                return (
                  <div 
                    key={prod.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3 shadow-3xs hover:shadow-2xs transition-all flex gap-3 relative group"
                  >
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      className="w-16 h-16 object-cover rounded-xl border border-slate-100 bg-slate-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] uppercase font-bold text-brand bg-brand/5 px-2 py-0.5 rounded">
                          {prod.category}
                        </span>
                        {isCustom ? (
                          <span className="text-[8px] uppercase font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-xs">
                            Firestore Custom
                          </span>
                        ) : (
                          <span className="text-[8px] uppercase font-black text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-xs">
                            Default Preset
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-xs text-slate-800 truncate" title={prod.name}>
                        {prod.name}
                      </h4>
                      
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-extrabold text-slate-900">₦{prod.price.toLocaleString()}</span>
                        {prod.discountPercent > 0 && (
                          <>
                            <span className="text-slate-400 line-through text-[10px]">₦{prod.originalPrice.toLocaleString()}</span>
                            <span className="text-rose-500 text-[10px] font-bold">-{prod.discountPercent}%</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>📦 Stock: {prod.stock}</span>
                        <span>⭐ {prod.rating.toFixed(1)}</span>
                        <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded border ${
                          prod.allowCOD ?? true 
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                            : 'text-rose-700 bg-rose-50 border-rose-100/60'
                        }`}>
                          {prod.allowCOD ?? true ? '✓ COD Avail' : 'No COD'}
                        </span>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex flex-col gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(prod)}
                        className="text-indigo-600 hover:text-indigo-800 hover:bg-slate-100 p-2 rounded-xl transition-all"
                        title="Edit product details"
                      >
                        <Edit size={14} />
                      </button>

                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <div 
                          className="text-slate-300 p-2 cursor-not-allowed" 
                          title="Standard original product items cannot be deleted"
                        >
                          <Trash2 size={14} className="opacity-40" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
