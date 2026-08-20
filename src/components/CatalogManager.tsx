import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { db, logAuditEvent } from '../firebase';
import { mockProducts } from '../data/products';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { SolarPackage, SOLAR_PACKAGES } from '../data/quote-data';
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
  Search,
  Zap,
  Edit2,
  Tag,
  CheckSquare,
  Square,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  Eye,
  FileText,
  CheckCircle2,
  X,
  Upload,
  PlusCircle,
  Wand2,
  Play,
  Save,
  Clock,
  Maximize2,
  Minimize2,
  Camera,
  Video,
  FlipHorizontal
} from 'lucide-react';
import { FullScreenTextEditor, ExpandableTextarea } from './FullScreenTextEditor';

export interface UnmatchedItem {
  extractedName: string;
  extractedPrice: number;
  rawTextSnippet: string;
  suggestedCategory?: string;
  suggestedDescription?: string;
  suggestedSpecs?: Record<string, string>;
  reason: string;
  isAdded?: boolean;
}

export const CATEGORY_STOCK_IMAGES: Record<string, string> = {
  'Solar Panels': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800',
  'Inverters': 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800',
  'Batteries': 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800',
  'Security Systems': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800',
  'Smart Home': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800',
  'Accessories': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
};

export interface DetectedPriceUpdate {
  id: string;
  isPackage?: boolean;
  matchedName: string;
  category: string;
  currentOriginalPrice: number;
  currentDiscountPercent: number;
  currentSellingPrice: number;
  newOriginalPrice: number;
  newDiscountPercent: number;
  newSellingPrice: number;
  matchedTextSnippet: string;
  confidence: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface CatalogManagerProps {
  onProductUploaded?: () => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ onProductUploaded }) => {
  // Products management list
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [listQuery, setListQuery] = useState('');

  // Solar Packages price management states
  const [packagesList, setPackagesList] = useState<SolarPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [draftPkgPrice, setDraftPkgPrice] = useState<number>(0);
  const [savingPkgId, setSavingPkgId] = useState<string | null>(null);
  const [pkgSuccessMsg, setPkgSuccessMsg] = useState('');
  const [pkgErrorMsg, setPkgErrorMsg] = useState('');

  // Synchronize Solar Packages with real-time database listener
  useEffect(() => {
    const defaultList = [...SOLAR_PACKAGES.tubular, ...SOLAR_PACKAGES.lithium];
    const obsoleteIds = new Set(['li-1.5', 'li-2.5']);

    const unsub = onSnapshot(collection(db, 'solar_packages'), (snapshot) => {
      if (snapshot.empty) {
        defaultList.forEach((pkg) => {
          setDoc(doc(db, 'solar_packages', pkg.id), pkg).catch(err => {
            console.error("Failed to seed package on admin:", pkg.id, err);
          });
        });
        setPackagesList(defaultList);
      } else {
        const dbPackages: SolarPackage[] = [];
        snapshot.forEach((d) => {
          if (obsoleteIds.has(d.id)) {
            deleteDoc(doc(db, 'solar_packages', d.id)).catch(console.error);
          } else {
            dbPackages.push(d.data() as SolarPackage);
          }
        });

        // Ensure current default packages exist
        defaultList.forEach((defaultPkg) => {
          const existingIdx = dbPackages.findIndex(p => p.id === defaultPkg.id);
          if (existingIdx === -1) {
            setDoc(doc(db, 'solar_packages', defaultPkg.id), defaultPkg).catch(console.error);
            dbPackages.push(defaultPkg);
          }
        });

        dbPackages.sort((a, b) => a.id.localeCompare(b.id));
        setPackagesList(dbPackages);
      }
      setLoadingPkgs(false);
    }, (error) => {
      console.error("Admin packages sync error:", error);
      setPackagesList(defaultList);
      setLoadingPkgs(false);
    });

    return () => unsub();
  }, []);

  const handleSavePackagePrice = async (pkgId: string, pkgName: string) => {
    if (draftPkgPrice <= 0) {
      setPkgErrorMsg("Price must be greater than zero.");
      return;
    }
    setSavingPkgId(pkgId);
    setPkgErrorMsg('');
    setPkgSuccessMsg('');
    try {
      await updateDoc(doc(db, 'solar_packages', pkgId), {
        price: Number(draftPkgPrice)
      });
      
      await logAuditEvent(
        'UPDATE_PACKAGE_PRICE',
        pkgId,
        'quote',
        `Adjusted live pricing for turnkey package ${pkgName} to ₦${Number(draftPkgPrice).toLocaleString()}`
      );

      setPkgSuccessMsg(`🎉 Successfully updated price for "${pkgName}"!`);
      setEditingPkgId(null);
    } catch (err: any) {
      console.error("Failed to update package price:", err);
      setPkgErrorMsg("Database error: " + (err.message || String(err)));
    } finally {
      setSavingPkgId(null);
    }
  };

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [isAiPromptExpanded, setIsAiPromptExpanded] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [newExtraUrl, setNewExtraUrl] = useState('');
  const [compressingExtra, setCompressingExtra] = useState(false);

  // Mode Switcher state for Admin Catalog Workspace
  const [bulkEditMode, setBulkEditMode] = useState<boolean>(false);

  // Active Unmatched Item being edited in the Single Entry Form
  const [activeUnmatchedIndex, setActiveUnmatchedIndex] = useState<number | null>(null);

  // AI Batch Price Updater states
  const [batchRawText, setBatchRawText] = useState('');
  const [isBatchTextExpanded, setIsBatchTextExpanded] = useState(false);
  const [isDetectingBatch, setIsDetectingBatch] = useState(false);
  const [batchDetectError, setBatchDetectError] = useState('');
  const [batchSuccessMsg, setBatchSuccessMsg] = useState('');
  const [detectedUpdates, setDetectedUpdates] = useState<DetectedPriceUpdate[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedItem[]>([]);
  const [isPublishingBatch, setIsPublishingBatch] = useState(false);
  const [queueLastSaved, setQueueLastSaved] = useState<string>('');

  // Quick Add Modal state for unmatched items in Bulk mode
  const [quickAddModalItem, setQuickAddModalItem] = useState<UnmatchedItem | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalCategory, setModalCategory] = useState('Solar Panels');
  const [modalOriginalPrice, setModalOriginalPrice] = useState(0);
  const [modalDiscountPercent, setModalDiscountPercent] = useState(0);
  const [modalDescription, setModalDescription] = useState('');
  const [modalStock, setModalStock] = useState(15);
  const [modalAllowCOD, setModalAllowCOD] = useState(true);
  const [modalImage, setModalImage] = useState('');
  const [modalExtraImages, setModalExtraImages] = useState<string[]>([]);
  const [modalFeatures, setModalFeatures] = useState<string[]>(['', '', '']);
  const [modalSpecs, setModalSpecs] = useState<{ key: string; value: string }[]>([
    { key: 'Brand', value: 'SkyIT Certified' },
    { key: 'Warranty', value: '2 Years' }
  ]);
  const [modalIsSaving, setModalIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalCompressing, setModalCompressing] = useState(false);

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

  // Auto-dismiss popup notifications after 6 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 6500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (batchSuccessMsg) {
      const timer = setTimeout(() => setBatchSuccessMsg(''), 6500);
      return () => clearTimeout(timer);
    }
  }, [batchSuccessMsg]);

  useEffect(() => {
    if (batchDetectError) {
      const timer = setTimeout(() => setBatchDetectError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [batchDetectError]);

  // Escape key handler for fullscreen AI prompt modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAiPromptExpanded) {
        setIsAiPromptExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiPromptExpanded]);

  useEffect(() => {
    fetchProductsOnce();

    // Restore saved supplier batch and unmatched queue from localStorage
    try {
      const savedBatch = localStorage.getItem('skyit_admin_supplier_batch_v1');
      if (savedBatch) {
        const parsed = JSON.parse(savedBatch);
        if (parsed && Array.isArray(parsed.unmatchedItems) && parsed.unmatchedItems.length > 0) {
          setUnmatchedItems(parsed.unmatchedItems);
          if (Array.isArray(parsed.detectedUpdates)) setDetectedUpdates(parsed.detectedUpdates);
          if (typeof parsed.batchRawText === 'string') setBatchRawText(parsed.batchRawText);
          if (typeof parsed.activeUnmatchedIndex === 'number') setActiveUnmatchedIndex(parsed.activeUnmatchedIndex);
          if (parsed.savedAt) {
            const date = new Date(parsed.savedAt);
            setQueueLastSaved(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      }
    } catch (e) {
      console.warn("Could not restore supplier batch:", e);
    }
  }, []);

  // Automatically persist supplier batch & unmatched items queue whenever modified
  useEffect(() => {
    if (unmatchedItems.length > 0 || detectedUpdates.length > 0 || batchRawText.trim().length > 0) {
      try {
        const now = Date.now();
        const payload = {
          batchRawText,
          detectedUpdates,
          unmatchedItems,
          activeUnmatchedIndex,
          savedAt: now
        };
        localStorage.setItem('skyit_admin_supplier_batch_v1', JSON.stringify(payload));
        const date = new Date(now);
        setQueueLastSaved(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        console.warn("Storage auto-save error:", e);
      }
    }
  }, [unmatchedItems, detectedUpdates, batchRawText, activeUnmatchedIndex]);

  // Helper: Client-side canvas compression & scaling with ultra-light WebP quantization
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
          
          // Export as modern ultra-lightweight WebP format (75% quality for featherlight web payload)
          // WebP delivers 30-50% smaller sizes than JPEG with identical visual fidelity
          let dataUrl = canvas.toDataURL('image/webp', 0.75);
          
          // Fallback check: if browser doesn't support WebP export, canvas returns image/png or image/jpeg
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.80);
          }
          
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Failed to render file onto canvas bounds."));
      };
      reader.onerror = (e) => reject(e);
    });
  };

  // Camera Snap Feature States (for live camera photo capture)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'cover' | 'gallery' | 'modalCover' | 'modalGallery'>('cover');
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Camera Permission Dialog State (triggered when clicking upload photo to prompt for camera access or file upload)
  const [isCameraPromptOpen, setIsCameraPromptOpen] = useState(false);
  const [cameraPromptTarget, setCameraPromptTarget] = useState<'cover' | 'gallery' | 'modalCover' | 'modalGallery'>('cover');
  const coverFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Trigger permission prompt when clicking upload photo
  const handleUploadPhotoClick = (target: 'cover' | 'gallery' | 'modalCover' | 'modalGallery') => {
    setCameraPromptTarget(target);
    setIsCameraPromptOpen(true);
  };

  // User decides to launch camera after prompt
  const handleConfirmCameraAccess = () => {
    setIsCameraPromptOpen(false);
    handleOpenCamera(cameraPromptTarget);
  };

  // User chooses local file picker instead of camera
  const handleChooseLocalFile = () => {
    setIsCameraPromptOpen(false);
    if (cameraPromptTarget === 'cover') {
      coverFileInputRef.current?.click();
    } else if (cameraPromptTarget === 'gallery') {
      galleryFileInputRef.current?.click();
    } else if (cameraPromptTarget === 'modalCover') {
      modalFileInputRef.current?.click();
    }
  };

  // Start Camera with selected facing mode
  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraLoading(true);
    setCameraError('');
    
    // Stop any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser/device.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play interrupted:", e));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError("No camera hardware found on this device.");
      } else {
        setCameraError("Could not access camera: " + (err.message || "Unknown error."));
      }
    } finally {
      setCameraLoading(false);
    }
  };

  // Stop camera and cleanup media stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
    setCameraError('');
  };

  // Toggle between Rear ('environment') and Front ('user') camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Open camera for specific target slot
  const handleOpenCamera = (target: 'cover' | 'gallery' | 'modalCover' | 'modalGallery') => {
    setCameraTarget(target);
    setIsCameraModalOpen(true);
    startCamera(cameraFacingMode);
  };

  // Capture frame from active video stream and compress to base64
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera is still warming up. Please try snapping in a moment.");
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;

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
        throw new Error("Could not create canvas context for snap.");
      }

      // If front camera, mirror image back for natural perspective
      if (cameraFacingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);
      
      // Export snapshot as modern ultra-lightweight WebP format (75% quality)
      let dataUrl = canvas.toDataURL('image/webp', 0.75);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.80);
      }

      // Assign to the appropriate image target
      if (cameraTarget === 'cover') {
        setImagePreview(dataUrl);
        setSuccessMsg("📸 Photo captured as ultra-light WebP and set as primary cover!");
      } else if (cameraTarget === 'gallery') {
        setExtraImages(prev => [...prev, dataUrl].slice(0, 8));
        setSuccessMsg("📸 Photo captured as ultra-light WebP and added to gallery!");
      } else if (cameraTarget === 'modalCover') {
        setModalImage(dataUrl);
      } else if (cameraTarget === 'modalGallery') {
        setModalExtraImages(prev => [...prev, dataUrl].slice(0, 8));
      }

      // Close camera modal
      stopCamera();
    } catch (err: any) {
      console.error("Snap photo error:", err);
      setCameraError("Failed to snap photo: " + (err.message || "Unknown error."));
    }
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
      setIsAiPromptExpanded(false);
      setTimeout(() => {
        const formEl = document.getElementById('single-product-form');
        if (formEl) {
          formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
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

      // If this product was loaded from the unmatched supplier queue, mark it as completed
      if (activeUnmatchedIndex !== null && unmatchedItems[activeUnmatchedIndex]) {
        const publishedItem = unmatchedItems[activeUnmatchedIndex];
        const updatedList = unmatchedItems.map((u, i) => 
          (i === activeUnmatchedIndex || u.extractedName === publishedItem.extractedName) 
            ? { ...u, isAdded: true } 
            : u
        );
        setUnmatchedItems(updatedList);

        // Find next remaining unmatched item
        const nextRemainingIndex = updatedList.findIndex(u => !u.isAdded);
        if (nextRemainingIndex !== -1) {
          const nextItem = updatedList[nextRemainingIndex];
          setActiveUnmatchedIndex(nextRemainingIndex);
          setName(nextItem.extractedName || '');
          const nextCat = nextItem.suggestedCategory || 'Solar Panels';
          setCategory(nextCat);
          const nextOrig = nextItem.extractedPrice > 0 ? nextItem.extractedPrice : 50000;
          setOriginalPrice(nextOrig);
          setDiscountPercent(0);
          setDescription(
            nextItem.suggestedDescription || 
            `High-performance ${nextItem.extractedName} engineered for reliable residential and commercial power solutions across Nigeria.`
          );
          setStock(15);
          setAllowCOD(true);
          setImagePreview(''); // Blank for verified photo
          setExtraImages([]);
          setNewExtraUrl('');
          setFeatures([
            'Heavy-duty industrial build quality',
            'Optimized for Nigerian tropical climate & power conditions',
            'Full manufacturer warranty and SkyIT technical support'
          ]);
          if (nextItem.suggestedSpecs && Object.keys(nextItem.suggestedSpecs).length > 0) {
            setSpecs(Object.entries(nextItem.suggestedSpecs).map(([key, value]) => ({ key, value: String(value) })));
          } else {
            setSpecs([
              { key: 'Brand', value: 'SkyIT Certified' },
              { key: 'Warranty', value: '2 Years' }
            ]);
          }
          setAiDraft('');
          setEditingProduct(null);
          await fetchProductsOnce();
          if (onProductUploaded) onProductUploaded();
          setTimeout(() => {
            const formEl = document.getElementById('single-product-form');
            if (formEl) {
              formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 60);
          setSuccessMsg(`🎉 "${publishedItem.extractedName}" saved! Now loaded next supplier item: "${nextItem.extractedName}". Please upload its verified image.`);
          return;
        } else {
          setActiveUnmatchedIndex(null);
          setSuccessMsg(`🎉 All unmatched supplier items have been successfully customized and published to the live store catalog!`);
        }
      }
      
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

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'ID',
      'Name',
      'Category',
      'Price_NGN',
      'Original_Price_NGN',
      'Discount_Percent',
      'Stock_Available',
      'Allow_COD',
      'Image_Primary_URL',
      'Additional_Image_URLs',
      'All_Images_List',
      'Description',
      'Features',
      'Specifications',
      'Rating',
      'Rating_Count',
      'Source'
    ];

    const csvRows = listToExport.map(p => {
      const isCustom = customProducts.some(cp => cp.id === p.id);
      const primaryImage = p.image || (p.images && p.images[0]) || '';
      
      // All unique image URLs
      const allImagesArray = Array.from(
        new Set([p.image, ...(p.images || [])].filter((img): img is string => Boolean(img && img.trim())))
      );
      
      // Additional images (excluding the primary one)
      const additionalImages = allImagesArray.filter(img => img !== primaryImage);

      const featuresString = (p.features || []).filter(Boolean).join('; ');
      
      const specsString = p.specs 
        ? Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('; ')
        : '';

      return [
        escapeCsv(p.id),
        escapeCsv(p.name),
        escapeCsv(p.category),
        p.price,
        p.originalPrice || p.price,
        p.discountPercent || 0,
        p.stock ?? 10,
        p.allowCOD !== false ? 'TRUE' : 'FALSE',
        escapeCsv(primaryImage),
        escapeCsv(additionalImages.join('; ')),
        escapeCsv(allImagesArray.join('; ')),
        escapeCsv(p.description || ''),
        escapeCsv(featuresString),
        escapeCsv(specsString),
        (p.rating || 5.0).toFixed(1),
        p.ratingCount || 1,
        escapeCsv(isCustom ? 'Firestore Catalog Custom' : 'Default Preset')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `skyit_ventures_catalog_products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStartEdit = (prod: Product) => {
    setBulkEditMode(false);
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
    
    setTimeout(() => {
      const formEl = document.getElementById('single-product-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // AI Batch Price Updates Handlers
  const handleDetectPrices = async () => {
    if (!batchRawText.trim()) {
      setBatchDetectError("Please paste a product price list or supplier text before clicking detect.");
      return;
    }

    setIsDetectingBatch(true);
    setBatchDetectError('');
    setBatchSuccessMsg('');
    setUnmatchedItems([]);

    try {
      const catalogSummary = [
        ...allShownProducts.map(p => ({
          id: p.id,
          isPackage: false,
          name: p.name,
          category: p.category,
          originalPrice: p.originalPrice,
          discountPercent: p.discountPercent,
          price: p.price
        })),
        ...packagesList.map(pkg => ({
          id: pkg.id,
          isPackage: true,
          name: pkg.name,
          category: 'Solar Packages',
          originalPrice: pkg.price,
          discountPercent: 0,
          price: pkg.price
        }))
      ];

      const res = await fetch('/api/admin/batch-detect-price-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pastedText: batchRawText,
          catalogItems: catalogSummary
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze price list.");
      }

      const data = await res.json();
      const list: DetectedPriceUpdate[] = (data.detected || []).map((item: any) => ({
        ...item,
        selected: true
      }));
      const unmatchedList: UnmatchedItem[] = data.unmatched || [];

      setDetectedUpdates(list);
      setUnmatchedItems(unmatchedList);

      if (list.length === 0 && unmatchedList.length === 0) {
        setBatchDetectError("No products, solar packages, or price updates were detected in the pasted text.");
      } else if (list.length === 0 && unmatchedList.length > 0) {
        setBatchDetectError(`⚠️ None of the ${unmatchedList.length} product(s) in your text exist in your store catalog. See missing items list below.`);
      } else {
        setBatchSuccessMsg(`✨ AI matched ${list.length} catalog item(s)! Review changes below before publishing to live store.`);
      }
    } catch (err: any) {
      console.error("Batch price detect error:", err);
      setBatchDetectError("AI Detection Error: " + (err.message || String(err)));
    } finally {
      setIsDetectingBatch(false);
    }
  };

  const handlePasteSampleBatch = () => {
    const sample = `--- SkyIT Price Revision List (August 2026) ---
1. Felicity 550W Mono Solar Panel - N135,000 (10% promo discount)
2. Deye 5KVA Hybrid Inverter N620,000
3. Luminous 220Ah 12V Tall Tubular Battery - ₦275,000
4. Smart CCTV Outdoor Security Camera - ₦38,000
5. Turnkey 5KVA Solar System Package - ₦2,450,000`;
    setBatchRawText(sample);
    setBatchDetectError('');
  };

  const handleUpdateDetectedItemField = (index: number, field: 'newOriginalPrice' | 'newDiscountPercent', value: number) => {
    setDetectedUpdates(prev => {
      const copy = [...prev];
      const item = { ...copy[index] };
      if (field === 'newOriginalPrice') {
        item.newOriginalPrice = Math.max(0, value);
      } else if (field === 'newDiscountPercent') {
        item.newDiscountPercent = Math.min(100, Math.max(0, value));
      }
      item.newSellingPrice = Math.round(item.newOriginalPrice * (1 - item.newDiscountPercent / 100));
      copy[index] = item;
      return copy;
    });
  };

  const handleToggleSelectItem = (id: string) => {
    setDetectedUpdates(prev => prev.map(u => u.id === id ? { ...u, selected: !u.selected } : u));
  };

  const handleToggleSelectAll = (select: boolean) => {
    setDetectedUpdates(prev => prev.map(u => ({ ...u, selected: select })));
  };

  const handleApplyBatchPrices = async () => {
    const selectedUpdates = detectedUpdates.filter(u => u.selected);
    if (selectedUpdates.length === 0) {
      setBatchDetectError("Please select at least one item to publish.");
      return;
    }

    setIsPublishingBatch(true);
    setBatchDetectError('');
    setBatchSuccessMsg('');

    try {
      let updatedCount = 0;
      for (const update of selectedUpdates) {
        if (update.isPackage) {
          await setDoc(doc(db, 'solar_packages', update.id), { price: update.newSellingPrice }, { merge: true });
          await logAuditEvent(
            'UPDATE_PACKAGE_PRICE',
            update.id,
            'quote',
            `AI Batch Update: Adjusted price for ${update.matchedName} to ₦${update.newSellingPrice.toLocaleString()}`
          );
          updatedCount++;
        } else {
          const existingCustom = customProducts.find(p => p.id === update.id);
          const existingMock = mockProducts.find(p => p.id === update.id);
          const baseProduct = existingCustom || existingMock;

          if (baseProduct) {
            const updatedProduct: Product = {
              ...baseProduct,
              originalPrice: update.newOriginalPrice,
              discountPercent: update.newDiscountPercent,
              price: update.newSellingPrice
            };
            await setDoc(doc(db, 'products', update.id), updatedProduct);
            await logAuditEvent(
              'UPDATE_PRODUCT_PRICE',
              update.id,
              'product',
              `AI Batch Update: Adjusted price for ${update.matchedName} to ₦${update.newSellingPrice.toLocaleString()} (was ₦${update.currentSellingPrice.toLocaleString()})`
            );
            updatedCount++;
          }
        }
      }

      setBatchSuccessMsg(`🎉 Successfully published ${updatedCount} price updates live to the store catalog!`);
      setDetectedUpdates([]);
      setBatchRawText('');
      await fetchProductsOnce();
      if (onProductUploaded) onProductUploaded();
    } catch (err: any) {
      console.error("Batch publish error:", err);
      setBatchDetectError("Failed to publish price updates: " + (err.message || String(err)));
    } finally {
      setIsPublishingBatch(false);
    }
  };

  // Load an unmatched supplier item directly into the Single Entry Form
  const handleLoadUnmatchedIntoSingleForm = (itemIndex: number) => {
    const item = unmatchedItems[itemIndex];
    if (!item) return;

    setActiveUnmatchedIndex(itemIndex);
    setEditingProduct(null); // Clear edit mode for existing catalog item
    setBulkEditMode(false); // Switch to single form view

    // Pre-populate all extracted fields into the Single Entry Form
    setName(item.extractedName || '');
    const cat = item.suggestedCategory || 'Solar Panels';
    setCategory(cat);
    const orig = item.extractedPrice > 0 ? item.extractedPrice : 50000;
    setOriginalPrice(orig);
    setDiscountPercent(0);
    setDescription(
      item.suggestedDescription || 
      `High-performance ${item.extractedName} engineered for reliable residential and commercial power solutions across Nigeria.`
    );
    setStock(15);
    setAllowCOD(true);
    setImagePreview(''); // Blank so admin uploads the true photo
    setExtraImages([]);
    setNewExtraUrl('');
    setFeatures([
      'Heavy-duty industrial build quality',
      'Optimized for Nigerian tropical climate & power conditions',
      'Full manufacturer warranty and SkyIT technical support'
    ]);

    if (item.suggestedSpecs && Object.keys(item.suggestedSpecs).length > 0) {
      setSpecs(Object.entries(item.suggestedSpecs).map(([key, value]) => ({ key, value: String(value) })));
    } else {
      setSpecs([
        { key: 'Brand', value: 'SkyIT Certified' },
        { key: 'Warranty', value: '2 Years' }
      ]);
    }

    setErrorMsg('');
    setSuccessMsg(`Loaded "${item.extractedName}" from your supplier list! Please upload the verified product photo below and click Publish.`);
    setTimeout(() => {
      const formEl = document.getElementById('single-product-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleResumeNextUnmatched = () => {
    const nextIdx = unmatchedItems.findIndex(u => !u.isAdded);
    if (nextIdx !== -1) {
      handleLoadUnmatchedIntoSingleForm(nextIdx);
    } else {
      setSuccessMsg("All unmatched supplier items have already been published!");
    }
  };

  const handleClearSupplierQueue = () => {
    if (window.confirm("Are you sure you want to clear this supplier items queue? Any unsaved progress in this queue will be removed.")) {
      setUnmatchedItems([]);
      setActiveUnmatchedIndex(null);
      setDetectedUpdates([]);
      setBatchRawText('');
      setQueueLastSaved('');
      localStorage.removeItem('skyit_admin_supplier_batch_v1');
      setSuccessMsg("Supplier items queue cleared.");
    }
  };

  // Quick Add Modal & Handlers for Unmatched Items (Admin must verify & supply product photo)
  const handleOpenQuickAddModal = (item: UnmatchedItem) => {
    setQuickAddModalItem(item);
    setModalName(item.extractedName || '');
    const cat = item.suggestedCategory || 'Solar Panels';
    setModalCategory(cat);
    setModalOriginalPrice(item.extractedPrice > 0 ? item.extractedPrice : 50000);
    setModalDiscountPercent(0);
    setModalDescription(
      item.suggestedDescription || 
      `High-performance ${item.extractedName} engineered for reliable residential and commercial power solutions across Nigeria.`
    );
    setModalStock(15);
    setModalAllowCOD(true);
    setModalImage(''); // Intentionally blank so admin uploads the true product photo
    setModalExtraImages([]);
    setModalFeatures([
      'Heavy-duty industrial build quality',
      'Optimized for Nigerian tropical climate & power conditions',
      'Full manufacturer warranty and SkyIT technical support'
    ]);
    
    if (item.suggestedSpecs && Object.keys(item.suggestedSpecs).length > 0) {
      setModalSpecs(Object.entries(item.suggestedSpecs).map(([key, value]) => ({ key, value: String(value) })));
    } else {
      setModalSpecs([
        { key: 'Brand', value: 'SkyIT Certified' },
        { key: 'Warranty', value: '2 Years' }
      ]);
    }
    setModalError('');
  };

  const handleModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalCompressing(true);
    setModalError('');
    try {
      const optimizedBase64 = await compressImage(file);
      setModalImage(optimizedBase64);
    } catch (err: any) {
      setModalError("Image error: " + (err?.message || "Invalid file"));
    } finally {
      setModalCompressing(false);
    }
  };

  const handleAddModalSpec = () => setModalSpecs(prev => [...prev, { key: '', value: '' }]);
  const handleRemoveModalSpec = (idx: number) => setModalSpecs(prev => prev.filter((_, i) => i !== idx));
  const handleModalSpecChange = (idx: number, field: 'key' | 'value', val: string) => {
    setModalSpecs(prev => {
      const copy = [...prev];
      copy[idx][field] = val;
      return copy;
    });
  };

  const handleAddModalFeature = () => setModalFeatures(prev => [...prev, '']);
  const handleRemoveModalFeature = (idx: number) => setModalFeatures(prev => prev.filter((_, i) => i !== idx));
  const handleModalFeatureChange = (idx: number, val: string) => {
    setModalFeatures(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleSaveModalProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      setModalError("Product name is required.");
      return;
    }
    if (modalOriginalPrice <= 0) {
      setModalError("Base price must be greater than 0.");
      return;
    }
    if (!modalImage.trim()) {
      setModalError("Please upload or provide a verified photo for this product.");
      return;
    }
    const finalPrice = Math.round(modalOriginalPrice * (1 - modalDiscountPercent / 100));
    if (finalPrice <= 0) {
      setModalError("Calculated selling price must be greater than 0.");
      return;
    }

    setModalIsSaving(true);
    setModalError('');

    try {
      const newId = `custom-${Date.now()}`;
      const mappedSpecsObject: Record<string, string> = {};
      modalSpecs.forEach(s => {
        if (s.key.trim() && s.value.trim()) {
          mappedSpecsObject[s.key.trim()] = s.value.trim();
        }
      });
      const filteredFeatures = modalFeatures.filter(f => f.trim() !== '');

      const payload: Product = {
        id: newId,
        name: modalName.trim(),
        description: modalDescription.trim() || `High-performance ${modalName.trim()} engineered for reliable solar and energy backup applications.`,
        category: modalCategory,
        price: finalPrice,
        originalPrice: modalOriginalPrice,
        discountPercent: modalDiscountPercent,
        stock: modalStock,
        rating: 5.0,
        ratingCount: 1,
        image: modalImage.trim(),
        images: [modalImage.trim(), ...modalExtraImages].filter(Boolean),
        features: filteredFeatures.length > 0 ? filteredFeatures : ["Heavy-duty performance guarantees", "Premium quality build design"],
        specs: mappedSpecsObject,
        allowCOD: modalAllowCOD
      };

      await setDoc(doc(db, 'products', newId), payload);
      await logAuditEvent(
        'CREATE_PRODUCT_FROM_BULK',
        newId,
        'product',
        `Added unmatched product from AI Bulk Price list: ${modalName.trim()} (Price: ₦${finalPrice.toLocaleString()})`
      );

      // Live update states
      setCustomProducts(prev => [payload, ...prev]);
      setUnmatchedItems(prev => prev.map(u => 
        (u.extractedName === quickAddModalItem?.extractedName || u.rawTextSnippet === quickAddModalItem?.rawTextSnippet)
          ? { ...u, isAdded: true }
          : u
      ));
      if (onProductUploaded) onProductUploaded();
      setBatchSuccessMsg(`🎉 Successfully uploaded "${modalName.trim()}" with verified photo to your live store!`);
      setQuickAddModalItem(null);
    } catch (err: any) {
      console.error("Failed to add product from bulk:", err);
      setModalError("Failed to save product: " + (err.message || String(err)));
    } finally {
      setModalIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pt-4">
      
      {/* LEFT COLUMN: UPLOAD PRODUCT WORKSPACE (lg:col-span-7) */}
      <div className="lg:col-span-7 space-y-6">

        {/* ===================================================================== */}
        {/* CATALOG WORKSPACE MODE SWITCHER BAR */}
        {/* ===================================================================== */}
        <div className="bg-[#171b27] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-2xl border transition-all shrink-0 ${
              bulkEditMode 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
            }`}>
              {bulkEditMode ? <Tag size={20} className="text-amber-400" /> : <Plus size={20} className="text-indigo-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-sm sm:text-base text-white tracking-tight">
                  {bulkEditMode ? 'AI Bulk Price Updater Mode' : 'Product Catalog Management'}
                </h2>
                <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                  bulkEditMode 
                    ? 'bg-amber-400/20 border-amber-400/40 text-amber-300' 
                    : 'bg-indigo-400/20 border-indigo-400/40 text-indigo-300'
                }`}>
                  {bulkEditMode ? 'Batch Prices' : 'Single Entry'}
                </span>
              </div>
              <p className="text-xs text-[#8e95b0] mt-1 leading-relaxed">
                {bulkEditMode 
                  ? 'Paste raw supplier price lists or invoices. AI matches items and lets you review changes before publishing live.'
                  : 'Add new products, edit individual items, or use Gemini AI sales copywriter.'}
              </p>
            </div>
          </div>

          {/* Mode Switch Pills Underneath */}
          <div className="flex items-center gap-2 bg-[#0e131e] p-1.5 rounded-2xl border border-white/10 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setBulkEditMode(false)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
                !bulkEditMode 
                  ? 'bg-[#0066ff] text-white shadow-md shadow-blue-500/20' 
                  : 'text-[#8e95b0] hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus size={14} className="shrink-0" />
              <span>Single Entry</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkEditMode(true)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
                bulkEditMode 
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-[#8e95b0] hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={14} className={`shrink-0 ${bulkEditMode ? 'fill-amber-300 text-amber-300' : ''}`} />
              <span>Bulk Price Edit</span>
              {detectedUpdates.length > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full shrink-0">
                  {detectedUpdates.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* MODE 1: AI INTELLIGENT BULK PRICE UPDATER */}
        {/* ===================================================================== */}
        {bulkEditMode ? (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 border border-indigo-500/30 shadow-2xl space-y-5 relative overflow-hidden">
            {/* Subtle decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 border border-indigo-400/30 p-2.5 rounded-2xl text-indigo-300 shrink-0">
                  <Tag size={22} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                    <span>AI Intelligent Bulk Price Updater</span>
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-300 bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded-full">
                      AI Auto-Detect
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Paste supplier price lists, quotes, or invoice text. AI automatically detects matching catalog items, extracts new prices, and lets you review changes before publishing!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePasteSampleBatch}
                className="self-start sm:self-auto text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Click to populate with sample supplier pricelist text"
              >
                <FileText size={13} className="text-amber-400" />
                <span>Paste Sample Pricelist</span>
              </button>
            </div>

          {/* Input Textarea & Action Bar */}
          <div className="space-y-3">
            <div className="relative group">
              <textarea
                value={batchRawText}
                onChange={(e) => setBatchRawText(e.target.value)}
                placeholder="Paste supplier pricelist, invoice text, or price notes here...&#10;e.g.&#10;1. Felicity Solar 550W Mono Panel - ₦135,000 (10% promo)&#10;2. Deye 5KVA Hybrid Inverter - ₦620,000&#10;3. Luminous 220Ah Tubular Battery - ₦275,000"
                rows={4}
                className="w-full bg-slate-950/80 border border-indigo-500/30 text-xs sm:text-sm text-slate-100 placeholder-slate-400 rounded-2xl p-4 pr-24 focus:outline-hidden focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors font-mono leading-relaxed resize-y"
              />
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsBatchTextExpanded(true)}
                  className="text-amber-400 hover:text-slate-950 text-xs font-bold bg-slate-900/90 hover:bg-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Expand to full blank page editor"
                >
                  <Maximize2 size={12} />
                  <span className="hidden sm:inline">Expand</span>
                </button>
                {batchRawText && (
                  <button
                    type="button"
                    onClick={() => { setBatchRawText(''); setDetectedUpdates([]); setUnmatchedItems([]); setBatchDetectError(''); setBatchSuccessMsg(''); }}
                    className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Full Blank Page Editor for Bulk Supplier Pricelist */}
            <FullScreenTextEditor
              isOpen={isBatchTextExpanded}
              onClose={() => setIsBatchTextExpanded(false)}
              title="Bulk Supplier Pricelist & Invoices — Full Blank Page"
              subtitle="Paste raw WhatsApp supplier text, messy invoices, or multi-page price catalogs"
              value={batchRawText}
              onChange={setBatchRawText}
              placeholder="Paste raw supplier pricelist, invoice text, or price notes here...

e.g.
1. Felicity Solar 550W Mono Panel - ₦135,000 (10% promo)
2. Deye 5KVA Hybrid Inverter - ₦620,000
3. Luminous 220Ah Tubular Battery - ₦275,000"
              primaryActionLabel="Detect Prices via AI"
              onPrimaryAction={() => {
                setIsBatchTextExpanded(false);
                handleDetectPrices();
              }}
              isPrimaryActionLoading={isDetectingBatch}
              primaryActionIcon={<Sparkles size={15} className="fill-slate-950 text-slate-950" />}
            />

            {/* Notifications */}
            {batchDetectError && (
              <div className="p-3.5 bg-rose-950/80 border-2 border-rose-500 text-rose-100 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-rose-400 stroke-[2.5]" />
                  <span className="font-bold">{batchDetectError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchDetectError('')}
                  className="text-rose-300 hover:text-white p-1 rounded-lg hover:bg-rose-900/50 cursor-pointer shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {batchSuccessMsg && (
              <div className="p-3.5 bg-[#0e131e] border-2 border-emerald-400 text-emerald-200 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-400 stroke-[2.5]" />
                  <span className="font-bold text-white">{batchSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchSuccessMsg('')}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Unmatched Products Notice Banner & Action Deck */}
            {unmatchedItems.length > 0 && (
              <div className="p-4 sm:p-5 bg-gradient-to-b from-amber-950/90 via-slate-950 to-slate-950 border-2 border-amber-500/80 rounded-3xl text-amber-100 text-xs space-y-4 shadow-2xl animate-fadeIn">
                <div className="flex items-start gap-3 pb-3 border-b border-amber-500/30">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shrink-0">
                    <AlertTriangle size={22} className="text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-amber-300 flex items-center gap-2">
                      <span>⚠️ {unmatchedItems.length} Supplier Item(s) NOT in Your Catalog</span>
                    </h4>
                    <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                      These products were extracted from your supplier list but do not exist in your store yet. To ensure product imagery is 100% accurate, click <strong className="text-amber-300 font-extrabold">"Customize & Upload"</strong> on each item to review pre-filled AI details, upload the verified product photo, and publish live.
                    </p>
                  </div>
                </div>

                {/* Interactive Unmatched Items List */}
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {unmatchedItems.map((un, uIdx) => {
                    const isAdded = !!un.isAdded;
                    const cat = un.suggestedCategory || 'Solar Panels';

                    return (
                      <div 
                        key={uIdx} 
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isAdded 
                            ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-100 shadow-md' 
                            : 'bg-slate-900/90 border-slate-700 hover:border-amber-400/60 shadow-md'
                        }`}
                      >
                        {/* Item Details */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm sm:text-base text-white tracking-wide">{un.extractedName || 'Unknown Product'}</span>
                            <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-md font-mono shadow-xs">
                              {cat}
                            </span>
                            {un.extractedPrice > 0 && (
                              <span className="bg-slate-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-md font-mono font-black text-xs">
                                ₦{un.extractedPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {un.rawTextSnippet && (
                            <p className="text-[11px] text-slate-300 font-mono italic truncate max-w-lg">
                              Supplier Line: "{un.rawTextSnippet}"
                            </p>
                          )}
                        </div>

                        {/* Action Control */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                          {isAdded ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 px-3.5 py-2 rounded-xl text-xs font-black font-mono">
                              <CheckCircle2 size={16} className="text-emerald-400" />
                              <span>Live in Catalog</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLoadUnmatchedIntoSingleForm(uIdx)}
                              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 uppercase tracking-wider"
                              title="Switch to Single Entry form with pre-filled details to verify photo and save to catalog"
                            >
                              <Plus size={16} className="stroke-[3]" />
                              <span>Customize in Single Entry</span>
                              <ArrowRight size={14} className="stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-[11px] text-slate-400 font-medium">
                ⚡ Supports Naira prices (e.g. ₦150k, 150000, N150,000), discounts %, and solar packages.
              </span>

              <button
                type="button"
                onClick={handleDetectPrices}
                disabled={isDetectingBatch || !batchRawText.trim()}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider shrink-0"
              >
                {isDetectingBatch ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>AI Analyzing & Matching Products...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-300 fill-amber-300" />
                    <span>Detect Product Prices via AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* REVIEW PREVIEW TABLE (SHOWS BEFORE PUBLISHING) */}
          {/* ===================================================================== */}
          {detectedUpdates.length > 0 && (
            <div className="mt-6 pt-5 border-t border-indigo-500/20 space-y-4 animate-fadeIn">
              
              {/* Review Header Stats Bar */}
              <div className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Eye size={16} className="text-amber-400" />
                    <span>Review Detected Price Updates ({detectedUpdates.length} items)</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Carefully review the detected price changes below. You can tweak prices or uncheck any item before publishing live.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-bold border border-slate-700 cursor-pointer"
                  >
                    Select All ({detectedUpdates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold border border-slate-700 cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Items Review List / Cards */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {detectedUpdates.map((item, idx) => {
                  const diff = item.newSellingPrice - item.currentSellingPrice;
                  const percentDiff = item.currentSellingPrice > 0 ? ((diff / item.currentSellingPrice) * 100).toFixed(1) : '0.0';

                  return (
                    <div
                      key={item.id + '-' + idx}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        item.selected
                          ? 'bg-slate-950/90 border-indigo-400/60 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 opacity-65'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectItem(item.id)}
                            className="mt-0.5 shrink-0 cursor-pointer text-indigo-400 hover:text-indigo-300"
                          >
                            {item.selected ? (
                              <CheckSquare size={18} className="text-amber-400 fill-amber-400/20" />
                            ) : (
                              <Square size={18} className="text-slate-500" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-white">{item.matchedName}</span>
                              <span className="text-[10px] font-extrabold uppercase bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-2 py-0.5 rounded-md">
                                {item.category}
                              </span>
                              {item.isPackage && (
                                <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded-md">
                                  Solar Package
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 italic font-mono">
                              Parsed from: "{item.matchedTextSnippet}"
                            </p>
                          </div>
                        </div>

                        {/* Variance badge */}
                        <div className="shrink-0">
                          {diff > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-xl">
                              <TrendingUp size={14} />
                              <span>+₦{diff.toLocaleString()} (+{percentDiff}%)</span>
                            </span>
                          ) : diff < 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-rose-400 bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-xl">
                              <TrendingDown size={14} />
                              <span>-₦{Math.abs(diff).toLocaleString()} ({percentDiff}%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl">
                              <span>No Change</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing Comparison & Tweak Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                        {/* Current Store Price */}
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Store Price</span>
                          <span className="font-mono font-extrabold text-slate-300 block mt-0.5">
                            ₦{item.currentSellingPrice.toLocaleString()}
                          </span>
                        </div>

                        {/* Editable Base Price */}
                        <div>
                          <label className="text-[10px] text-amber-300 font-bold uppercase block">
                            Detected Base Price (₦)
                          </label>
                          <input
                            type="number"
                            value={item.newOriginalPrice}
                            onChange={(e) => handleUpdateDetectedItemField(idx, 'newOriginalPrice', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono font-bold mt-0.5 focus:border-amber-400 focus:outline-hidden"
                          />
                        </div>

                        {/* Editable Discount % & New Selling Price */}
                        <div>
                          <label className="text-[10px] text-emerald-300 font-bold uppercase block">
                            New Selling Price (Discount {item.newDiscountPercent}%)
                          </label>
                          <div className="flex items-center gap-2 mt-0.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={item.newDiscountPercent}
                              onChange={(e) => handleUpdateDetectedItemField(idx, 'newDiscountPercent', Number(e.target.value))}
                              title="Promo Discount %"
                              className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-rose-300 font-mono font-bold focus:border-emerald-400 focus:outline-hidden shrink-0"
                            />
                            <span className="font-mono font-extrabold text-emerald-400 text-sm truncate">
                              = ₦{item.newSellingPrice.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Publish Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDetectedUpdates([])}
                  className="w-full sm:w-auto text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Discard List
                </button>

                <button
                  type="button"
                  onClick={handleApplyBatchPrices}
                  disabled={isPublishingBatch || detectedUpdates.filter(u => u.selected).length === 0}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPublishingBatch ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Publishing Price Updates...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} className="text-white" />
                      <span>Publish {detectedUpdates.filter(u => u.selected).length} Price Updates to Live Store Catalog</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
        ) : (
        <>
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
            <div className="relative group">
              <textarea
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                placeholder="e.g. Add an enterprise-grade 10KVA Pure Sine Wave Inverter, Brand is SunVolt, original price ₦1,850,000, features 20% promotional discount..."
                rows={3}
                className="w-full bg-slate-950/70 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl p-3 pr-10 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-y min-h-[80px] leading-relaxed font-sans"
              />
              <button
                type="button"
                onClick={() => setIsAiPromptExpanded(true)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/90 hover:bg-amber-400 hover:text-slate-950 text-slate-400 border border-slate-700 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
                title="Expand to Full Blank Page"
              >
                <Maximize2 size={13} />
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-400">
                  💡 Natural language inputs support any specification detail.
                </span>
                {aiDraft.length > 0 && (
                  <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                    {aiDraft.length} chars
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
        </div>

        {/* Universal Full Blank Page Editor for Gemini AI Writer Prompt */}
        <FullScreenTextEditor
          isOpen={isAiPromptExpanded}
          onClose={() => setIsAiPromptExpanded(false)}
          title="Gemini Catalog AI Writer — Full Blank Page"
          subtitle="Distraction-free canvas for pasting raw invoices, equipment datasheets, or prompt notes"
          value={aiDraft}
          onChange={setAiDraft}
          placeholder="Start typing or paste your product instructions here...

Example:
Add an enterprise-grade 10KVA Pure Sine Wave Inverter, Brand is SunVolt, original price ₦1,850,000 with 15% discount. Features dual MPPT, 98% efficiency, WiFi monitoring, and 5-year manufacturer warranty."
          primaryActionLabel="Auto-Fill Catalog Form"
          onPrimaryAction={handleAiRetrieve}
          isPrimaryActionLoading={isAiGenerating}
          primaryActionIcon={<Sparkles size={15} className="fill-slate-950 text-slate-950" />}
        />

        {/* Unmatched Supplier Items Queue Banner (when unmatched items exist) */}
        {unmatchedItems.length > 0 && (() => {
          const addedCount = unmatchedItems.filter(u => u.isAdded).length;
          const totalCount = unmatchedItems.length;
          const progressPct = totalCount > 0 ? Math.round((addedCount / totalCount) * 100) : 0;
          const remainingCount = totalCount - addedCount;

          return (
            <div className="bg-gradient-to-b from-amber-950/95 via-slate-950 to-slate-950 border-2 border-amber-500 rounded-3xl p-4 sm:p-5 shadow-2xl text-xs space-y-4 animate-fadeIn ring-1 ring-amber-500/20">
              {/* Header & Main Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 shadow-md shrink-0 font-black">
                    <AlertTriangle size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-black text-sm sm:text-base text-amber-300 tracking-wide">
                        Unmatched Supplier Items Queue
                      </h4>
                      <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-md font-mono shadow-xs">
                        {addedCount}/{totalCount} Added ({progressPct}%)
                      </span>
                      {queueLastSaved && (
                        <span className="inline-flex items-center gap-1 bg-slate-900 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono">
                          <Save size={11} className="text-emerald-400" />
                          <span>Auto-saved at {queueLastSaved}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-100/90 mt-0.5 leading-relaxed">
                      Your supplier batch progress is saved automatically. Select any item to upload its verified image and publish to store.
                    </p>
                  </div>
                </div>

                {/* Actions Deck */}
                <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                  {remainingCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResumeNextUnmatched}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 uppercase tracking-wider shrink-0"
                      title="Load next uncompleted supplier item into the form"
                    >
                      <Play size={13} className="fill-slate-950 stroke-[2.5]" />
                      <span>Resume Next ({remainingCount} Left)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setBulkEditMode(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/50 px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowRight size={14} className="rotate-180 stroke-[2.5]" />
                    <span>Return to Bulk Updater</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearSupplierQueue}
                    className="bg-slate-950 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/50 p-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    title="Clear saved queue"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Clear Queue</span>
                  </button>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div 
                  className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.max(progressPct, 2)}%` }}
                />
              </div>

              {/* Interactive Horizontal / Grid Queue Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {unmatchedItems.map((item, idx) => {
                  const isCurrent = activeUnmatchedIndex === idx;
                  const isAdded = !!item.isAdded;
                  const cat = item.suggestedCategory || 'Product';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => !isAdded && handleLoadUnmatchedIntoSingleForm(idx)}
                      disabled={isAdded}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-md ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300 font-extrabold shadow-lg scale-[1.01]'
                          : isAdded
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 opacity-60 cursor-not-allowed'
                            : 'bg-slate-900/90 border-slate-700 hover:border-amber-400/80 text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isCurrent ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-amber-300 border border-amber-400/30'
                          }`}>
                            {cat}
                          </span>
                          <span className={`text-xs font-black truncate ${isCurrent ? 'text-slate-950' : 'text-white'}`}>
                            {item.extractedName}
                          </span>
                        </div>
                        {item.extractedPrice > 0 && (
                          <span className={`text-xs font-mono font-black block mt-1 ${
                            isCurrent ? 'text-slate-950' : 'text-emerald-400'
                          }`}>
                            ₦{item.extractedPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isAdded ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-md text-[10px] font-black font-mono">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>Added</span>
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[10px] uppercase tracking-wider bg-slate-950 text-amber-300 font-black px-2 py-1 rounded-md shadow-xs">
                            Editing Now
                          </span>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-amber-400 group-hover:border-amber-400">
                            <ArrowRight size={14} className="stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Quick Banner to switch to Bulk Mode */}
        <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 text-slate-200">
            <Sparkles size={18} className="text-amber-400 fill-amber-400 shrink-0" />
            <div>
              <span className="font-extrabold text-white block">Updating multiple product prices at once?</span>
              <span className="text-[11px] text-slate-300">Paste your raw supplier price list or invoice to auto-detect and update catalog prices in seconds.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBulkEditMode(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wide shrink-0 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>Switch to Bulk Price Mode</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Core Manual & AI Controlled Form */}
        <form id="single-product-form" onSubmit={handlePublish} className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-3xs space-y-6 scroll-mt-24">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Package size={16} className={
                activeUnmatchedIndex !== null 
                  ? "text-amber-500 animate-bounce" 
                  : editingProduct 
                    ? "text-amber-500 animate-pulse" 
                    : "text-brand"
              } />
              <span>
                {activeUnmatchedIndex !== null && unmatchedItems[activeUnmatchedIndex]
                  ? `Customizing Supplier Item (${activeUnmatchedIndex + 1} of ${unmatchedItems.length}): ${unmatchedItems[activeUnmatchedIndex].extractedName}`
                  : editingProduct 
                    ? `Edit Product: ${editingProduct.name}` 
                    : "Product Identity & Pricing Form"
                }
              </span>
            </h3>
            <span className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 rounded-md ${
              activeUnmatchedIndex !== null
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : editingProduct
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-slate-400"
            }`}>
              {activeUnmatchedIndex !== null 
                ? "✨ Unmatched Item Queue Active" 
                : editingProduct 
                  ? "✏️ Edit Mode Active" 
                  : "Complete Manual Control"
              }
            </span>
          </div>

          {/* Floating High-Contrast Toast Notifications for Admin */}
          {(successMsg || errorMsg) && (
            <div className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] space-y-3 pointer-events-auto animate-bounce-subtle">
              {successMsg && (
                <div className="p-4 bg-[#0e131e] border-2 border-emerald-400 text-white rounded-2xl shadow-2xl flex items-start gap-3 ring-4 ring-emerald-500/20 animate-fadeIn">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shrink-0">
                    <CheckCircle2 size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="text-[11px] uppercase tracking-wider font-black text-emerald-400">
                      Catalog System Notification
                    </div>
                    <div className="text-xs font-bold text-slate-100 mt-0.5 leading-snug break-words">
                      {successMsg}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessMsg('')}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Dismiss Notification"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 bg-[#0e131e] border-2 border-rose-500 text-white rounded-2xl shadow-2xl flex items-start gap-3 ring-4 ring-rose-500/20 animate-fadeIn">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/40 shrink-0">
                    <AlertTriangle size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="text-[11px] uppercase tracking-wider font-black text-rose-400">
                      Action Required
                    </div>
                    <div className="text-xs font-bold text-rose-100 mt-0.5 leading-snug break-words">
                      {errorMsg}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMsg('')}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Dismiss Notification"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
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
          <ExpandableTextarea
            label="Market Overview description"
            modalTitle="Product Description & Market Overview"
            modalSubtitle="Provide a compelling commercial and engineering description with full blank canvas clarity"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a compelling commercial and engineering description of the product and its target performance environment..."
            rows={3}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-xl focus:border-brand focus:outline-hidden leading-relaxed resize-y min-h-[70px]"
            required
          />

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
                
                <div>
                  {/* Hidden file input for cover */}
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Upload Photo Button -> Prompts for Camera Access or File Upload */}
                  <button
                    type="button"
                    onClick={() => handleUploadPhotoClick('cover')}
                    className="w-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 text-white rounded-xl p-3.5 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer font-bold active:scale-98 shadow-sm group"
                  >
                    <div className="flex items-center gap-2 text-amber-400 group-hover:text-amber-300">
                      <Upload size={18} className="stroke-[2.5]" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">Upload Photo</span>
                    </div>
                    <span className="text-[10px] text-amber-200/90 font-medium">Use Live Device Camera or Storage</span>
                  </button>
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
                        <span className="text-[9px] text-emerald-600 font-medium">Ready in high quality WebP</span>
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
                
                <div>
                  {/* Hidden file input for gallery */}
                  <input
                    ref={galleryFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleExtraFileChange}
                    className="hidden"
                  />

                  {/* Upload Gallery Photos -> Prompts for Camera Access or File Upload */}
                  <button
                    type="button"
                    onClick={() => handleUploadPhotoClick('gallery')}
                    className="w-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 text-white rounded-xl p-3.5 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer font-bold active:scale-98 shadow-sm group"
                  >
                    <div className="flex items-center gap-2 text-amber-400 group-hover:text-amber-300">
                      <Plus size={18} className="stroke-[3]" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">Upload Photos</span>
                    </div>
                    <span className="text-[10px] text-amber-200/90 font-medium">Use Live Device Camera or Multi-File</span>
                  </button>
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
            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl text-[11px] text-emerald-950 flex items-start gap-2">
              <Zap size={14} className="mt-0.5 shrink-0 text-emerald-600 fill-emerald-600" />
              <div>
                <span className="font-bold block text-emerald-900">Ultra-Lightweight WebP Image Engine Active:</span>
                Every photo uploaded or camera snapshot is instantly converted and compressed into next-generation <strong className="font-extrabold text-emerald-800">WebP format</strong>. This reduces payload sizes by up to 50% compared to legacy JPG/PNG while preserving pristine display sharpness on all devices.
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

        {/* SOLAR PACKAGES PRICE MANAGER */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-3xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Zap size={16} className="text-brand fill-brand-light/30" />
              <span>Solar Packages Price Manager</span>
            </h3>
            <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
              Dynamically update pricing for pre-engineered turnkey hybrid packages. Changes propagate in real-time across the client catalog and calculators.
            </p>
          </div>

          {pkgSuccessMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-xs flex gap-2 items-center">
              <Check size={14} className="shrink-0 bg-emerald-500 text-white rounded-full p-0.5" />
              <span>{pkgSuccessMsg}</span>
            </div>
          )}

          {pkgErrorMsg && (
            <div className="p-3 bg-rose-50 text-rose-850 border border-rose-100 rounded-2xl text-xs">
              ⚠️ {pkgErrorMsg}
            </div>
          )}

          {loadingPkgs ? (
            <div className="py-8 text-center text-slate-400 space-y-1.5">
              <Loader2 size={16} className="animate-spin mx-auto text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-wider block">Syncing package registry...</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {packagesList.map((pkg) => {
                const isEditing = editingPkgId === pkg.id;
                return (
                  <div 
                    key={pkg.id} 
                    className="border border-slate-150 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-250 transition-all bg-slate-50/50"
                  >
                    <div className="min-w-0 flex-1 space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${
                          pkg.tech === 'lithium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-150 text-slate-700'
                        }`}>
                          {pkg.tech}
                        </span>
                        <h4 className="font-bold text-xs text-slate-800 truncate">{pkg.name}</h4>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-normal line-clamp-1">{pkg.description}</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-3xs">
                          <span className="text-xs font-bold text-slate-400 pl-1.5">₦</span>
                          <input
                            type="number"
                            value={draftPkgPrice}
                            onChange={(e) => setDraftPkgPrice(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-24 bg-transparent border-0 text-xs font-mono font-bold text-slate-850 focus:ring-0 focus:outline-hidden p-0"
                            placeholder="Price"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePackagePrice(pkg.id, pkg.name)}
                            disabled={savingPkgId === pkg.id}
                            className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer"
                            title="Save"
                          >
                            {savingPkgId === pkg.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPkgId(null)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
                            title="Cancel"
                          >
                            <span className="text-[10px] font-black px-1">✕</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-black text-slate-800">
                            ₦{pkg.price.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPkgId(pkg.id);
                              setDraftPkgPrice(pkg.price);
                              setPkgSuccessMsg('');
                              setPkgErrorMsg('');
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-brand/10 hover:text-brand text-slate-500 transition-all cursor-pointer"
                            title="Edit price"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
      )}

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

      {/* QUICK PRODUCT CREATOR MODAL FOR UNMATCHED ITEMS (ZERO CONTEXT LOSS) */}
      {quickAddModalItem && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div 
            className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto text-slate-100 animate-fadeIn flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-500/30 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 shadow-md shrink-0">
                  <Sparkles size={20} className="fill-slate-950" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>Add Unmatched Product to Catalog</span>
                  </h3>
                  <p className="text-xs text-amber-300 font-mono mt-0.5 truncate max-w-md">
                    Item: {quickAddModalItem.extractedName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModalItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                title="Close & Return to Bulk List"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveModalProduct} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-left">
              {modalError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 text-rose-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Product Name</label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white focus:outline-hidden font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Category</label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-amber-300 font-bold focus:outline-hidden"
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

              {/* Row 2: Pricing */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Base Price (₦)</label>
                  <input
                    type="number"
                    value={modalOriginalPrice || ''}
                    onChange={(e) => setModalOriginalPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl p-2 focus:border-amber-400 focus:outline-hidden"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="95"
                    value={modalDiscountPercent || '0'}
                    onChange={(e) => setModalDiscountPercent(Math.min(95, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-rose-300 rounded-xl p-2 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Computed Selling (₦)</label>
                  <div className="w-full bg-slate-900 border border-emerald-500/30 text-xs font-mono font-black text-emerald-400 rounded-xl p-2 flex items-center">
                    ₦{Math.round(modalOriginalPrice * (1 - modalDiscountPercent / 100)).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Row 3: Description */}
              <ExpandableTextarea
                label="Product Overview / Description"
                modalTitle={`Product Description — ${modalName || 'Unmatched Product'}`}
                modalSubtitle="Edit complete marketing copy and technical overview on a full blank canvas"
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-xs text-slate-200 p-2.5 rounded-xl focus:outline-hidden leading-relaxed"
              />

              {/* Row 4: Stock & COD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Initial Stock Qty</label>
                  <input
                    type="number"
                    value={modalStock}
                    onChange={(e) => setModalStock(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-700 text-xs font-mono rounded-xl p-2 text-white focus:border-amber-400 focus:outline-hidden font-bold"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl p-2.5 select-none">
                    <input
                      type="checkbox"
                      checked={modalAllowCOD}
                      onChange={(e) => setModalAllowCOD(e.target.checked)}
                      className="w-4 h-4 text-amber-400 rounded accent-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-200">Allow Cash on Delivery (COD)</span>
                  </label>
                </div>
              </div>

              {/* Row 5: Product Image (Admin Photo Upload Required) */}
              <div className={`space-y-2 bg-slate-950 p-4 rounded-2xl border-2 transition-all ${
                modalImage ? 'border-emerald-500/50' : 'border-amber-500/70'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-amber-400" />
                      <span>Verified Product Image *</span>
                    </label>
                    <span className="text-[10px] bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Upload accurate product photo or paste link
                  </span>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {modalImage ? (
                      <img src={modalImage} alt="Product preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2 text-slate-500 flex flex-col items-center">
                        <ImageIcon size={22} className="text-amber-400/60 mb-1" />
                        <span className="text-[9px] font-bold uppercase text-amber-300/80">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={modalFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleModalImageUpload}
                        className="hidden"
                        disabled={modalCompressing}
                      />

                      <button
                        type="button"
                        onClick={() => handleUploadPhotoClick('modalCover')}
                        disabled={modalCompressing}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2 active:scale-95 transition-all uppercase tracking-wider disabled:opacity-50"
                      >
                        <Upload size={14} className="stroke-[3]" />
                        <span>{modalCompressing ? 'Compressing...' : 'Upload Photo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCamera('modalCover')}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 text-xs font-black px-3.5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all uppercase tracking-wider"
                      >
                        <Camera size={14} className="text-amber-400 stroke-[2.5]" />
                        <span>Take Picture</span>
                      </button>

                      {modalImage && (
                        <button
                          type="button"
                          onClick={() => setModalImage('')}
                          className="text-xs bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5"
                        >
                          <Trash2 size={13} />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={modalImage}
                      onChange={(e) => setModalImage(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono rounded-xl p-2 focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Specifications */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Specifications</label>
                  <button
                    type="button"
                    onClick={handleAddModalSpec}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Spec
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {modalSpecs.map((sp, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Brand, Capacity, Voltage"
                        value={sp.key}
                        onChange={(e) => handleModalSpecChange(sIdx, 'key', e.target.value)}
                        className="w-1/3 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-1.5 focus:border-amber-400 focus:outline-hidden font-bold"
                      />
                      <input
                        type="text"
                        placeholder="e.g. 550W, 48V, 2 Years"
                        value={sp.value}
                        onChange={(e) => handleModalSpecChange(sIdx, 'value', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-1.5 focus:border-amber-400 focus:outline-hidden font-mono"
                      />
                      {modalSpecs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveModalSpec(sIdx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickAddModalItem(null)}
                  className="w-full sm:w-auto text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Cancel & Return to Bulk List
                </button>

                <button
                  type="submit"
                  disabled={modalIsSaving || modalCompressing}
                  className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs px-6 py-3 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  {modalIsSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-slate-950" />
                      <span>Saving & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} className="text-slate-950 stroke-[3]" />
                      <span>Save & Add to Live Catalog</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Camera Access Permission Request Modal */}
      {isCameraPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f172a] border-2 border-amber-400 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-slate-100 ring-4 ring-amber-400/20">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shrink-0">
                  <Camera size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-white">Camera Access Request</h3>
                  <p className="text-xs text-amber-300 font-bold">
                    {cameraPromptTarget === 'cover' ? 'Catalog Cover Photo' : cameraPromptTarget === 'gallery' ? 'Gallery Multi-Slide' : 'Catalog Modal Photo'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCameraPromptOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-200 font-medium leading-relaxed">
                  Would you like to grant camera permission to snap a live product picture directly with your device, or choose an existing photo file?
                </p>
                <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                  <Zap size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Photos are automatically optimized into high-speed, lightweight <strong className="text-amber-300">WebP format</strong> for instant web catalog loading.
                  </span>
                </div>
              </div>

              {/* Action Buttons - Gold Standard Readability */}
              <div className="flex flex-col gap-2.5 pt-2">
                {/* Primary Option: Allow Camera Access */}
                <button
                  type="button"
                  onClick={handleConfirmCameraAccess}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <Camera size={18} className="stroke-[2.5]" />
                  <span>Allow Camera & Take Live Picture</span>
                </button>

                {/* Secondary Option: Choose File From Device */}
                <button
                  type="button"
                  onClick={handleChooseLocalFile}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <Upload size={18} className="text-amber-400" />
                  <span>Choose Photo File from Device</span>
                </button>

                {/* Cancel Option */}
                <button
                  type="button"
                  onClick={() => setIsCameraPromptOpen(false)}
                  className="w-full text-slate-400 hover:text-slate-200 font-semibold text-xs py-2 text-center transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Device Camera Photo Capture Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b0f19] border-2 border-amber-400/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col text-slate-100 ring-4 ring-amber-400/10">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center">
                  <Camera size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Capture Live Product Photo</h3>
                  <p className="text-[10px] text-amber-300 font-mono">
                    Target: {cameraTarget === 'cover' ? 'Primary Cover Photo' : cameraTarget === 'gallery' ? 'Gallery Slide' : 'Catalog Modal Photo'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Camera"
              >
                <X size={18} />
              </button>
            </div>

            {/* Viewfinder Canvas Area */}
            <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/10 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/10" />
                <div className="border-r border-b border-white/10" />
                <div className="border-b border-white/10" />
                <div className="border-r border-b border-white/10" />
                <div className="border-r border-b border-white/10" />
                <div className="border-b border-white/10" />
                <div className="border-r border-white/10" />
                <div className="border-r border-white/10" />
                <div />
              </div>

              {/* Center focus indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 border-2 border-amber-400/60 rounded-2xl animate-pulse" />
              </div>

              {/* Camera loading state */}
              {cameraLoading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={28} className="animate-spin text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">Initializing camera hardware...</span>
                </div>
              )}

              {/* Camera Error Banner */}
              {cameraError && (
                <div className="absolute inset-x-4 top-4 p-3 bg-rose-950/90 border border-rose-500 text-rose-200 rounded-xl text-xs flex items-start gap-2 shadow-lg backdrop-blur-sm">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-100">Camera Notice:</span>
                    <span>{cameraError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="Switch Front/Back Camera"
              >
                <FlipHorizontal size={15} className="text-amber-400" />
                <span className="hidden sm:inline">{cameraFacingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
              </button>

              {/* Snap shutter button */}
              <button
                type="button"
                onClick={handleSnapPhoto}
                disabled={cameraLoading || !!cameraError}
                className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-slate-900 shadow-xl flex items-center justify-center text-slate-950 active:scale-90 transition-all cursor-pointer ring-4 ring-amber-400/30"
                title="Snap Product Picture"
              >
                <Camera size={26} className="stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
