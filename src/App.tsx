import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, Order } from './types';
import { mockProducts } from './data/products';
import { ProductCard } from './components/ProductCard';
import { ProductCardSkeleton } from './components/ProductCardSkeleton';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { TrackingDashboard } from './components/TrackingDashboard';
import { AiAssistant } from './components/AiAssistant';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { getOrCreateGuestUid, cacheOrderDetails } from './lib/guestCache';
import { doc, setDoc, collection, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { LoginModal } from './components/LoginModal';
import { AdminPanel } from './components/AdminPanel';
import { ProfileEditModal } from './components/ProfileEditModal';
import { ContactSection } from './components/ContactSection';
import { PolicyModal } from './components/PolicyModal';
import { AiVisualSearchModal } from './components/AiVisualSearchModal';
import { ClipboardList, LayoutDashboard } from 'lucide-react';
import { 
  ShoppingBag, 
  Search, 
  HelpCircle, 
  Truck, 
  Sparkles, 
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  Gift,
  Zap,
  ShieldCheck,
  MapPin,
  Calendar,
  Lock,
  Menu,
  X,
  AlertTriangle,
  Store,
  ArrowUp,
  Check,
  CheckCircle2,
  Camera
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, _setActiveTab] = useState<'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as any;
    if (['shop', 'quote', 'ai', 'tracker', 'admin', 'contact'].includes(tabParam)) {
      return tabParam;
    }
    return (localStorage.getItem('activeTab') as 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact') || 'shop';
  });

  const setActiveTab = (tab: 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact') => {
    _setActiveTab(tab);
    setSelectedProduct(null); // Clear selected product modal on navigation
    localStorage.setItem('activeTab', tab);
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') !== tab) {
      params.set('tab', tab);
      if (tab !== 'shop') {
        params.delete('product'); // Clear selected product when navigating away from shop
      }
      window.history.pushState({ tab }, '', `?${params.toString()}`);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<'installation' | 'engineering' | 'return'>('installation');

  // Listen to scroll position for Scroll to Top Button
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      
      // Show only when scrolled down > 400px AND not near the bottom (within 120px)
      if (scrollY > 400 && (viewHeight + scrollY < totalHeight - 120)) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Flutterwave payment verify-callback state
  const [verificationFeedback, setVerificationFeedback] = useState<{
    status: 'idle' | 'verifying' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  // Initialize URL sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('tab') && activeTab !== 'shop') {
      params.set('tab', activeTab);
      window.history.replaceState({ tab: activeTab }, '', `?${params.toString()}`);
    } else if (!params.get('tab')) {
      // Set to shop explicitly so we have a clean history stack state
      params.set('tab', 'shop');
      window.history.replaceState({ tab: 'shop' }, '', `?${params.toString()}`);
    }
  }, []);

  // Flutterwave callback receiver
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const txRef = params.get('tx_ref');
    const transactionId = params.get('transaction_id');
    const orderId = params.get('order_id');

    if (status && txRef) {
      const processCallback = async () => {
        // Safe clear URL parameters so browser refresh does not re-register the order
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);

        if (status === 'successful' || status === 'completed') {
          setVerificationFeedback({
            status: 'verifying',
            message: 'Verifying payment with Flutterwave secure network...'
          });

          try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Cinematic feedback delay

            // Run secure backend verification call
            const verifyUrl = `/api/flutterwave/verify?status=${status}&tx_ref=${txRef}&transaction_id=${transactionId || ''}&order_id=${orderId || ''}`;
            const verifyResp = await fetch(verifyUrl);
            const verifyResult = await verifyResp.json();

            if (!verifyResp.ok || !verifyResult.success) {
              throw new Error(verifyResult.error || "Payment verification failed or was declined.");
            }
            
            // Retrieve pending order payload
            const payloadStr = sessionStorage.getItem('pending_order_payload') || localStorage.getItem('pending_order_payload');
            if (!payloadStr) {
              throw new Error('No pending order payload found in session cache.');
            }

            const payload = JSON.parse(payloadStr);

            // Register order metrics on Lagos engineering portal
            const currentUserId = auth.currentUser?.uid || payload.userId || getOrCreateGuestUid();
            const saveResp = await fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payload,
                userId: currentUserId,
                paymentMethod: "Flutterwave Redirect Secure"
              })
            });

            if (!saveResp.ok) {
              throw new Error("Lagos backend gateway rejected the registration validation.");
            }

            const result = await saveResp.json();

            // Save order to Firestore
            try {
              const orderDocRef = doc(db, 'orders', result.order.id);
              const completeOrder = {
                ...result.order,
                userId: currentUserId
              };
              await setDoc(orderDocRef, completeOrder);
              cacheOrderDetails(completeOrder);
            } catch (fErr) {
              console.warn("Cloud Firestore payment redirect save warning:", fErr);
            }

            // Success configuration
            sessionStorage.removeItem('pending_order_payload');
            localStorage.removeItem('pending_order_payload');

            setVerificationFeedback({
              status: 'success',
              message: `Payment successful! Order recognized with tracking ID: ${result.order.id}`
            });

            // Set state to track this order
            setCart([]);
            setTrackedOrderId(result.order.id);
            setActiveTab('tracker');

            // Clear feedback after a delay
            setTimeout(() => {
              setVerificationFeedback({ status: 'idle', message: '' });
            }, 6000);

          } catch (err: any) {
            console.error("Redirect verification failure:", err);
            setVerificationFeedback({
              status: 'error',
              message: err.message || 'Verification failed. Please contact support.'
            });
            setTimeout(() => {
              setVerificationFeedback({ status: 'idle', message: '' });
            }, 8000);
          }
        } else {
          setVerificationFeedback({
            status: 'error',
            message: 'Payment process was cancelled or refused by Flutterwave.'
          });
          setTimeout(() => {
            setVerificationFeedback({ status: 'idle', message: '' });
          }, 8000);
        }
      };

      processCallback();
    }
  }, []);

  // Authenticate hook
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        let hasAdminRole = false;
        let hasEditorRole = false;
        
        // 1. Dynamic Firestore Privilege Check
        try {
          const docSnap = await getDoc(doc(db, 'admins', user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.role === 'admin') {
              hasAdminRole = true;
              hasEditorRole = true;
            } else if (data.role === 'editor') {
              hasEditorRole = true;
            }
          }
        } catch (err) {
          console.warn("Privilege registry read exception ignored during dynamic handshakes:", err);
        }

        // 2. Sandbox simulation values
        const isSimAdmin = localStorage.getItem('skyit_sim_admin') === 'true';
        if (isSimAdmin) {
          hasAdminRole = true;
          hasEditorRole = true;
        }

        // 3. Fallback bootstrapping for standard administrator (jeemestore)
        const isEmailAdmin = user.email === 'jeemestore@gmail.com';
        if (isEmailAdmin) {
          hasAdminRole = true;
          hasEditorRole = true;
          
          try {
            const adminRef = doc(db, 'admins', user.uid);
            await setDoc(adminRef, {
              uid: user.uid,
              email: user.email,
              role: 'admin',
              createdAt: new Date().toISOString()
            }, { merge: true });
          } catch (err) {
            console.warn("Bootstrap admin synchronization warning: ", err);
          }
        }

        setIsAdmin(hasAdminRole);
        setIsEditor(hasEditorRole);

        // 4. Synchronize user access parameters in the platform's User Directory
        try {
          const userRef = doc(db, 'users', user.uid);
          const nowStr = new Date().toISOString();
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            lastLoginAt: nowStr,
            createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : nowStr
          }, { merge: true });
        } catch (err) {
          console.warn("User directory synchronization ignored: ", err);
        }
      } else {
        localStorage.removeItem('skyit_sim_admin');
        setCurrentUser(null);
        setIsAdmin(false);
        setIsEditor(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: any, isAdminUser: boolean) => {
    setCurrentUser(user);
    setIsAdmin(isAdminUser);
    setIsEditor(isAdminUser);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Logout firebase trigger exception ignored", e);
    }
    localStorage.removeItem('skyit_sim_admin');
    // Clear cart upon logout to differentiate guest vs logged in cart lists
    setCart([]);
    localStorage.removeItem('skyit_shopping_cart');
    setCurrentUser(null);
    setIsAdmin(false);
    if (activeTab === 'admin') {
      setActiveTab('shop');
    }
  };

  // Shopping Cart & Modals
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('skyit_shopping_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [cartNotification, setCartNotification] = useState<{
    show: boolean;
    productName: string;
    productImage?: string;
  } | null>(null);

  // Auto-dismiss the cart notification toast after 3 seconds
  useEffect(() => {
    if (cartNotification) {
      const timer = setTimeout(() => {
        setCartNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [cartNotification]);

  // Load cart from Firestore on login
  useEffect(() => {
    if (!currentUser) {
      setIsCartLoaded(true);
      return;
    }

    setIsCartLoaded(false);
    let active = true;

    const loadFirestoreCart = async () => {
      try {
        const cartRef = doc(db, 'carts', currentUser.uid);
        const docSnap = await getDoc(cartRef);
        if (active) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.items)) {
              setCart(data.items);
            }
          }
          setIsCartLoaded(true);
        }
      } catch (err) {
        console.warn("Failed to load cart from Firestore:", err);
        if (active) {
          setIsCartLoaded(true);
        }
      }
    };

    loadFirestoreCart();

    return () => {
      active = false;
    };
  }, [currentUser]);

  // Save cart to LocalStorage and Firestore
  useEffect(() => {
    try {
      localStorage.setItem('skyit_shopping_cart', JSON.stringify(cart));
      
      // If signed in AND the cart has been loaded/synced from firestore, save updates
      if (currentUser && isCartLoaded) {
        const cartRef = doc(db, 'carts', currentUser.uid);
        setDoc(cartRef, {
          items: cart,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => {
          console.warn("Failed to sync cart to Firestore:", err);
        });
      }
    } catch (e) {
      console.warn("Failed to save cart to localStorage", e);
    }
  }, [cart, currentUser, isCartLoaded]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [trackedOrderId, setTrackedOrderId] = useState<string>('');

  // Catalog Filters State
  const [products, setProducts] = useState<Product[]>([]);
  const [productsRefreshTrigger, setProductsRefreshTrigger] = useState(0);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceSort, setPriceSort] = useState<'low-high' | 'high-low' | 'default'>('default');
  const [discountFilter, setDiscountFilter] = useState('All');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // SkyIT AI Smart Vision State
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const [isAiSearchModalOpen, setIsAiSearchModalOpen] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<any | null>(null);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);
  const [scanImagePreview, setScanImagePreview] = useState<string | null>(null);

  const triggerCameraSearch = () => {
    if (cameraFileInputRef.current) {
      cameraFileInputRef.current.click();
    }
  };

  const handleCameraSearchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAiSearchError("Image is too large. Please upload an image under 10MB.");
      setIsAiSearchModalOpen(true);
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => {
      setIsAiSearching(true);
      setAiSearchError(null);
      setAiSearchResult(null);
      setScanImagePreview(null);
      setIsAiSearchModalOpen(true);
    };

    reader.onload = async () => {
      const base64Image = reader.result as string;
      setScanImagePreview(base64Image);
      try {
        const response = await fetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Image,
            products: productsWithRealRatings
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to identify product.");
        }

        const data = await response.json();
        setAiSearchResult({
          ...data,
          imagePreviewUrl: base64Image
        });
      } catch (err: any) {
        setAiSearchError(err.message || "Something went wrong during product identification.");
      } finally {
        setIsAiSearching(false);
      }
    };

    reader.onerror = () => {
      setAiSearchError("Could not read the uploaded image file.");
      setIsAiSearching(false);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Real-time Reviews State for Dynamic Ratings
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data());
      });
      setReviews(list);
    }, (error) => {
      console.warn("Error listening to reviews:", error);
    });
    return () => unsub();
  }, []);

  // Dynamically compute the product rating and ratingCount from actual reviews
  const productsWithRealRatings = React.useMemo(() => {
    return products.map(prod => {
      const prodReviews = reviews.filter(r => r.productId === prod.id);
      if (prodReviews.length > 0) {
        const sum = prodReviews.reduce((acc, r) => acc + r.rating, 0);
        return {
          ...prod,
          rating: sum / prodReviews.length,
          ratingCount: prodReviews.length
        };
      } else {
        return {
          ...prod,
          rating: 0,
          ratingCount: 0
        };
      }
    });
  }, [products, reviews]);

  const selectedProductWithRealRating = React.useMemo(() => {
    if (!selectedProduct) return null;
    return productsWithRealRatings.find(p => p.id === selectedProduct.id) || selectedProduct;
  }, [selectedProduct, productsWithRealRatings]);

  // Handle Browser Back Button for Full-Page Product View and Tabs
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      
      // Handle product modal
      const productIdParam = params.get('product');
      if (productIdParam && products.length > 0) {
        const p = products.find(prod => prod.id === productIdParam);
        setSelectedProduct(p || null);
      } else {
        setSelectedProduct(null);
      }

      // Handle tabs
      const tabParam = params.get('tab') as any;
      if (['shop', 'quote', 'ai', 'tracker', 'admin', 'contact'].includes(tabParam)) {
        _setActiveTab(tabParam);
        localStorage.setItem('activeTab', tabParam);
      } else if (!tabParam && !params.get('product')) {
        // Fallback or default
        _setActiveTab('shop');
        localStorage.setItem('activeTab', 'shop');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]); // Re-evaluate if products load

  // Initial load check for product in URL
  useEffect(() => {
    if (products.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('product');
      if (productId && !selectedProduct) {
        const p = products.find(prod => prod.id === productId);
        if (p) setSelectedProduct(p);
      }
    }
  }, [products]);

  const handleViewProduct = (p: Product) => {
    const params = new URLSearchParams(window.location.search);
    params.set('product', p.id);
    window.history.pushState({}, '', `?${params.toString()}`);
    setSelectedProduct(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseProduct = () => {
    const closedProduct = selectedProduct;
    const params = new URLSearchParams(window.location.search);
    params.delete('product');
    window.history.pushState({}, '', window.location.pathname + (params.toString() ? `?${params.toString()}` : ''));
    setSelectedProduct(null);

    if (closedProduct) {
      let filterChanged = false;

      // Ensure activeTab is 'shop'
      if (activeTab !== 'shop') {
        setActiveTab('shop');
        filterChanged = true;
      }

      // If current category is not 'All' and doesn't match the product's category, reset to 'All'
      if (selectedCategory !== 'All' && selectedCategory !== closedProduct.category) {
        setSelectedCategory('All');
        filterChanged = true;
      }

      // If there is a search query and the product name doesn't match it, clear search query
      if (searchQuery && !closedProduct.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        setSearchQuery('');
        filterChanged = true;
      }

      // If there is a discount filter and the product doesn't match, clear it
      if (discountFilter !== 'All') {
        if (discountFilter === 'high' && closedProduct.discountPercent < 15) {
          setDiscountFilter('All');
          filterChanged = true;
        }
      }

      setTimeout(() => {
        const element = document.getElementById(`prod-card-${closedProduct.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, filterChanged ? 150 : 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Highlights Carousel State
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Filter products for Highlights Carousel
  const highlightItems = React.useMemo(() => {
    // Select 6 random products
    const shuffled = [...productsWithRealRatings].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 6);
  }, [productsWithRealRatings]);

  // Handle index boundaries when product list changes
  useEffect(() => {
    if (highlightItems.length > 0 && highlightIndex >= highlightItems.length) {
      setHighlightIndex(0);
    }
  }, [highlightItems, highlightIndex]);

  // Auto-slide carousel effect every 6 seconds
  useEffect(() => {
    if (highlightItems.length <= 1) return;
    const interval = setInterval(() => {
      setHighlightIndex(prev => (prev + 1) % highlightItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [highlightItems]);

  // Compute live search suggestions for autocomplete drops
  const filteredSuggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return productsWithRealRatings.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [productsWithRealRatings, searchQuery]);

  // Load products dynamically from Firestore with fallback to REST API / static mockProducts
  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      try {
        const productsColRef = collection(db, 'products');
        
        // Fast 2-second timeout to prevent indefinite hangs in restricted/sandboxed iframe environments or private browser storage
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Firestore fetch timed out")), 2000)
        );

        const snapshot = await Promise.race([
          getDocs(productsColRef),
          timeoutPromise
        ]);

        if (!active) return;
        const firestoreProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          firestoreProducts.push({
            id: docSnap.id,
            ...docSnap.data()
          } as Product);
        });

        const merged = [...firestoreProducts];
        mockProducts.forEach((staticProd) => {
          if (!merged.some(p => p.id === staticProd.id)) {
            merged.push(staticProd);
          }
        });
        setProducts(merged);
        setIsProductsLoading(false);
      } catch (error) {
        console.warn("Firestore 'products' fetch notice/timeout, using rest query fallback:", error);
        if (!active) return;
        fetch('/api/products')
          .then(res => res.ok ? res.json() : mockProducts)
          .then(data => {
            if (!active) return;
            setProducts(data);
            setIsProductsLoading(false);
          })
          .catch(() => {
            if (!active) return;
            setProducts(mockProducts);
            setIsProductsLoading(false);
          });
      }
    };

    fetchProducts();
    return () => {
      active = false;
    };
  }, [productsRefreshTrigger]);

  // Filter & Sort Logic
  const filteredProducts = productsWithRealRatings.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.specs && Object.values(p.specs).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    let matchesDiscount = true;
    if (discountFilter === 'high') {
      matchesDiscount = p.discountPercent >= 15;
    }

    return matchesSearch && matchesCategory && matchesDiscount;
  }).sort((a, b) => {
    if (priceSort === 'low-high') return a.price - b.price;
    if (priceSort === 'high-low') return b.price - a.price;
    return 0; // default order
  });

  // Cart operations
  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Avoid triggering open card detail overlay
    
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Reset and trigger new cart notification
    setCartNotification(null);
    setTimeout(() => {
      setCartNotification({
        show: true,
        productName: product.name,
        productImage: product.image
      });
    }, 50);
  };

  const handleAddToCartWithQty = (product: Product, quantity: number) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...prev, { product, quantity }];
    });

    // Reset and trigger new cart notification
    setCartNotification(null);
    setTimeout(() => {
      setCartNotification({
        show: true,
        productName: product.name,
        productImage: product.image
      });
    }, 50);
  };

  const handleUpdateQty = (prodId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(it => it.product.id !== prodId));
      return;
    }
    setCart(prev => prev.map(it => it.product.id === prodId ? { ...it, quantity } : it));
  };

  const handleRemoveItem = (prodId: string) => {
    setCart(prev => prev.filter(it => it.product.id !== prodId));
  };

  // Triggers order success callback
  const handleOrderSuccess = (order: Order) => {
    setCart([]); // Clear shopping cart
    setTrackedOrderId(order.id); // Load order ID straight to tracking telemetry
    setActiveTab('tracker'); // Swap view tab seamlessly
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`min-h-screen text-slate-600 font-sans flex flex-col justify-between transition-colors duration-300 ${
      activeTab === 'ai' ? 'bg-[#0e0e10]' : 'bg-slate-50'
    }`}>
      
      {/* Top micro announcement bar */}
      {activeTab !== 'ai' && (
        <div className="bg-brand text-white text-[8px] sm:text-[10px] py-1.5 sm:py-2 px-4 text-center font-bold tracking-normal sm:tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 uppercase">
          <Gift size={16} className="animate-bounce shrink-0" />
          <span>SkyIT Launch Sale: Free Logistics Deployment & site commissioning on all system kits above ₦500,000!</span>
        </div>
      )}

      {/* Main Premium Navbar */}
      {activeTab !== 'ai' && (
        <header className="bg-white text-slate-800 sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo Branding */}
          <div 
            onClick={() => { setActiveTab('shop'); setSearchQuery(''); handleCloseProduct(); }}
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer shrink-0"
          >
            <div className="p-0.5 rounded-lg border border-slate-100 flex items-center justify-center bg-white shadow-xs overflow-hidden w-9 h-9">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                alt="SkyIT Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-[13px] sm:text-lg text-slate-900 tracking-tight leading-none">SkyIT <span className="text-brand">Ventures</span></span>
              <span className="text-[8px] uppercase tracking-widest font-bold text-slate-400 mt-1 hidden sm:block">Solar & Security Systems</span>
            </div>
          </div>

          {/* Quick Search center header */}
          {activeTab === 'shop' && (
            <div className="hidden md:flex flex-1 max-w-sm relative items-center">
              <Search className="absolute left-3 text-slate-400 pointer-events-none" size={14} />
              <input 
                type="text" 
                placeholder="Search panels, inverters, cameras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-9 pr-8 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden text-slate-850 placeholder-slate-400"
              />
              <button 
                type="button"
                onClick={triggerCameraSearch}
                title="Search with Smart Vision Camera"
                className="absolute right-2.5 text-slate-400 hover:text-brand transition-colors cursor-pointer"
              >
                <Camera size={15} />
              </button>
              {/* Autocomplete suggestions dropdown */}
              {filteredSuggestions.length > 0 && (
                <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
                  {filteredSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleViewProduct(p);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-xs text-slate-800"
                    >
                      <img src={p.image} className="w-8 h-8 rounded border object-cover shrink-0" referrerPolicy="no-referrer" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{p.category} • ₦{p.price.toLocaleString()}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Desktop & Mobile Responsive Navigation bar with Hamburger */}
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
            {/* Navigation links tucked in the hamburger menu on desktop so search is fully available */}

            {/* Mobile Search Icon Toggle */}
            {activeTab === 'shop' && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileSearchExpanded(!isMobileSearchExpanded);
                  setIsMobileMenuOpen(false);
                }}
                className="md:hidden bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200 p-2 rounded-lg flex items-center justify-center text-slate-700 shrink-0"
                aria-label="Search"
              >
                <Search size={14} className="text-brand" />
              </button>
            )}

            {/* Shopping Cart Trigger (Always accessible) */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200 p-2 px-3 sm:px-3.5 rounded-lg flex items-center gap-2 relative group text-slate-700 shrink-0"
            >
              <ShoppingBag size={14} className="text-brand group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline font-bold">Cart</span>
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-white animate-scale-up">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* User Profile / Authenticated Actions */}
            <span className="text-slate-200 hidden sm:inline">|</span>

            {currentUser ? (
              <div className="flex items-center gap-2" id="navbar-user-hud">
                <div className="hidden sm:flex flex-col text-right">
                  <div 
                    onClick={() => setIsProfileOpen(true)}
                    className="text-[10px] font-black leading-tight flex items-center justify-end gap-1 cursor-pointer hover:text-brand transition-colors"
                    title="Edit user profile"
                  >
                    {isAdmin ? (
                      <span className="bg-rose-600 text-white text-[8px] font-black uppercase px-1 rounded-sm tracking-widest leading-none py-0.5">
                        ADMIN
                      </span>
                    ) : isEditor ? (
                      <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-1 rounded-sm tracking-widest leading-none py-0.5">
                        EDITOR
                      </span>
                    ) : null}
                    <span className="truncate max-w-[110px] text-slate-900">{currentUser.displayName || currentUser.email}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleLogout}
                    className="text-[9px] text-slate-450 hover:text-red-600 font-bold tracking-wider leading-none text-right mt-0.5"
                  >
                    Logout
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="cursor-pointer hover:opacity-85 active:scale-95 transition-all shrink-0 rounded-full focus:outline-hidden"
                  title="Edit user profile"
                >
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-250 shadow-2xs shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-250 shadow-2xs uppercase shrink-0">
                      {(currentUser.displayName || currentUser.email || "?").charAt(0)}
                    </div>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="bg-slate-900 hover:bg-[#1a1a1a] text-white hover:text-white transition-all font-black text-[10px] uppercase tracking-wider py-2.5 px-3 sm:px-4 rounded-lg flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <Lock size={12} strokeWidth={2.5} />
                <span>Sign In</span>
              </button>
            )}

            {/* Hamburger Menu Toggle (Both Desktop and Mobile) */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setIsMobileSearchExpanded(false); // Close search if menu is opened
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 p-2 rounded-lg flex items-center justify-center shrink-0"
              aria-label="Toggle menu"
              title="Open Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={15} strokeWidth={2.5} /> : <Menu size={15} strokeWidth={2.5} />}
            </button>
          </div>

        </div>

        {/* Mobile Expanded Search Bar Container */}
        {isMobileSearchExpanded && activeTab === 'shop' && (
          <div className="md:hidden border-t border-slate-200 bg-slate-50 p-3 shadow-inner animate-fade-in relative z-50">
            <div className="relative flex items-center gap-2 w-full">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 text-slate-400 pointer-events-none" size={14} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search panels, inverters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 pl-9 pr-8 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden text-slate-850 placeholder-slate-450"
                />
                <button 
                  type="button"
                  onClick={triggerCameraSearch}
                  title="Search with Smart Vision Camera"
                  className="absolute right-3 text-slate-400 hover:text-brand transition-colors cursor-pointer"
                >
                  <Camera size={15} />
                </button>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsMobileSearchExpanded(false);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 shrink-0"
              >
                Cancel
              </button>
            </div>

            {/* Mobile Dropdown Suggestions matches */}
            {filteredSuggestions.length > 0 && (
              <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 z-50 relative">
                {filteredSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      handleViewProduct(p);
                      setSearchQuery('');
                      setIsMobileSearchExpanded(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-xs text-slate-800"
                  >
                    <img src={p.image} className="w-8 h-8 rounded border object-cover shrink-0" referrerPolicy="no-referrer" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{p.category} • ₦{p.price.toLocaleString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Universal Floating Dropdown Menu Panel (Desktop & Mobile) */}
        {isMobileMenuOpen && (
          <div className="absolute right-4 top-[102%] mt-1 max-w-[calc(100vw-32px)] w-[290px] bg-white shadow-2xl border border-slate-250/90 rounded-2xl z-50 animate-fade-in divide-y divide-slate-100 p-1">
            <div className="p-3 space-y-3">
              
              <div className="flex flex-col gap-1.5 font-bold text-xs uppercase tracking-wider">
                <button
                  onClick={() => {
                    setActiveTab('shop');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all flex items-center justify-between ${
                    activeTab === 'shop' ? 'bg-brand text-white font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Store size={14} />
                    <span>Shop Catalog</span>
                  </div>
                  <ChevronRight size={13} className={activeTab === 'shop' ? 'text-white' : 'text-slate-400'} />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('ai');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all flex items-center justify-between ${
                    activeTab === 'ai' ? 'bg-brand text-white font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} fill={activeTab === 'ai' ? "currentColor" : "none"} strokeWidth={2} />
                    <span>AI Advisor</span>
                  </div>
                  <ChevronRight size={13} className={activeTab === 'ai' ? 'text-white' : 'text-slate-400'} />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('tracker');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all flex items-center justify-between ${
                    activeTab === 'tracker' ? 'bg-brand text-white font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Truck size={14} />
                    <span>Track My Orders</span>
                  </div>
                  <ChevronRight size={13} className={activeTab === 'tracker' ? 'text-white' : 'text-slate-400'} />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all flex items-center justify-between ${
                    activeTab === 'contact' ? 'bg-brand text-white font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>📞</span>
                    <span>Contact Support</span>
                  </div>
                  <ChevronRight size={13} className={activeTab === 'contact' ? 'text-white' : 'text-slate-400'} />
                </button>

                {/* Conditional Mobile Admin Command Deck link */}
                {(isAdmin || isEditor) ? (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all flex items-center justify-between font-bold text-rose-600 bg-rose-50/60 ${
                      activeTab === 'admin' ? 'bg-rose-600 text-white font-bold' : 'hover:bg-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <LayoutDashboard size={14} />
                      <span>{isAdmin ? 'Admin' : 'Staff'} Control Deck</span>
                    </div>
                    <ChevronRight size={13} className={activeTab === 'admin' ? 'text-white' : 'text-rose-450'} />
                  </button>
                ) : null}
              </div>

              {/* Mobile Auth Button HUD */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                {currentUser ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5">
                    <div 
                      onClick={() => {
                        setIsProfileOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                      title="Edit user profile"
                    >
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-205 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-slate-205 shrink-0">
                          {(currentUser.displayName || currentUser.email || "?").charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] font-black text-slate-855 leading-tight hover:text-brand transition-colors">
                          {currentUser.displayName || currentUser.email}
                        </span>
                        {isAdmin ? (
                          <span className="text-[8px] bg-rose-600 text-white font-bold w-fit px-1.5 py-0.5 rounded-sm tracking-widest leading-none mt-0.5 uppercase">
                            Admin Active
                          </span>
                        ) : isEditor ? (
                          <span className="text-[8px] bg-blue-600 text-white font-bold w-fit px-1.5 py-0.5 rounded-sm tracking-widest leading-none mt-0.5 uppercase">
                            Editor Active
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-650 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-center border border-red-200"
                    >
                      Sign Out Account
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-slate-900 hover:bg-brand text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Lock size={12} strokeWidth={2.5} />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    )}

      {/* Hero Banner Grid (Visible on Shop Tab only) */}
      {activeTab === 'shop' && !selectedProduct && (
        <section className="bg-gradient-to-b from-brand-light/70 via-white to-slate-50 py-10 px-4 sm:px-6 md:px-8 text-slate-700 relative overflow-hidden border-b border-slate-200">
          {/* Ambient visual glow circles representing clean solar energy */}
          <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-slate-200/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 items-center">
            
            {/* Promo core content */}
            <div className="md:col-span-2 space-y-4">
              <span className="bg-brand-light text-brand text-[9px] tracking-widest font-extrabold uppercase p-1 px-2.5 rounded-sm inline-block border border-brand/10">
                High-Efficiency Solar & Deep Cycle Storage
              </span>
              <h1 className="font-display font-black leading-tight text-slate-900 text-3xl sm:text-4xl lg:text-5xl tracking-tight">
                Engineering Custom Clean Energy & <span className="text-brand block mt-1">Starlight CCTV Solutions</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                SkyIT Ventures manufactures and deploys advanced monocrystalline solar panels, pure sine wave hybrid inverters, LFP lithium storage modules, starlight PoE surveillance dome layouts, and biometric entrance gates tailored across Nigerian communities.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <button 
                  onClick={() => setActiveTab('ai')}
                  className="bg-brand hover:bg-brand-hover active:scale-98 transition-all text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 uppercase tracking-wider animate-pulse hover:animate-none"
                >
                  <Sparkles size={14} className="fill-white" />
                  <span>Consult AI Advisor</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('tracker')}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Truck size={14} className="text-brand" />
                  <span>Track My Orders</span>
                </button>
              </div>
            </div>

            {/* Quick Promo cards right column */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm text-slate-600 relative overflow-hidden min-h-[195px]">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100/80 pb-2">
                  <h3 className="text-[10px] font-bold uppercase text-brand tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></span>
                    SkyIT Flash Highlights
                  </h3>
                  <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                    {highlightItems.length > 0 ? `${highlightIndex + 1} / ${highlightItems.length}` : '0 / 0'}
                  </span>
                </div>
                
                {isProductsLoading ? (
                  <div className="flex gap-3.5 items-center animate-pulse py-1">
                    <div className="w-16 h-16 bg-slate-200/70 rounded-xl shrink-0"></div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-3 w-16 bg-slate-200/70 rounded-sm"></div>
                      <div className="h-4 w-3/4 bg-slate-200/70 rounded-md"></div>
                      <div className="h-3.5 w-24 bg-slate-100 rounded-sm"></div>
                    </div>
                  </div>
                ) : highlightItems.length > 0 ? (
                  <div className="relative overflow-hidden min-h-[84px]">
                    <AnimatePresence mode="wait">
                      {highlightItems.map((item, idx) => {
                        if (idx !== highlightIndex) return null;
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 25 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -25 }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            className="flex gap-3.5 items-center"
                          >
                            <img 
                              src={item.image || "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=300&q=80"} 
                              alt={item.name} 
                              className="w-16 h-16 object-cover rounded-xl bg-slate-50 border border-slate-100 shrink-0 shadow-3xs"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-100 uppercase tracking-wider">
                                {item.category}
                              </span>
                              <h4 className="text-xs font-display font-semibold text-slate-800 line-clamp-1 leading-snug mt-1" title={item.name}>
                                {item.name}
                              </h4>
                              {item.discountPercent > 0 ? (
                                <span className="bg-rose-50 text-rose-600 text-[9px] px-1.5 py-0.5 uppercase font-bold rounded inline-block mt-1 mb-1.5 tracking-wide border border-rose-100/50">
                                  -{item.discountPercent}% Limited Promo
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-600 text-[9px] px-1.5 py-0.5 uppercase font-bold rounded inline-block mt-1 mb-1.5 tracking-wide border border-emerald-100/50">
                                  Best Price
                                </span>
                              )}
                              <div className="flex items-baseline gap-1.5 text-xs font-mono">
                                <span className="font-bold text-slate-900">₦{item.price.toLocaleString()}</span>
                                {item.originalPrice > item.price && (
                                  <span className="text-[10px] text-slate-400 line-through">₦{item.originalPrice.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-450">No spotlight products available</div>
                )}
              </div>

              {!isProductsLoading && highlightItems.length > 0 && (
                <div className="space-y-3 mt-4 pt-2 border-t border-slate-50">
                  <button 
                    onClick={() => {
                      const item = highlightItems[highlightIndex];
                      if (item) handleViewProduct(item);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-colors py-2 rounded-lg text-center text-[10px] uppercase tracking-wider font-bold text-slate-600 cursor-pointer"
                  >
                    Inspect Specifications
                  </button>

                  <div className="flex items-center justify-between pt-0.5">
                    {/* Dots Progress Navigation */}
                    <div className="flex items-center gap-1.5">
                      {highlightItems.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setHighlightIndex(idx)}
                          className="focus:outline-none py-1.5 px-0.5 group cursor-pointer"
                          title={`Go to item ${idx + 1}`}
                          aria-label={`Go to slide ${idx + 1}`}
                        >
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              idx === highlightIndex 
                                ? 'w-4.5 bg-brand' 
                                : 'w-1.5 bg-slate-200 group-hover:bg-slate-350'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Left/Right Arrow controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setHighlightIndex(prev => (prev - 1 + highlightItems.length) % highlightItems.length)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Previous highlight"
                        aria-label="Previous Slide"
                      >
                        <ChevronRight className="transform rotate-180" size={14} />
                      </button>
                      <button
                        onClick={() => setHighlightIndex(prev => (prev + 1) % highlightItems.length)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Next highlight"
                        aria-label="Next Slide"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>
      )}

      {/* Core Body Container */}
      <main className={activeTab === 'ai' ? 'w-full flex-1 flex flex-col bg-[#0e0e10]' : (selectedProduct ? 'w-full flex-1 flex flex-col' : 'max-w-7xl mx-auto px-4 py-8 flex-1 w-full')}>
        
        {/* PRODUCT DETAIL PAGE (Takes over screen when active) */}
        {selectedProductWithRealRating && (
          <ProductDetailModal 
            product={selectedProductWithRealRating}
            allProducts={productsWithRealRatings}
            onViewProduct={handleViewProduct}
            onClose={handleCloseProduct}
            onAddToCart={handleAddToCartWithQty}
            isAdmin={isAdmin || isEditor}
            onRefreshProducts={() => setProductsRefreshTrigger(prev => prev + 1)}
          />
        )}

        {/* VIEW 1: SHOP CATALOG TAB */}
        {activeTab === 'shop' && !selectedProduct && (
          <div className="grid lg:grid-cols-4 gap-8">
            
            {/* Left Column: Adaptive filter sidebar */}
            <aside className="hidden lg:block space-y-6">
                       {/* Category selector */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-1.5 text-slate-850 font-display font-bold mb-3 tracking-wide text-xs">
                  <SlidersHorizontal size={14} className="text-brand" />
                  <span>System Categories</span>
                </div>

                <div className="space-y-1">
                  {['All', 'Solar Panels', 'Inverters', 'Batteries', 'Security Systems', 'Accessories'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex justify-between items-center ${
                        selectedCategory === cat 
                          ? 'bg-brand-light text-brand font-bold border-l-2 border-brand pl-2' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span>{cat}</span>
                      <ChevronRight size={12} className={selectedCategory === cat ? 'text-brand' : 'text-slate-300'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Price filter and High discount filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-display font-bold text-slate-800 tracking-wide border-b border-slate-100 pb-1.5">Refine Database</h4>
                
                {/* Price sorting */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 tracking-wider">Sort Cost Option</label>
                  <select
                    value={priceSort}
                    onChange={(e) => setPriceSort(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                  >
                    <option value="default">Default Sizing Rank</option>
                    <option value="low-high">Price: Low to High</option>
                    <option value="high-low">Price: High to Low</option>
                  </select>
                </div>

                {/* Percentage discount options */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 tracking-wider">SkyIT Promos</label>
                  <button
                    onClick={() => setDiscountFilter(prev => prev === 'high' ? 'All' : 'high')}
                    className={`w-full p-2.5 rounded-lg text-xs font-bold tracking-wide uppercase text-center border transition-all ${
                      discountFilter === 'high' 
                        ? 'bg-red-50 text-red-650 border-red-205 font-bold' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🔥 Promo Drops &gt;= 15%
                  </button>
                </div>

                {/* Reset triggers */}
                {(selectedCategory !== 'All' || searchQuery !== '' || priceSort !== 'default' || discountFilter !== 'All') && (
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                      setPriceSort('default');
                      setDiscountFilter('All');
                    }}
                    className="w-full bg-slate-150 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-center border border-slate-200"
                  >
                    Clear Search Criteria
                  </button>
                )}
              </div>

              {/* SkyIT AI Smart Vision box */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] tracking-widest font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded-sm inline-block">
                    SKYIT SMART VISION
                  </span>
                  <span className="text-[8px] font-mono text-slate-400">v1.2</span>
                </div>
                <h4 className="text-xs font-display font-bold leading-snug text-white uppercase tracking-wide">AI Visual Search Scanner</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Upload or snap a photo of any hardware, solar label, inverter, or battery to instantly find its exact match or closest model in our catalog!
                </p>
                <button
                  type="button"
                  onClick={triggerCameraSearch}
                  className="w-full bg-orange-500 hover:bg-orange-600 cursor-pointer text-white transition-all py-2 rounded-lg text-center font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
                >
                  <Camera size={13} />
                  Scan with Camera
                </button>
              </div>

              {/* AI Support helper promo box */}
              <div className="bg-brand-light border border-brand/10 text-slate-700 rounded-2xl p-4 shadow-3xs space-y-3 relative overflow-hidden lg:sticky lg:top-24">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand/10 to-brand-hover/5 rounded-full blur-xl pointer-events-none" />
                <span className="text-[9px] tracking-widest font-bold uppercase bg-brand text-white px-2 py-0.5 rounded-sm inline-block">
                  AI Engineering Expert
                </span>
                <h4 className="text-xs font-display font-bold leading-snug text-slate-800">let our AI design your optimal microgrid</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Describe your building shape, AC loads, and battery technology preference. Let the AI advisor write a professional hardware checklist instantly.
                </p>
                <button
                  onClick={() => setActiveTab('ai')}
                  className="w-full bg-brand hover:bg-brand-hover text-white transition-all py-2 rounded-lg text-center font-bold text-xs uppercase tracking-widest"
                >
                  Consult Advisor Chat
                </button>
              </div>

            </aside>

            {/* Right Column: Product Cards Grid Area */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Header result info */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-800">
                    SkyIT {selectedCategory} Catalog
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Showing {filteredProducts.length} Premium Architectural Results
                  </p>
                </div>

                {/* Mobile Filter toggle button */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                    className={`font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider px-3.1 py-2 rounded-xl border transition-all active:scale-95 ${
                      isMobileFiltersOpen 
                        ? 'bg-brand text-white border-brand shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal size={13} strokeWidth={2.5} />
                    <span>Filter</span>
                  </button>
                </div>
              </div>

              {/* Mobile Filter Panel (Shown inline when toggled) */}
              {isMobileFiltersOpen && (
                <div className="lg:hidden block bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-4 grid sm:grid-cols-2 animate-fade-in">
                  
                  {/* Category Sorter */}
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-3xs">
                    <div className="flex items-center gap-1.5 text-slate-800 font-display font-bold mb-3 tracking-wide text-xs">
                      <SlidersHorizontal size={13} className="text-brand font-bold" />
                      <span>System Categories</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                      {['All', 'Solar Panels', 'Inverters', 'Batteries', 'Security Systems', 'Accessories'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                          }}
                          className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex justify-between items-center ${
                            selectedCategory === cat 
                              ? 'bg-brand-light text-brand font-bold border-l-2 border-brand pl-2' 
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                        >
                          <span>{cat}</span>
                          <ChevronRight size={11} className={selectedCategory === cat ? 'text-brand' : 'text-slate-300'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Refine options */}
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-3xs space-y-4 animate-fade-in">
                    <h4 className="text-xs font-display font-bold text-slate-800 tracking-wide border-b border-slate-100 pb-1.5">Refine Database</h4>
                    
                    {/* Price sorting */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 tracking-wider">Sort Cost Option</label>
                      <select
                        value={priceSort}
                        onChange={(e) => setPriceSort(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                      >
                        <option value="default">Default Sizing Rank</option>
                        <option value="low-high">Price: Low to High</option>
                        <option value="high-low">Price: High to Low</option>
                      </select>
                    </div>

                    {/* Percentage discount options */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 tracking-wider">SkyIT Promos</label>
                      <button
                        onClick={() => setDiscountFilter(prev => prev === 'high' ? 'All' : 'high')}
                        className={`w-full p-2 rounded-lg text-xs font-bold tracking-wide uppercase text-center border transition-all ${
                          discountFilter === 'high' 
                            ? 'bg-red-50 text-red-650 border-red-200 font-bold' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🔥 Promo Drops &gt;= 15%
                      </button>
                    </div>

                    {/* Reset triggers */}
                    {(selectedCategory !== 'All' || searchQuery !== '' || priceSort !== 'default' || discountFilter !== 'All') && (
                      <button
                        onClick={() => {
                          setSelectedCategory('All');
                          setSearchQuery('');
                          setPriceSort('default');
                          setDiscountFilter('All');
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-150 text-slate-700 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-center border border-slate-200"
                      >
                        Clear Search Criteria
                      </button>
                    )}
                  </div>

                </div>
              )}

              {/* Grid block */}
              {isProductsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-16 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
                  <legend className="text-4xl text-slate-300">🔍</legend>
                  <h3 className="text-sm font-display font-semibold text-slate-700">No Catalog Hits Found</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Try adjusting search parameters, clearing filters, or requesting similar specifications from the AI Advisor.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {filteredProducts.map((prod) => (
                    <ProductCard 
                      key={prod.id}
                      product={prod}
                      onAddToCart={handleAddToCart}
                      onViewDetails={handleViewProduct}
                    />
                  ))}
                </div>
              )}

            </div>

          </div>
        )}

        {/* VIEW 3: ORDER TRACKING TAB */}
        {activeTab === 'tracker' && !selectedProduct && (
          <TrackingDashboard 
            initialOrderId={trackedOrderId} 
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginOpen(true)}
            onSelectProduct={(pId) => {
              const matched = productsWithRealRatings.find(p => p.id === pId);
              if (matched) {
                handleViewProduct(matched);
              }
            }}
          />
        )}

        {/* VIEW 4: GEMINI AI PERSONAL SHOPPER ASSISTANT TAB */}
        {activeTab === 'ai' && !selectedProduct && (
          <AiAssistant 
            onAddToCart={handleAddToCart}
            onViewProduct={(p) => handleViewProduct(p)}
            currentUser={currentUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isAdmin={isAdmin}
            isEditor={isEditor}
            onOpenCart={() => setIsCartOpen(true)}
            products={productsWithRealRatings}
            cart={cart}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        )}

        {/* VIEW 5: ADMIN LOGISTICS CONTROL TERMINAL */}
        {activeTab === 'admin' && (isAdmin || isEditor) && !selectedProduct && (
          <AdminPanel isUserAdmin={isAdmin} isUserEditor={isEditor} />
        )}

        {/* VIEW 6: CONTACT & SPECIFICATION DESK */}
        {activeTab === 'contact' && !selectedProduct && (
          <ContactSection />
        )}

      </main>

      {/* Core Brand Trust Footer */}
      {activeTab !== 'ai' && !selectedProduct && (
        <footer className="bg-slate-900 text-slate-450 py-10 mt-12 border-t border-slate-805">
        <div className="max-w-7xl mx-auto px-4 grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-xs leading-relaxed text-slate-400">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-0.5 rounded-md bg-white overflow-hidden w-7 h-7 flex items-center justify-center">
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                  alt="SkyIT Logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-display font-black text-white text-base">SkyIT Ventures</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Leading the deployment of smart energy microgrids, hybrid MPPT Pure Sine inverters, residential LFP lithium walls, starlight outdoor CCTV surveillance networks, and state-of-the-art commissioning engineering services.
            </p>
            {/* Highly Polished Interactive Social Links */}
            <div className="flex items-center gap-2 pt-1">
              <a 
                href="https://wa.me/2349074444140?text=Hello%20SkyIT%20Ventures%20team,%20I'd%20like%20to%20inquire%20about%20your%20solar%20solutions." 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-850/80 hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30 text-slate-400 border border-slate-800 flex items-center justify-center transition-all duration-300 group shadow-sm"
                aria-label="WhatsApp"
                id="social-whatsapp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 transition-transform group-hover:scale-110">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23c-1.48 0-2.93-.39-4.19-1.15l-.3-.17l-3.12.82l.83-3.04l-.2-.32a8.2 8.2 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31c-.22.25-.87.86-.87 2.07c0 1.22.89 2.39 1 2.56c.14.17 1.76 2.67 4.25 3.73c.59.27 1.05.42 1.41.53c.59.19 1.13.16 1.56.1c.48-.07 1.46-.6 1.67-1.18s.21-1.07.15-1.18c-.07-.1-.23-.16-.48-.27c-.25-.14-1.47-.74-1.69-.82c-.23-.08-.37-.12-.56.12c-.16.25-.64.81-.78.97c-.15.17-.29.19-.53.07c-.26-.13-1.06-.39-2-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.12-.24-.01-.39.11-.5c.11-.11.27-.29.37-.44c.13-.14.17-.25.25-.41c.08-.17.04-.31-.02-.43c-.06-.11-.56-1.35-.77-1.84c-.2-.48-.4-.42-.56-.43c-.14 0-.3-.01-.47-.01" />
                </svg>
              </a>
              <a 
                href="https://www.facebook.com/p/Skyit-Ventures-100044418501183/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-850/80 hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]/30 text-slate-400 border border-slate-800 flex items-center justify-center transition-all duration-300 group shadow-sm"
                aria-label="Facebook"
                id="social-fb"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 transition-transform group-hover:scale-110">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/skyit_ltd/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-850/80 hover:bg-[#E1306C]/10 hover:text-[#E1306C] hover:border-[#E1306C]/30 text-slate-400 border border-slate-800 flex items-center justify-center transition-all duration-300 group shadow-sm"
                aria-label="Instagram"
                id="social-instagram"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 transition-transform group-hover:scale-110">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a 
                href="https://tiktok.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-850/80 hover:bg-[#00F2EA]/10 hover:text-[#00F2EA] hover:border-[#00F2EA]/30 text-slate-400 border border-slate-800 flex items-center justify-center transition-all duration-300 group shadow-sm hidden"
                aria-label="TikTok"
                id="social-tiktok"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 transition-transform group-hover:scale-110">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-850/80 hover:bg-white/10 hover:text-white hover:border-white/30 text-slate-400 border border-slate-800 flex items-center justify-center transition-all duration-300 group shadow-sm hidden"
                aria-label="X (formerly Twitter)"
                id="social-x"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 transition-transform group-hover:scale-110">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a 
                href="https://ng.linkedin.com/company/skyit-limited" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-850/80 hover:bg-[#0077B5]/10 hover:text-[#0077B5] hover:border-[#0077B5]/30 text-slate-400 border border-slate-800 flex items-center justify-center transition-all duration-300 group shadow-sm"
                aria-label="LinkedIn"
                id="social-linkedin"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 transition-transform group-hover:scale-110">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase font-bold text-white tracking-widest mb-3 font-display">Head Office Portal</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              KM 1 DSC Expressway beside Jesus Temple Church, Ebrumede, Effurun-Warri, Delta State
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase font-bold text-white tracking-widest mb-3 font-display">Lagos Branch</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Manjo Plaza, NNPC Service Station, Ikota, Second Gate, K.M 22, Lekki-Epe Expressway, Lekki, Lagos
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-white tracking-widest font-display">Technical Support</h4>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <p className="font-mono text-slate-300">
                +234-9135396292 <br />
                +234-9074444140 <br />
                +234-9017777773 <br />
                +234-9017777774
              </p>
              <p className="text-sky-400 hover:text-sky-300 transition-colors font-bold underline truncate">
                <a href="mailto:skyitventures01@gmail.com">skyitventures01@gmail.com</a>
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab('contact');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-[10.5px] font-black uppercase tracking-wider py-2.5 px-3 rounded-lg text-center transition-all shadow-md shadow-sky-500/10 w-full cursor-pointer border border-sky-400"
            >
              📥 Submit Sizing Inquiry
            </button>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:pr-24 pt-6 mt-6 border-t border-slate-800 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 SkyIT Ventures Limited. All rights reserved. Built with premium Vite & React.</span>
          <div className="flex gap-4 flex-wrap justify-center">
            <button 
              onClick={() => { setPolicyTab('installation'); setIsPolicyOpen(true); }}
              className="cursor-pointer hover:text-white transition-colors border-none bg-transparent p-0"
              id="footer-terms-btn"
            >
              Terms of Installation
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button 
              onClick={() => { setPolicyTab('engineering'); setIsPolicyOpen(true); }}
              className="cursor-pointer hover:text-white transition-colors border-none bg-transparent p-0"
              id="footer-engineering-btn"
            >
              Engineering Policies
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button 
              onClick={() => { setPolicyTab('return'); setIsPolicyOpen(true); }}
              className="cursor-pointer hover:text-white transition-colors border-none bg-transparent p-0"
              id="footer-return-btn"
            >
              Return Policy
            </button>
          </div>
        </div>
      </footer>
    )}

      {/* CORE FLOATING MODALS & DRAWER PORTALS */}
      
      {/* Cart Drawer Slideover */}
      <CartSidebar 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        currentUser={currentUser}
        onInitiateCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Secure Payment Gateway Checkout Modal */}
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        onOrderSuccess={handleOrderSuccess}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Account Authentication modal popup */}
      <LoginModal 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Flutterwave Safe Server Redirect Process Overlay */}
      {verificationFeedback.status !== 'idle' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-8 text-center shadow-2xl relative overflow-hidden transition-all">
            {verificationFeedback.status === 'verifying' && (
              <div className="flex flex-col items-center py-6">
                <div className="relative size-16 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                  <Zap size={24} className="text-blue-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Verifying Payment</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  {verificationFeedback.message}
                </p>
                <div className="mt-4 px-3 py-1 bg-blue-50 text-[11px] font-mono text-blue-600 rounded-full uppercase tracking-wider animate-pulse">
                  Standard Redirect Gate
                </div>
              </div>
            )}

            {verificationFeedback.status === 'success' && (
              <div className="flex flex-col items-center py-6">
                <div className="size-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                  <ShieldCheck size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Secure Order Confirmed!</h3>
                <p className="text-sm text-slate-500 mt-2">
                  {verificationFeedback.message}
                </p>
                <button 
                  onClick={() => setVerificationFeedback({ status: 'idle', message: '' })}
                  className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold tracking-wide transition shadow-lg shadow-slate-900/10"
                >
                  Enter Live Tracker
                </button>
              </div>
            )}

            {verificationFeedback.status === 'error' && (
              <div className="flex flex-col items-center py-6">
                <div className="size-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100">
                  <AlertTriangle size={32} className="text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Transaction Notice</h3>
                <p className="text-sm text-slate-500 mt-2">
                  {verificationFeedback.message}
                </p>
                <button 
                  onClick={() => setVerificationFeedback({ status: 'idle', message: '' })}
                  className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold tracking-wide transition shadow-lg shadow-slate-900/10"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Edit Component */}
      <ProfileEditModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={() => {
          // Sync update across session memory safely
          const user = auth.currentUser;
          if (user) {
            setCurrentUser({
              ...currentUser,
              displayName: user.displayName,
              photoURL: user.photoURL
            });
          }
        }}
      />

      {/* Corporate Policy Documents (Nigerian Standards) */}
      <PolicyModal 
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
        initialTab={policyTab}
      />

      {/* Dynamic green Toast notification for "Added to Cart" */}
      <AnimatePresence>
        {cartNotification?.show && (
          <motion.div
            key="cart-notification"
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[9999] w-[92%] max-w-sm bg-white rounded-2xl shadow-xl border border-emerald-100 p-4 overflow-hidden flex flex-col gap-3"
            style={{
              boxShadow: '0 20px 25px -5px rgb(16 185 129 / 0.05), 0 8px 10px -6px rgb(16 185 129 / 0.05), 0 0 0 1px rgb(16 185 129 / 0.1)'
            }}
          >
            {/* Soft decorative top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100/50 shrink-0">
                <CheckCircle2 size={20} className="animate-pulse" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-slate-900 text-sm leading-snug">Added to Cart!</h4>
                <p className="text-slate-500 text-xs mt-0.5 truncate font-medium">
                  {cartNotification.productName}
                </p>
              </div>

              <button
                onClick={() => setCartNotification(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100">
              {cartNotification.productImage && (
                <div className="size-8 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <img
                    src={cartNotification.productImage}
                    alt={cartNotification.productName}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="flex-1 text-[11px] text-slate-400 font-medium">
                Added to your solar order
              </div>
              <button
                onClick={() => {
                  setCartNotification(null);
                  setIsCartOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition duration-150 cursor-pointer border-none flex items-center gap-1 shadow-xs hover:shadow-md"
              >
                <span>View Cart</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input for SkyIT AI Vision Search */}
      <input 
        type="file" 
        ref={cameraFileInputRef} 
        onChange={handleCameraSearchUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* SkyIT AI Smart Vision Search Modal */}
      <AiVisualSearchModal
        isOpen={isAiSearchModalOpen}
        onClose={() => setIsAiSearchModalOpen(false)}
        isSearching={isAiSearching}
        result={aiSearchResult}
        error={aiSearchError}
        products={productsWithRealRatings}
        onSelectProduct={handleViewProduct}
        onRetry={triggerCameraSearch}
        imagePreviewUrl={scanImagePreview}
      />

      {/* Floating Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-to-top"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg border border-slate-700/50 flex items-center justify-center cursor-pointer group"
            aria-label="Scroll to top"
          >
            <ArrowUp size={20} className="transition-transform group-hover:-translate-y-0.5" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
