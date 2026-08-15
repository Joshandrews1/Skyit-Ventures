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
import { AboutSection } from './components/AboutSection';
import { OwnerSection } from './components/OwnerSection';
import { BlogSection } from './components/BlogSection';
import { defaultBlogPosts } from './data/blogPosts';
import { BlogPost } from './types';
import { Breadcrumbs } from './components/Breadcrumbs';
import { FullHomePage } from './components/FullHomePage';
import { WishlistModal } from './components/WishlistModal';
import { HeroSection } from './components/HeroSection';
import { SolarPackages } from './components/SolarPackages';
import { InteractiveTour } from './components/InteractiveTour';
import { RecentlyViewedPage } from './components/RecentlyViewedPage';
import { NotificationsPage } from './components/NotificationsPage';
import { UserNotification } from './types';
import { subscribeUserNotifications, clearLocalNotifications, markAllNotificationsAsRead } from './lib/notificationService';
import { Compass, ClipboardList, LayoutDashboard, Info, ChevronDown, Phone, Home, BookOpen, UserCheck, Award, Heart, Settings, LogOut, Clock, Sun, Moon, Bell } from 'lucide-react';
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
  ShieldAlert,
  KeyRound,
  Menu,
  X,
  AlertTriangle,
  Store,
  ArrowUp,
  Check,
  CheckCircle2,
  Camera,
  Package
} from 'lucide-react';

import { AdminLoginCard } from './components/AdminLoginCard';
import { logSiteVisit, logUserLoginPinpoint } from './lib/visitorTracker';

export default function App() {
  // Navigation State
  const [activeTab, _setActiveTab] = useState<'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner' | 'recently-viewed' | 'notifications'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as any;
    if (['home', 'shop', 'quote', 'ai', 'tracker', 'admin', 'contact', 'about', 'blog', 'owner', 'recently-viewed', 'notifications'].includes(tabParam)) {
      return tabParam;
    }
    return (localStorage.getItem('activeTab') as any) || 'home';
  });

  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'blog_posts'), (snapshot) => {
      const list: BlogPost[] = [];
      snapshot.forEach(docSnap => list.push(docSnap.data() as BlogPost));
      setBlogPosts(list);
    }, (err) => {
      console.warn("Blog posts Firestore sync notice:", err);
    });
    return () => unsub();
  }, []);

  // Deep-link auto-opener for SEO & direct article links (?tab=blog&post=slug-or-id)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postParam = params.get('post') || params.get('article');
    if (postParam && blogPosts.length > 0) {
      const match = blogPosts.find(p => p.slug === postParam || p.id === postParam);
      if (match) {
        setSelectedBlogPost(match);
        _setActiveTab('blog');
      }
    }
  }, [blogPosts]);

  const setActiveTab = (tab: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner' | 'recently-viewed' | 'notifications', pushToHistory = true) => {
    _setActiveTab(tab);
    setSelectedProduct(null); // Clear selected product modal on navigation
    setSelectedBlogPost(null); // Clear selected blog post on navigation
    setIsCartOpen(false);
    setIsMobileMenuOpen(false);
    localStorage.setItem('activeTab', tab);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    
    if (pushToHistory) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') !== tab) {
        params.set('tab', tab);
        if (tab !== 'shop' && tab !== 'home') {
          params.delete('product'); // Clear selected product when navigating away
        }
        if (tab !== 'blog') {
          params.delete('post');
        }
        window.history.pushState({ tab }, '', `?${params.toString()}`);
      }
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(true);
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Check if user has completed interactive tour previously
  useEffect(() => {
    const hasCompleted = localStorage.getItem('hasCompletedSkyITInteractiveTour');
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setIsOnboardingOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Theme State (Locked to Dark Mode)
  const [theme] = useState<'dark'>('dark');

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem('skyit_theme', 'dark');
  }, []);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [adminQuickEditMode, setAdminQuickEditMode] = useState<boolean>(() => localStorage.getItem('skyit_admin_mode_enabled') === 'true');

  // Subscribe to real-time user activity & security notifications
  useEffect(() => {
    const email = currentUser?.email || undefined;
    const uid = currentUser?.uid || undefined;
    const unsub = subscribeUserNotifications(email, uid, (updatedNotifications) => {
      setNotifications(updatedNotifications);
    });
    return () => unsub();
  }, [currentUser]);
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

  // Initialize URL sync & Log site visit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('tab') && activeTab !== 'home') {
      params.set('tab', activeTab);
      window.history.replaceState({ tab: activeTab }, '', `?${params.toString()}`);
    } else if (!params.get('tab')) {
      // Set to home explicitly so we have a clean history stack state
      params.set('tab', 'home');
      window.history.replaceState({ tab: 'home' }, '', `?${params.toString()}`);
    }

    // Record site visit telemetry
    logSiteVisit(activeTab);
  }, [activeTab]);

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

          // 5. Log high-precision user login pinpoint to site_visits (read by both Admin Map and User Profile Map)
          const sessionLoginKey = `skyit_pinpoint_logged_${user.uid}_${nowStr.slice(0, 13)}`;
          if (!sessionStorage.getItem(sessionLoginKey) && user.email) {
            sessionStorage.setItem(sessionLoginKey, 'true');
            logUserLoginPinpoint(user.email, user.displayName || undefined);
          }
        } catch (err) {
          console.warn("User directory synchronization ignored: ", err);
        }
      } else {
        localStorage.removeItem('skyit_sim_admin');
        setCurrentUser(null);
        setIsAdmin(false);
        setIsEditor(false);
        setCart([]);
        localStorage.removeItem('skyit_shopping_cart');
        setWishlistIds([]);
        localStorage.removeItem('skyit_wishlist');
        setRecentlyViewedIds([]);
        localStorage.removeItem('skyit_recently_viewed');
        setNotifications([]);
        clearLocalNotifications();
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
    
    // Clear cart, wishlist, recently viewed & notifications upon logout for data security & privacy
    setCart([]);
    localStorage.removeItem('skyit_shopping_cart');

    setWishlistIds([]);
    localStorage.removeItem('skyit_wishlist');

    setRecentlyViewedIds([]);
    localStorage.removeItem('skyit_recently_viewed');

    setNotifications([]);
    clearLocalNotifications();

    setCurrentUser(null);
    setIsAdmin(false);
    setIsEditor(false);

    if (activeTab === 'admin' || activeTab === 'notifications' || activeTab === 'recently-viewed') {
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

  // Ensure page scrolls to top whenever activeTab or selectedProduct changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab, selectedProduct]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [trackedOrderId, setTrackedOrderId] = useState<string>('');

  // Wishlist & Recently Viewed State
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('skyit_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlistToast, setWishlistToast] = useState<{
    show: boolean;
    product: Product;
    added: boolean;
  } | null>(null);

  useEffect(() => {
    if (wishlistToast?.show) {
      const timer = setTimeout(() => {
        setWishlistToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [wishlistToast]);

  // Load user wishlist & recently viewed from Firestore when user logs in
  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    const loadUserLists = async () => {
      try {
        const wishRef = doc(db, 'wishlists', currentUser.uid);
        const wishSnap = await getDoc(wishRef);
        if (active && wishSnap.exists() && Array.isArray(wishSnap.data()?.ids)) {
          setWishlistIds(wishSnap.data()?.ids || []);
        }

        const rvRef = doc(db, 'recently_viewed', currentUser.uid);
        const rvSnap = await getDoc(rvRef);
        if (active && rvSnap.exists() && Array.isArray(rvSnap.data()?.ids)) {
          setRecentlyViewedIds(rvSnap.data()?.ids || []);
        }
      } catch (err) {
        console.warn("Failed loading user profile lists:", err);
      }
    };

    loadUserLists();
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('skyit_wishlist', JSON.stringify(wishlistIds));
      if (currentUser) {
        const wishRef = doc(db, 'wishlists', currentUser.uid);
        setDoc(wishRef, { ids: wishlistIds, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn("Failed to save wishlist", e);
    }
  }, [wishlistIds, currentUser]);

  const handleToggleWishlist = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlistIds(prev => {
      const isAlreadyInWishlist = prev.includes(product.id);
      if (isAlreadyInWishlist) {
        setWishlistToast({ show: true, product, added: false });
        return prev.filter(id => id !== product.id);
      } else {
        setWishlistToast({ show: true, product, added: true });
        return [...prev, product.id];
      }
    });
  };

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('skyit_recently_viewed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addToRecentlyViewed = (productId: string) => {
    setRecentlyViewedIds(prev => {
      const filtered = prev.filter(id => id !== productId);
      const updated = [productId, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('skyit_recently_viewed', JSON.stringify(updated));
        if (currentUser) {
          const rvRef = doc(db, 'recently_viewed', currentUser.uid);
          setDoc(rvRef, { ids: updated, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      } catch (e) {
        console.warn("Failed to save recently viewed", e);
      }
      return updated;
    });
  };

  const handleClearRecentlyViewed = () => {
    setRecentlyViewedIds([]);
    try {
      localStorage.removeItem('skyit_recently_viewed');
    } catch (e) {
      console.warn("Failed to clear recently viewed", e);
    }
  };

  const handleRemoveFromRecentlyViewed = (productId: string) => {
    setRecentlyViewedIds(prev => {
      const updated = prev.filter(id => id !== productId);
      try {
        localStorage.setItem('skyit_recently_viewed', JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to update recently viewed", e);
      }
      return updated;
    });
  };

  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

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
  const [initialAiPrompt, setInitialAiPrompt] = useState<string>('');

  const handleConsultPackage = (pkg: any) => {
    const prompt = `Can you explain more about the ${pkg.name} (${pkg.kva} System, ₦${pkg.price.toLocaleString()})? Please break down its battery specifications (${pkg.batteryInfo}), solar panels (${pkg.panels} panels), heavy appliance & AC support (${pkg.acSupport}), and why it is a great choice for my clean power setup.`;
    setInitialAiPrompt(prompt);
    setActiveTab('ai');
  };

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

  // Handle Mobile Browser Back Button & Unified History Navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);

      // 1. Intercept active drawers / overlays (close top overlay on mobile back button tap)
      if (isCartOpen) {
        setIsCartOpen(false);
        return;
      }
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return;
      }
      if (isCheckoutOpen) {
        setIsCheckoutOpen(false);
        return;
      }
      if (isWishlistModalOpen) {
        setIsWishlistModalOpen(false);
        return;
      }
      if (isLoginOpen) {
        setIsLoginOpen(false);
        return;
      }
      if (isProfileOpen) {
        setIsProfileOpen(false);
        return;
      }
      if (isPolicyOpen) {
        setIsPolicyOpen(false);
        return;
      }
      if (isAiSearchModalOpen) {
        setIsAiSearchModalOpen(false);
        return;
      }

      // 2. Handle product modal based on URL parameter
      const productIdParam = params.get('product');
      if (productIdParam && products.length > 0) {
        const p = products.find(prod => prod.id === productIdParam);
        setSelectedProduct(p || null);
      } else {
        setSelectedProduct(null);
      }

      // 3. Handle blog post detail based on URL parameter
      const postParam = params.get('post') || params.get('article');
      if (postParam && blogPosts.length > 0) {
        const match = blogPosts.find(p => p.slug === postParam || p.id === postParam);
        setSelectedBlogPost(match || null);
      } else if (!postParam && selectedBlogPost) {
        setSelectedBlogPost(null);
      }

      // 4. Handle tab navigation across ALL supported tabs
      const validTabs = ['home', 'shop', 'quote', 'ai', 'tracker', 'admin', 'contact', 'about', 'blog', 'owner', 'recently-viewed', 'notifications'];
      const tabParam = params.get('tab') as any;
      if (validTabs.includes(tabParam)) {
        _setActiveTab(tabParam);
        localStorage.setItem('activeTab', tabParam);
      } else if (!tabParam && !productIdParam) {
        _setActiveTab('home');
        localStorage.setItem('activeTab', 'home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isCartOpen, 
    isMobileMenuOpen, 
    isCheckoutOpen, 
    isWishlistModalOpen, 
    isLoginOpen, 
    isProfileOpen, 
    isPolicyOpen, 
    isAiSearchModalOpen, 
    selectedBlogPost, 
    products, 
    blogPosts
  ]);

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
    addToRecentlyViewed(p.id);
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

        // Cache in browser local storage
        try {
          localStorage.setItem('skyit_products_cache', JSON.stringify(merged));
        } catch (storageErr) {
          console.warn("Could not save products to local storage cache:", storageErr);
        }

        setProducts(merged);
        setIsProductsLoading(false);
      } catch (error) {
        console.warn("Firestore 'products' fetch notice/timeout, using rest query fallback:", error);
        if (!active) return;
        
        fetch('/api/products')
          .then(res => res.ok ? res.json() : Promise.reject("REST API failed"))
          .then(data => {
            if (!active) return;
            // Cache in local storage
            try {
              localStorage.setItem('skyit_products_cache', JSON.stringify(data));
            } catch (storageErr) {
              console.warn("Could not save products to local storage cache from API:", storageErr);
            }
            setProducts(data);
            setIsProductsLoading(false);
          })
          .catch((apiErr) => {
            console.warn("REST API products fetch failed:", apiErr);
            if (!active) return;

            // Try local storage cache fallback
            const cached = localStorage.getItem('skyit_products_cache');
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  console.log("Serving products from local storage cache fallback.");
                  setProducts(parsed);
                  setIsProductsLoading(false);
                  return;
                }
              } catch (e) {
                console.warn("Failed to parse cached local storage products:", e);
              }
            }

            // Absolute fallback to pre-populated mockProducts
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
    <div className="min-h-screen text-slate-600 font-sans flex flex-col transition-colors duration-300 bg-[#0e131e]">
      
      {/* Top micro announcement bar */}
      {activeTab === 'home' && (
        <div className="bg-brand text-white text-[8px] sm:text-[10px] py-1.5 sm:py-2 px-4 text-center font-bold tracking-normal sm:tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 uppercase">
          <Gift size={16} className="animate-bounce shrink-0" />
          <span>SkyIT Launch Sale: Free Logistics Deployment & site commissioning on all system kits above ₦500,000!</span>
        </div>
      )}

      {/* Main Global Dark Premium Navbar */}
      {activeTab !== 'ai' && (
        <header className="docked full-width top-0 sticky z-[100] border-b border-white/10 bg-[#0e131e]/95 backdrop-blur-xl shadow-md font-sans text-[#dee2f2]">
          <div className="flex justify-between items-center px-3 sm:px-5 xl:px-8 py-2.5 sm:py-3 max-w-[1440px] mx-auto w-full gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
            
            {/* Logo Branding */}
            <div 
              onClick={() => {
                setSelectedCategory('All');
                setActiveTab('home');
                setSearchQuery('');
                setSelectedProduct(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
            >
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 xl:w-10 xl:h-10 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                  alt="SkyIT Ventures Logo" 
                  className="w-full h-full object-contain rounded-[10px] bg-white p-0.5"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] sm:text-[19px] xl:text-[22px] font-bold text-white tracking-tight font-display leading-tight">SkyIT<span className="hidden sm:inline text-[#0066ff]"> Ventures</span></span>
                <span className="text-[8px] xl:text-[9.5px] text-[#a0a8c2] uppercase tracking-[0.14em] font-semibold hidden xl:block">Solar & Security Systems</span>
              </div>
            </div>

            {/* Desktop Navigation links */}
            <nav className="hidden lg:flex items-center gap-3.5 xl:gap-6 2xl:gap-8 text-[13px] xl:text-[14px] font-medium text-[#c2c6d8] whitespace-nowrap">
              {/* Shop Hardware Dropdown */}
              <div className="relative shrink-0" onMouseLeave={() => setIsShopMenuOpen(false)}>
                <button 
                  type="button"
                  onClick={() => { setSelectedCategory('All'); setActiveTab('shop'); setSelectedProduct(null); }}
                  onMouseEnter={() => setIsShopMenuOpen(true)}
                  className={`hover:text-[#b3c5ff] transition-colors flex items-center gap-1 cursor-pointer py-1 whitespace-nowrap ${activeTab === 'shop' ? 'text-[#3898ff] font-bold underline decoration-2 underline-offset-4' : ''}`}
                >
                  <span>Shop Hardware</span>
                  <ChevronDown size={14} />
                </button>

                {isShopMenuOpen && (
                  <div 
                    className="absolute top-full left-0 w-52 bg-[#171b27] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in space-y-1"
                    onMouseEnter={() => setIsShopMenuOpen(true)}
                  >
                    {['All', 'Solar Panels', 'Inverters', 'Batteries', 'Security Systems', 'Accessories'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setActiveTab('shop');
                          setSelectedProduct(null);
                          setIsShopMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#dee2f2] hover:bg-[#0066ff]/20 hover:text-[#b3c5ff] transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>{cat === 'All' ? 'All Catalog' : cat}</span>
                        <ChevronRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="button"
                onClick={() => { setActiveTab('quote'); setSelectedProduct(null); }}
                className={`hover:text-[#b3c5ff] transition-colors cursor-pointer py-1 whitespace-nowrap shrink-0 ${activeTab === 'quote' ? 'text-[#3898ff] font-bold underline decoration-2 underline-offset-4' : ''}`}
              >
                Packages
              </button>

              <button 
                type="button"
                onClick={() => { setActiveTab('ai'); setSelectedProduct(null); }}
                className="hover:text-[#b3c5ff] transition-colors cursor-pointer flex items-center gap-1.5 text-amber-400 font-bold py-1 whitespace-nowrap shrink-0"
              >
                <Sparkles size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                <span className="whitespace-nowrap">AI Advisor</span>
              </button>

              <button 
                type="button"
                onClick={() => { setActiveTab('tracker'); setSelectedProduct(null); }}
                className={`hover:text-[#b3c5ff] transition-colors cursor-pointer py-1 whitespace-nowrap shrink-0 ${activeTab === 'tracker' ? 'text-[#3898ff] font-bold underline decoration-2 underline-offset-4' : ''}`}
              >
                Tracker
              </button>

              <button 
                type="button"
                onClick={() => { setActiveTab('blog'); setSelectedProduct(null); }}
                className={`hover:text-[#b3c5ff] transition-colors cursor-pointer py-1 whitespace-nowrap shrink-0 ${activeTab === 'blog' ? 'text-[#3898ff] font-bold underline decoration-2 underline-offset-4' : ''}`}
              >
                Blog
              </button>

              {/* More Links Dropdown */}
              <div className="relative shrink-0" onMouseLeave={() => setIsMoreMenuOpen(false)}>
                <button 
                  type="button"
                  onMouseEnter={() => setIsMoreMenuOpen(true)}
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="hover:text-[#b3c5ff] transition-colors flex items-center gap-1 cursor-pointer py-1 whitespace-nowrap"
                >
                  <span>More</span>
                  <ChevronDown size={14} />
                </button>

                {isMoreMenuOpen && (
                  <div 
                    className="absolute top-full right-0 w-56 bg-[#171b27] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in space-y-1"
                    onMouseEnter={() => setIsMoreMenuOpen(true)}
                  >
                    <button
                      type="button"
                      onClick={() => { setActiveTab('about'); setSelectedProduct(null); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#dee2f2] hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Info size={15} className="text-indigo-400" />
                      <span>About SkyIT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('recently-viewed'); setSelectedProduct(null); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#dee2f2] hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Clock size={15} className="text-blue-400" />
                      <span>Recently Viewed</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('owner'); setSelectedProduct(null); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#dee2f2] hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <UserCheck size={15} className="text-sky-400" />
                      <span>Managing Director</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('contact'); setSelectedProduct(null); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#dee2f2] hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Phone size={15} className="text-emerald-400" />
                      <span>Contact Support</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsOnboardingOpen(true); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#b3c5ff] bg-[#0066ff]/15 hover:bg-[#0066ff]/25 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Compass size={15} className="text-[#0066ff]" />
                      <span>Interactive App Tour</span>
                    </button>





                    {(isAdmin || isEditor) && (
                      <div className="space-y-1.5 pt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => { setActiveTab('admin'); setSelectedProduct(null); setIsMoreMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <LayoutDashboard size={15} className="text-rose-400" />
                          <span>Admin Control Deck</span>
                        </button>

                        <div className="px-3 py-2 bg-[#0e131e] border border-amber-500/30 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                            <ShieldCheck size={14} className={adminQuickEditMode ? "text-amber-400" : "text-slate-500"} />
                            <span>Quick Edit</span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={adminQuickEditMode}
                            onClick={() => {
                              const nextState = !adminQuickEditMode;
                              setAdminQuickEditMode(nextState);
                              localStorage.setItem('skyit_admin_mode_enabled', String(nextState));
                            }}
                            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              adminQuickEditMode ? 'bg-amber-500' : 'bg-slate-700'
                            }`}
                            title={adminQuickEditMode ? "Disable Quick Edit Mode" : "Enable Quick Edit Mode"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                adminQuickEditMode ? 'translate-x-3.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* Right Controls: Search, Theme Toggle, Wishlist, Cart, User HUD, Mobile Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 shrink-0">

              {/* Search Button for ALL screens */}
              <button 
                id="tour-search-bar"
                type="button"
                onClick={() => {
                  setIsMobileSearchExpanded(!isMobileSearchExpanded);
                  setIsMobileMenuOpen(false);
                }}
                className="text-[#c2c6d8] hover:text-[#b3c5ff] transition-all cursor-pointer p-2 rounded-xl bg-[#171b27] border border-white/10 hover:border-white/20 active:scale-95 flex items-center justify-center"
                title="Search products and packages"
              >
                <Search size={18} />
              </button>

              {/* AI Sparkle Icon Button (Visible on Mobile & Tablet Portrait; Desktop/Tablet Landscape uses the Center Nav link) */}
              <button 
                type="button"
                id="tour-ai-btn"
                onClick={() => {
                  setActiveTab('ai');
                  setSelectedProduct(null);
                  setIsMobileMenuOpen(false);
                  setIsUserDropdownOpen(false);
                  setIsCartOpen(false);
                }}
                className={`lg:hidden p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                  activeTab === 'ai'
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                    : 'text-[#c2c6d8] hover:text-[#b3c5ff] border-white/10 bg-[#171b27] hover:border-white/20'
                }`}
                title="AI Advisor"
                aria-label="AI Advisor"
              >
                <Sparkles size={18} className={activeTab === 'ai' ? 'text-slate-950' : 'text-amber-400'} />
              </button>

              {/* Wishlist Button (Desktop/Tablet Header - Hidden on Mobile) */}
              <button 
                type="button"
                onClick={() => {
                  setIsWishlistModalOpen(true);
                  setIsMobileMenuOpen(false);
                  setIsUserDropdownOpen(false);
                  setIsCartOpen(false);
                }}
                className="relative text-[#c2c6d8] hover:text-[#b3c5ff] p-2 rounded-xl border border-white/10 bg-[#171b27] hover:border-white/20 transition-all cursor-pointer hidden sm:flex items-center justify-center active:scale-95"
                title="View Wishlist"
              >
                <Heart size={18} className="text-rose-400 fill-rose-400/20" />
                {wishlistIds.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#0e131e]">
                    {wishlistIds.length}
                  </span>
                )}
              </button>

              {/* Notifications Activity Bell Button */}
              <button 
                type="button"
                id="tour-notifications-btn"
                onClick={() => { 
                  setActiveTab('notifications'); 
                  markAllNotificationsAsRead(currentUser?.email);
                  setSelectedProduct(null); 
                  setIsMobileMenuOpen(false);
                  setIsUserDropdownOpen(false);
                  setIsCartOpen(false);
                }}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                  activeTab === 'notifications'
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                    : 'text-[#c2c6d8] hover:text-[#b3c5ff] border-white/10 bg-[#171b27] hover:border-white/20'
                }`}
                title="Activity & Security Notifications"
              >
                <Bell size={18} className={activeTab === 'notifications' ? 'text-slate-950' : 'text-amber-400'} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#0e131e] animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>


              {/* Shopping Cart Button */}
              <button 
                type="button"
                id="tour-cart-btn"
                onClick={() => {
                  setIsCartOpen(true);
                  setIsMobileMenuOpen(false);
                  setIsUserDropdownOpen(false);
                }}
                className="relative bg-[#0066ff] text-white p-2 xl:px-4 xl:py-2 rounded-xl font-bold active:scale-95 duration-150 shadow-lg cursor-pointer hover:bg-[#0052cc] transition-all flex items-center gap-1.5 text-[13px]"
                title="View Cart"
              >
                <ShoppingBag size={18} />
                <span className="hidden xl:inline">Cart</span>
                {totalCartItems > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0e131e] -ml-0.5 sm:ml-0.5">
                    {totalCartItems}
                  </span>
                )}
              </button>

              {/* User Account / Login Button */}
              {currentUser ? (
                <div className="relative hidden sm:block pl-2 border-l border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isUserDropdownOpen;
                      setIsUserDropdownOpen(nextState);
                      if (nextState) {
                        setIsMobileMenuOpen(false);
                        setIsCartOpen(false);
                      }
                    }}
                    className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#171b27] border border-white/20 flex items-center justify-center text-[#b3c5ff] font-bold text-xs shadow-inner overflow-hidden">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="User Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span>{(currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-[12px] font-bold text-[#dee2f2] truncate max-w-[80px]">
                      {currentUser.displayName ? currentUser.displayName.split(' ')[0] : (currentUser.email ? currentUser.email.split('@')[0] : 'Account')}
                    </span>
                    <ChevronDown size={14} className="text-[#8e95b0]" />
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#171b27] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 divide-y divide-white/5">
                      <div className="px-3 py-2">
                        <div className="text-xs font-bold text-[#dee2f2] truncate">{currentUser.displayName || currentUser.email}</div>
                        <div className="text-xs text-[#b3c5ff]">{isAdmin ? 'Administrator' : (isEditor ? 'Staff Editor' : 'Customer')}</div>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setIsMobileMenuOpen(false);
                            setIsCartOpen(false);
                            setActiveTab('notifications');
                            setSelectedProduct(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-[#dee2f2] hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Bell size={14} className="text-amber-400" />
                            <span>Notifications</span>
                          </div>
                          {notifications.filter(n => !n.read).length > 0 && (
                            <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full">
                              {notifications.filter(n => !n.read).length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setIsMobileMenuOpen(false);
                            setIsCartOpen(false);
                            setIsProfileOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-[#dee2f2] hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Settings size={14} className="text-[#b3c5ff]" />
                          Profile Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setIsMobileMenuOpen(false);
                            setIsCartOpen(false);
                            setActiveTab('admin');
                            setSelectedProduct(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-[#dee2f2] hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <LayoutDashboard size={14} className="text-amber-400" />
                          Control Deck
                        </button>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setIsMobileMenuOpen(false);
                            setIsCartOpen(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-bold"
                        >
                          <LogOut size={14} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="hidden md:block font-bold text-[#dee2f2] hover:text-[#b3c5ff] transition-colors cursor-pointer text-[13px] px-2 py-1"
                >
                  Login
                </button>
              )}

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isMobileMenuOpen;
                  setIsMobileMenuOpen(nextState);
                  if (nextState) {
                    setIsUserDropdownOpen(false);
                    setIsCartOpen(false);
                    setIsMobileSearchExpanded(false);
                  }
                }}
                className="lg:hidden text-[#c2c6d8] hover:text-[#b3c5ff] p-2 rounded-xl border border-white/10 bg-[#171b27] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Search Expansion Panel (All screen sizes) */}
          {isMobileSearchExpanded && (
            <div className="border-t border-white/10 bg-[#121623] px-4 sm:px-8 py-3 animate-fade-in shadow-xl">
              <div className="max-w-[1440px] mx-auto space-y-2">
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 text-[#8e95b0] pointer-events-none" size={16} />
                  <input 
                    type="text"
                    placeholder="Search solar panels, inverters, batteries, packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedCategory('All');
                        setActiveTab('shop');
                        setSelectedProduct(null);
                        setIsMobileSearchExpanded(false);
                      }
                    }}
                    className="w-full bg-[#171b27] border border-white/20 text-[#dee2f2] placeholder-[#8e95b0] text-base sm:text-sm rounded-xl pl-10 pr-16 py-2.5 focus:outline-none focus:border-[#0066ff] shadow-inner"
                  />
                  <button 
                    type="button"
                    onClick={triggerCameraSearch}
                    title="Search with Smart Vision Camera"
                    className="absolute right-9 text-[#8e95b0] hover:text-[#b3c5ff] p-1 cursor-pointer transition-colors"
                  >
                    <Camera size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsMobileSearchExpanded(false);
                      setSearchQuery('');
                    }}
                    className="absolute right-2.5 text-[#8e95b0] hover:text-white p-1 cursor-pointer transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search Dropdown Suggestions */}
                {filteredSuggestions.length > 0 && searchQuery.trim().length > 0 && (
                  <div className="bg-[#171b27] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 shadow-2xl max-h-80 overflow-y-auto">
                    {filteredSuggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          addToRecentlyViewed(p.id);
                          setIsMobileSearchExpanded(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-2.5 hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer"
                      >
                        <img src={p.image} alt={p.name} className="w-9 h-9 rounded-lg border border-white/10 object-cover shrink-0" referrerPolicy="no-referrer" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate text-[#dee2f2] text-xs sm:text-sm">{p.name}</div>
                          <div className="text-[10px] sm:text-xs text-[#8e95b0]">{p.category} • ₦{p.price.toLocaleString()}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Navigation Drawer */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-white/10 bg-[#0e131e]/98 backdrop-blur-2xl px-4 py-5 space-y-3 animate-fade-in shadow-2xl max-h-[80vh] overflow-y-auto">
              <button 
                onClick={() => { setIsOnboardingOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-[14px] text-[#b3c5ff] bg-[#0066ff]/20 border border-[#0066ff]/40 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Compass size={18} className="text-[#0066ff]" />
                  <span>Interactive App Tour</span>
                </div>
                <span className="text-[10px] bg-[#0066ff] text-white px-2 py-0.5 rounded-md uppercase font-bold">Start</span>
              </button>

              <button 
                onClick={() => { setSelectedCategory('All'); setActiveTab('home'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] text-[#dee2f2] hover:bg-white/5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Home size={18} className="text-[#0066ff]" />
                  <span>Home</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => { setSelectedCategory('All'); setActiveTab('shop'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] text-[#dee2f2] hover:bg-white/5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag size={18} className="text-[#0066ff]" />
                  <span>Shop Hardware</span>
                </div>
                <ChevronRight size={16} />
              </button>

              {/* Recently Viewed Mobile Shortcut */}
              <button 
                onClick={() => { 
                  setActiveTab('recently-viewed');
                  setSelectedProduct(null);
                  setIsMobileMenuOpen(false); 
                }}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] text-[#dee2f2] hover:bg-white/5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-blue-400" />
                  <span>Recently Viewed</span>
                </div>
                <span className="text-xs font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {recentlyViewedIds.length}
                </span>
              </button>

              {/* Notifications Mobile Shortcut */}
              <button 
                onClick={() => { 
                  setActiveTab('notifications');
                  setSelectedProduct(null);
                  setIsMobileMenuOpen(false); 
                }}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] text-[#dee2f2] hover:bg-white/5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-amber-400" />
                  <span>Notifications & Alerts</span>
                </div>
                {notifications.filter(n => !n.read).length > 0 ? (
                  <span className="text-xs font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {notifications.filter(n => !n.read).length} Unread
                  </span>
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>

              {/* Wishlist Mobile Shortcut */}
              <button 
                onClick={() => { 
                  setIsWishlistModalOpen(true); 
                  setIsMobileMenuOpen(false); 
                }}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] text-[#dee2f2] hover:bg-white/5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Heart size={18} className="text-rose-400 fill-rose-400/20" />
                  <span>My Wishlist</span>
                </div>
                <span className="text-xs font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                  {wishlistIds.length} {wishlistIds.length === 1 ? 'item' : 'items'}
                </span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('quote'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-[15px] text-[#c2c6d8] hover:bg-white/5 hover:text-[#dee2f2] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Gift size={18} className="text-amber-400" />
                  <span>Complete Packages</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => { setActiveTab('ai'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-[15px] text-[#c2c6d8] hover:bg-white/5 hover:text-[#dee2f2] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={18} className="text-[#0066ff]" />
                  <span>AI Energy Advisor</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => { setActiveTab('tracker'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-[15px] text-[#c2c6d8] hover:bg-white/5 hover:text-[#dee2f2] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList size={18} className="text-sky-400" />
                  <span>Tracker</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => { setActiveTab('blog'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-[15px] text-[#c2c6d8] hover:bg-white/5 hover:text-[#dee2f2] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-amber-500" />
                  <span>Blog & Guides</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => { setActiveTab('about'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-[15px] text-[#c2c6d8] hover:bg-white/5 hover:text-[#dee2f2] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Info size={18} className="text-indigo-400" />
                  <span>About SkyIT</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => { setActiveTab('owner'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-[15px] text-[#c2c6d8] hover:bg-white/5 hover:text-[#dee2f2] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={18} className="text-sky-400" />
                  <span>Managing Director</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => { setActiveTab('contact'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-[15px] text-[#c2c6d8] hover:bg-white/5 hover:text-[#dee2f2] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-emerald-400" />
                  <span>Contact Support</span>
                </div>
                <ChevronRight size={16} />
              </button>





              {(isAdmin || isEditor) && (
                <div className="space-y-2.5">
                  <button 
                    onClick={() => { setActiveTab('admin'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] text-rose-400 bg-rose-500/10 border border-rose-500/20 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard size={18} className="text-rose-400" />
                      <span>Admin Control Deck</span>
                    </div>
                    <ChevronRight size={16} />
                  </button>

                  <div className="p-3 bg-[#171b27] border border-amber-500/30 rounded-xl space-y-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <ShieldCheck size={16} className={adminQuickEditMode ? "text-amber-400" : "text-slate-400"} />
                        <span>Quick Edit Mode</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={adminQuickEditMode}
                        onClick={() => {
                          const nextState = !adminQuickEditMode;
                          setAdminQuickEditMode(nextState);
                          localStorage.setItem('skyit_admin_mode_enabled', String(nextState));
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          adminQuickEditMode ? 'bg-amber-500' : 'bg-slate-700'
                        }`}
                        title={adminQuickEditMode ? "Disable Quick Edit Mode" : "Enable Quick Edit Mode"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            adminQuickEditMode ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#b3c5ff]/80 leading-snug">
                      {adminQuickEditMode ? "Quick edit controls active across products for quick admin editing." : "Quick edit controls hidden."}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 space-y-2">
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#171b27] border border-white/20 flex items-center justify-center text-[#b3c5ff] font-bold text-xs shrink-0 overflow-hidden">
                          {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#dee2f2] truncate">
                            {currentUser.displayName || currentUser.email?.split('@')[0]}
                          </div>
                          <div className="text-[10px] text-[#b3c5ff]">
                            {isAdmin ? 'Administrator' : (isEditor ? 'Staff Editor' : 'Customer')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }}
                        className="flex-1 py-3 px-3 rounded-xl text-center font-bold text-[13px] border border-white/10 text-[#dee2f2] hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserCheck size={16} />
                        <span>Profile</span>
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => { setIsCartOpen(true); setIsMobileMenuOpen(false); }}
                        className="flex-1 py-3 px-3 rounded-xl text-center font-bold text-[13px] bg-[#0066ff] text-[#f8f7ff] shadow-lg hover:bg-[#0052cc] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag size={16} />
                        <span>Cart ({totalCartItems})</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => { setIsLoginOpen(true); setIsMobileMenuOpen(false); }}
                      className="flex-1 py-3 px-4 rounded-xl text-center font-bold text-[14px] border border-white/10 text-[#dee2f2] hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Login / Sign In
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setIsCartOpen(true); setIsMobileMenuOpen(false); }}
                      className="flex-1 py-3 px-4 rounded-xl text-center font-bold text-[14px] bg-[#0066ff] text-[#f8f7ff] shadow-lg hover:bg-[#0052cc] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag size={18} />
                      <span>Cart ({totalCartItems})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>
      )}



      {/* Core Body Container */}
      <main className={
        activeTab === 'ai' || activeTab === 'home' 
          ? 'w-full flex-1 flex flex-col bg-[#0e131e] p-0 m-0 border-0' 
          : (selectedProduct ? 'w-full flex-1 flex flex-col' : 'max-w-7xl mx-auto px-4 pt-8 pb-2 flex-1 w-full')
      }>
        
        {/* Dynamic Navigation Breadcrumbs */}
        {activeTab !== 'ai' && activeTab !== 'home' && (
          <div className={selectedProduct ? "max-w-7xl mx-auto px-4 pt-6 w-full" : "w-full"}>
            <Breadcrumbs 
              activeTab={activeTab} 
              selectedProduct={selectedProduct} 
              selectedCategory={selectedCategory}
              onNavigate={setActiveTab} 
              onClearProduct={handleCloseProduct} 
              onSelectCategory={setSelectedCategory}
            />
          </div>
        )}

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

        {/* VIEW 0: HOME TAB */}
        {activeTab === 'home' && !selectedProduct && (
          <div className="w-full flex-1 animate-fade-in">
            <FullHomePage 
              onNavigate={setActiveTab}
              onSelectCategory={(category) => {
                setSelectedCategory(category);
                setActiveTab('shop');
              }}
              onViewProduct={handleViewProduct}
              onAddToCart={handleAddToCart}
              onConsultPackage={handleConsultPackage}
              onOpenLogin={() => setIsLoginOpen(true)}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onLogout={handleLogout}
              products={productsWithRealRatings}
              isLoadingProducts={isProductsLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              triggerCameraSearch={triggerCameraSearch}
              filteredSuggestions={filteredSuggestions}
              totalCartItems={totalCartItems}
              currentUser={currentUser}
              isAdmin={isAdmin}
              isEditor={isEditor}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              recentlyViewedIds={recentlyViewedIds}
              onOpenWishlist={() => setIsWishlistModalOpen(true)}
              blogPosts={blogPosts}
              onSelectBlogPost={(post) => {
                setSelectedBlogPost(post);
                setActiveTab('blog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onTrackOrder={(orderId) => {
                if (orderId) {
                  setTrackedOrderId(orderId);
                }
                setActiveTab('tracker');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* VIEW 1: SHOP CATALOG TAB */}
        {activeTab === 'shop' && !selectedProduct && (
          <div className="space-y-6 w-full animate-fade-in">
            <div id="tour-search-bar-mobile" className="mb-2 bg-[#171b27] p-6 rounded-2xl border border-white/10 shadow-xl">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-[#dee2f2] uppercase tracking-tight">Our Product Catalog</h1>
              <p className="text-xs text-[#c2c6d8] mt-1 max-w-xl leading-relaxed">
                Explore our range of premium clean energy hardware, LFP battery storage modules, starlight PoE camera networks, and custom solar power kits.
              </p>
            </div>
            
            <div id="catalog-section" className="grid lg:grid-cols-4 gap-8 scroll-mt-24 pt-2">
            
            {/* Left Column: Adaptive filter sidebar */}
            <aside className="hidden lg:block space-y-6">
                       {/* Category selector */}
              <div className="bg-[#171b27] p-4 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-1.5 text-[#dee2f2] font-display font-bold mb-3 tracking-wide text-xs">
                  <SlidersHorizontal size={14} className="text-[#0066ff]" />
                  <span>System Categories</span>
                </div>

                <div className="space-y-1">
                  {['All', 'Solar Panels', 'Inverters', 'Batteries', 'Security Systems', 'Accessories'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex justify-between items-center ${
                        selectedCategory === cat 
                          ? 'bg-[#0066ff]/20 text-[#b3c5ff] font-bold border-l-2 border-[#0066ff] pl-2' 
                          : 'text-[#c2c6d8] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{cat === 'All' ? 'All Catalog' : cat}</span>
                      <ChevronRight size={12} className={selectedCategory === cat ? 'text-[#0066ff]' : 'text-slate-500'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Price filter and High discount filters */}
              <div className="bg-[#171b27] p-4 rounded-2xl border border-white/10 shadow-lg space-y-4">
                <h4 className="text-xs font-display font-bold text-[#dee2f2] tracking-wide border-b border-white/10 pb-1.5">Refine Database</h4>
                
                {/* Price sorting */}
                <div>
                  <label className="text-[10px] font-bold text-[#c2c6d8] uppercase block mb-1 tracking-wider">Sort Cost Option</label>
                  <select
                    value={priceSort}
                    onChange={(e) => setPriceSort(e.target.value as any)}
                    className="w-full bg-[#0e131e] border border-white/10 text-[#dee2f2] rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#0066ff] focus:outline-hidden"
                  >
                    <option value="default" className="bg-[#0e131e] text-[#dee2f2]">Default Sizing Rank</option>
                    <option value="low-high" className="bg-[#0e131e] text-[#dee2f2]">Price: Low to High</option>
                    <option value="high-low" className="bg-[#0e131e] text-[#dee2f2]">Price: High to Low</option>
                  </select>
                </div>

                {/* Percentage discount options */}
                <div>
                  <label className="text-[10px] font-bold text-[#c2c6d8] uppercase block mb-1.5 tracking-wider">SkyIT Promos</label>
                  <button
                    onClick={() => setDiscountFilter(prev => prev === 'high' ? 'All' : 'high')}
                    className={`w-full p-2.5 rounded-lg text-xs font-bold tracking-wide uppercase text-center border transition-all ${
                      discountFilter === 'high' 
                        ? 'bg-red-500/20 text-red-400 border-red-500/30 font-bold' 
                        : 'bg-[#0e131e] text-[#c2c6d8] border-white/10 hover:bg-white/10'
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
                    className="w-full bg-[#0e131e] hover:bg-white/10 text-[#dee2f2] py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-center border border-white/10"
                  >
                    Clear Search Criteria
                  </button>
                )}
              </div>

              {/* SkyIT AI Smart Vision box */}
              <div className="bg-[#171b27] text-white rounded-2xl p-4 shadow-lg space-y-3 relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] tracking-widest font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded-sm inline-block">
                    SKYIT SMART VISION
                  </span>
                  <span className="text-[8px] font-mono text-slate-400">v1.2</span>
                </div>
                <h4 className="text-xs font-display font-bold leading-snug text-white uppercase tracking-wide">AI Visual Search Scanner</h4>
                <p className="text-[10px] text-[#c2c6d8] leading-normal">
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
              <div className="bg-[#171b27] border border-white/10 text-[#dee2f2] rounded-2xl p-4 shadow-lg space-y-3 relative overflow-hidden lg:sticky lg:top-24">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#0066ff]/20 to-transparent rounded-full blur-xl pointer-events-none" />
                <span className="text-[9px] tracking-widest font-bold uppercase bg-[#0066ff] text-white px-2 py-0.5 rounded-sm inline-block">
                  AI Engineering Expert
                </span>
                <h4 className="text-xs font-display font-bold leading-snug text-white">let our AI design your optimal microgrid</h4>
                <p className="text-[10px] text-[#c2c6d8] leading-normal">
                  Describe your building shape, AC loads, and battery technology preference. Let the AI advisor write a professional hardware checklist instantly.
                </p>
                <button
                  onClick={() => setActiveTab('ai')}
                  className="w-full bg-[#0066ff] hover:bg-[#0052cc] text-white transition-all py-2 rounded-lg text-center font-bold text-xs uppercase tracking-widest"
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
                  <h3 className="font-display font-bold text-base text-[#dee2f2]">
                    SkyIT {selectedCategory} Catalog
                  </h3>
                  <p className="text-[10px] text-[#c2c6d8] font-mono mt-0.5">
                    Showing {filteredProducts.length} Premium Architectural Results
                  </p>
                </div>

                {/* Mobile Filter toggle button */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                    className={`font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider px-3.1 py-2 rounded-xl border transition-all active:scale-95 ${
                      isMobileFiltersOpen 
                        ? 'bg-[#0066ff] text-white border-[#0066ff] shadow-xs' 
                        : 'bg-[#171b27] text-[#dee2f2] border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <SlidersHorizontal size={13} strokeWidth={2.5} />
                    <span>Filter</span>
                  </button>
                </div>
              </div>

              {/* Mobile Filter Panel (Shown inline when toggled) */}
              {isMobileFiltersOpen && (
                <div className="lg:hidden block bg-[#171b27] border border-white/10 rounded-2xl p-4 gap-4 grid sm:grid-cols-2 animate-fade-in">
                  
                  {/* Category Sorter */}
                  <div className="bg-[#0e131e] p-4 rounded-xl border border-white/10 shadow-3xs">
                    <div className="flex items-center gap-1.5 text-[#dee2f2] font-display font-bold mb-3 tracking-wide text-xs">
                      <SlidersHorizontal size={13} className="text-[#0066ff] font-bold" />
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
                              ? 'bg-[#0066ff]/20 text-[#b3c5ff] font-bold border-l-2 border-[#0066ff] pl-2' 
                              : 'text-[#c2c6d8] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span>{cat}</span>
                          <ChevronRight size={11} className={selectedCategory === cat ? 'text-[#0066ff]' : 'text-slate-500'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Refine options */}
                  <div className="bg-[#0e131e] p-4 rounded-xl border border-white/10 shadow-3xs space-y-4 animate-fade-in">
                    <h4 className="text-xs font-display font-bold text-[#dee2f2] tracking-wide border-b border-white/10 pb-1.5">Refine Database</h4>
                    
                    {/* Price sorting */}
                    <div>
                      <label className="text-[10px] font-bold text-[#c2c6d8] uppercase block mb-1 tracking-wider">Sort Cost Option</label>
                      <select
                        value={priceSort}
                        onChange={(e) => setPriceSort(e.target.value as any)}
                        className="w-full bg-[#171b27] border border-white/10 text-[#dee2f2] rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#0066ff] focus:outline-hidden"
                      >
                        <option value="default" className="bg-[#171b27] text-[#dee2f2]">Default Sizing Rank</option>
                        <option value="low-high" className="bg-[#171b27] text-[#dee2f2]">Price: Low to High</option>
                        <option value="high-low" className="bg-[#171b27] text-[#dee2f2]">Price: High to Low</option>
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
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
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
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {filteredProducts.map((prod) => (
                    <ProductCard 
                      key={prod.id}
                      product={prod}
                      onAddToCart={handleAddToCart}
                      onViewDetails={handleViewProduct}
                      isWishlisted={wishlistIds.includes(prod.id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              )}

            </div>

          </div>
          </div>
        )}

        {/* VIEW 3: ORDER TRACKING TAB */}
        {activeTab === 'tracker' && !selectedProduct && (
          <div id="tour-tracker-target" className="w-full">
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
          </div>
        )}

        {/* VIEW 4: GEMINI AI PERSONAL SHOPPER ASSISTANT TAB */}
        {activeTab === 'ai' && !selectedProduct && (
          <div id="tour-ai-advisor-target" className="w-full">
            <AiAssistant 
              initialPrompt={initialAiPrompt}
              onClearInitialPrompt={() => setInitialAiPrompt('')}
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
          </div>
        )}

        {/* VIEW 5: ADMIN LOGISTICS CONTROL TERMINAL */}
        {activeTab === 'admin' && !selectedProduct && (
          (isAdmin || isEditor || currentUser?.email === 'jeemestore@gmail.com' || auth.currentUser?.email === 'jeemestore@gmail.com') ? (
            <AdminPanel isUserAdmin={true} isUserEditor={true} />
          ) : (
            <AdminLoginCard 
              onLoginSuccess={handleLoginSuccess}
              onUnlockAdmin={() => {
                setIsAdmin(true);
                setIsEditor(true);
                localStorage.setItem('skyit_sim_admin', 'true');
              }}
            />
          )
        )}

        {/* VIEW 6: CONTACT & SPECIFICATION DESK */}
        {activeTab === 'contact' && !selectedProduct && (
          <ContactSection />
        )}

        {/* VIEW 7: ABOUT SKYIT PANEL */}
        {activeTab === 'about' && !selectedProduct && (
          <AboutSection />
        )}

        {/* VIEW 9: ABOUT MANAGING DIRECTOR PANEL */}
        {activeTab === 'owner' && !selectedProduct && (
          <OwnerSection onNavigate={setActiveTab} currentUser={currentUser} />
        )}

        {/* VIEW 10: ENGINEERING & CLEAN ENERGY BLOG PANEL */}
        {activeTab === 'blog' && !selectedProduct && (
          <BlogSection 
            posts={blogPosts} 
            selectedPost={selectedBlogPost}
            onSelectPost={(post) => {
              setSelectedBlogPost(post);
              const params = new URLSearchParams(window.location.search);
              params.set('tab', 'blog');
              params.set('post', post.slug || post.id);
              window.history.pushState({ tab: 'blog', post: post.id }, '', `?${params.toString()}`);
            }}
            onClearSelectedPost={() => {
              setSelectedBlogPost(null);
              const params = new URLSearchParams(window.location.search);
              params.set('tab', 'blog');
              params.delete('post');
              window.history.pushState({ tab: 'blog' }, '', `?${params.toString()}`);
            }}
          />
        )}

        {/* VIEW 8: TURNKEY SOLAR PACKAGES TAB */}
        {activeTab === 'quote' && !selectedProduct && (
          <div id="tour-solar-packages-target" className="w-full">
            <SolarPackages 
              onAddToCart={handleAddToCart} 
              onOpenCart={() => setIsCartOpen(true)} 
              onConsultPackage={handleConsultPackage}
            />
          </div>
        )}

        {/* VIEW 11: RECENTLY VIEWED PRODUCTS PAGE */}
        {activeTab === 'recently-viewed' && !selectedProduct && (
          <RecentlyViewedPage 
            recentlyViewedIds={recentlyViewedIds}
            allProducts={productsWithRealRatings}
            onClearHistory={handleClearRecentlyViewed}
            onRemoveFromHistory={handleRemoveFromRecentlyViewed}
            onViewProduct={handleViewProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onNavigateToShop={() => setActiveTab('shop')}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        )}

        {/* VIEW 12: NOTIFICATIONS & ACTIVITY CENTER */}
        {activeTab === 'notifications' && !selectedProduct && (
          <NotificationsPage
            notifications={notifications}
            userEmail={currentUser?.email}
            currentUser={currentUser}
            onNavigateTab={setActiveTab}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        )}

      </main>

      {/* Universal General Footer */}
      {activeTab !== 'ai' && (
        <footer className="w-full py-14 mt-auto border-t border-white/10 bg-[#090e19] text-[#c2c6d8]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 px-4 sm:px-10 max-w-[1440px] mx-auto">
            
            {/* Column 1: Brand & Socials */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-xl bg-white overflow-hidden w-9 h-9 flex items-center justify-center shadow-md">
                  <img 
                    src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                    alt="SkyIT Logo" 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[20px] font-bold text-white font-display leading-tight">SkyIT <span className="text-[#0066ff]">Ventures</span></span>
                  <span className="text-[9px] text-[#8e95b0] uppercase tracking-[0.15em] font-semibold">Solar & Security Systems</span>
                </div>
              </div>
              <p className="text-[13px] leading-[22px] text-[#c2c6d8]">
                Leading the deployment of smart energy microgrids, hybrid MPPT Pure Sine inverters, residential LFP lithium walls, starlight outdoor CCTV surveillance networks, and state-of-the-art commissioning engineering services.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-3 pt-1">
                <a 
                  href="https://wa.me/2349074444140?text=Hello%20SkyIT%20Ventures%20team,%20I'd%20like%20to%20inquire%20about%20your%20solar%20solutions." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#171b27] hover:bg-[#25D366]/20 hover:text-[#25D366] hover:border-[#25D366]/40 text-[#c2c6d8] border border-white/10 flex items-center justify-center transition-all group shadow-sm"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 transition-transform group-hover:scale-110">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23c-1.48 0-2.93-.39-4.19-1.15l-.3-.17l-3.12.82l.83-3.04l-.2-.32a8.2 8.2 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31c-.22.25-.87.86-.87 2.07c0 1.22.89 2.39 1 2.56c.14.17 1.76 2.67 4.25 3.73c.59.27 1.05.42 1.41.53c.59.19 1.13.16 1.56.1c.48-.07 1.46-.6 1.67-1.18s.21-1.07.15-1.18c-.07-.1-.23-.16-.48-.27c-.25-.14-1.47-.74-1.69-.82c-.23-.08-.37-.12-.56.12c-.16.25-.64.81-.78.97c-.15.17-.29.19-.53.07c-.26-.13-1.06-.39-2-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.12-.24-.01-.39.11-.5c.11-.11.27-.29.37-.44c.13-.14.17-.25.25-.41c.08-.17.04-.31-.02-.43c-.06-.11-.56-1.35-.77-1.84c-.2-.48-.4-.42-.56-.43c-.14 0-.3-.01-.47-.01" />
                  </svg>
                </a>
                <a 
                  href="https://www.facebook.com/p/Skyit-Ventures-100044418501183/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#171b27] hover:bg-[#1877F2]/25 hover:text-[#1877F2] hover:border-[#1877F2]/40 text-[#c2c6d8] border border-white/10 flex items-center justify-center transition-all group shadow-sm"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:scale-110">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a 
                  href="https://www.instagram.com/skyit_ltd/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#171b27] hover:bg-[#E1306C]/25 hover:text-[#E1306C] hover:border-[#E1306C]/40 text-[#c2c6d8] border border-white/10 flex items-center justify-center transition-all group shadow-sm"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:scale-110">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a 
                  href="https://ng.linkedin.com/company/skyit-limited" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#171b27] hover:bg-[#0077B5]/25 hover:text-[#0077B5] hover:border-[#0077B5]/40 text-[#c2c6d8] border border-white/10 flex items-center justify-center transition-all group shadow-sm"
                  aria-label="LinkedIn"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:scale-110">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-6">
              <h4 className="font-bold text-[#dee2f2] text-[18px] sm:text-[20px] font-display">Quick Links</h4>
              <ul className="space-y-2.5">
                <li><button onClick={() => { setSelectedCategory('All'); setActiveTab('shop'); }} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">Shop Hardware</button></li>
                <li><button onClick={() => setActiveTab('recently-viewed')} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">Recently Viewed</button></li>
                <li><button onClick={() => setActiveTab('quote')} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">Complete Packages</button></li>
                <li><button onClick={() => setActiveTab('ai')} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">AI Energy Advisor</button></li>
                <li><button onClick={() => setActiveTab('tracker')} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">Installation & Tracking</button></li>
                <li><button onClick={() => setActiveTab('about')} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">About SkyIT</button></li>
                <li><button onClick={() => setActiveTab('owner')} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">Managing Director</button></li>
                <li><button onClick={() => setActiveTab('contact')} className="text-[13px] text-[#c2c6d8] hover:text-[#b3c5ff] transition-colors hover:underline cursor-pointer">Contact & Support</button></li>
              </ul>
            </div>

            {/* Column 3: Technical Support Desk & Phones */}
            <div className="space-y-6">
              <h4 className="font-bold text-[#dee2f2] text-[18px] sm:text-[20px] font-display">Technical Support</h4>
              <div className="space-y-3 text-[13px] text-[#c2c6d8]">
                <div className="space-y-1 font-mono text-xs text-[#dee2f2] bg-[#171b27] p-3 rounded-xl border border-white/5">
                  <div>+234-9135396292</div>
                  <div>+234-9074444140</div>
                  <div>+234-9017777773</div>
                  <div>+234-9017777774</div>
                </div>
                <p className="font-bold text-[#0066ff] hover:underline flex flex-col gap-1">
                  <a href="mailto:skyitventures01@gmail.com">skyitventures01@gmail.com</a>
                  <a href="https://www.skyitonline.org" target="_blank" rel="noopener noreferrer" className="text-amber-400">www.skyitonline.org</a>
                </p>
              </div>
            </div>

            {/* Column 4: Office Locations */}
            <div className="space-y-6">
              <h4 className="font-bold text-[#dee2f2] text-[18px] sm:text-[20px] font-display">Offices</h4>
              <div className="space-y-4">
                <div>
                  <div className="text-[14px] text-[#dee2f2] font-bold">Head Office Portal (Warri)</div>
                  <p className="text-[12px] leading-[18px] text-[#c2c6d8]">KM 1 DSC Expressway beside Jesus Temple Church, Ebrumede, Effurun-Warri, Delta State.</p>
                </div>
                <div>
                  <div className="text-[14px] text-[#dee2f2] font-bold">Lagos Branch HQ</div>
                  <p className="text-[12px] leading-[18px] text-[#c2c6d8]">Manjo Plaza, NNPC Service Station, Ikota, Second Gate, K.M 22, Lekki-Epe Expressway, Lekki, Lagos.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Legal Navigation */}
          <div className="mt-12 pt-8 border-t border-white/10 max-w-[1440px] mx-auto px-4 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#c2c6d8]">
            <p className="text-xs text-[#c2c6d8] font-medium text-center md:text-left">
              © 2026 SkyIT Ventures Limited. All rights reserved. Built with premium Vite & React.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3 gap-y-2 text-xs">
              <button type="button" onClick={() => setActiveTab('about')} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0">About SkyIT</button>
              <span className="text-white/30 font-bold">·</span>
              <button type="button" onClick={() => setActiveTab('owner')} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0">Leadership</button>
              <span className="text-white/30 font-bold">·</span>
              <button type="button" onClick={() => setActiveTab('blog')} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0">Blog & News</button>
              <span className="text-white/30 font-bold">·</span>
              <button type="button" onClick={() => { setPolicyTab('installation'); setIsPolicyOpen(true); }} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0">Terms of Installation</button>
              <span className="text-white/30 font-bold">·</span>
              <button type="button" onClick={() => { setPolicyTab('engineering'); setIsPolicyOpen(true); }} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0">Engineering Policies</button>
              <span className="text-white/30 font-bold">·</span>
              <button type="button" onClick={() => { setPolicyTab('return'); setIsPolicyOpen(true); }} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0">Return Policy</button>
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

      {/* Interactive App Guide & Feature Onboarding Tour */}
      <InteractiveTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        activeTab={activeTab}
        onNavigateTab={setActiveTab}
        onExpandMobileSearch={() => setIsMobileSearchExpanded(true)}
        onCloseMobileSearch={() => setIsMobileSearchExpanded(false)}
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

      {/* Wishlist Toast Notification Card */}
      <AnimatePresence>
        {wishlistToast && wishlistToast.show && (
          <motion.div
            key="wishlist-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 left-6 sm:left-auto sm:right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] sm:w-80 bg-[#171b27]/95 backdrop-blur-xl border border-rose-500/30 rounded-2xl shadow-2xl p-3.5 text-white flex items-center gap-3 font-sans"
          >
            <div className="relative shrink-0">
              <img 
                src={wishlistToast.product.image} 
                alt={wishlistToast.product.name} 
                className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-[#303541]"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm ${
                wishlistToast.added ? 'bg-rose-500 text-white' : 'bg-slate-600 text-slate-300'
              }`}>
                <Heart size={10} fill={wishlistToast.added ? "currentColor" : "none"} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  wishlistToast.added ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  {wishlistToast.added ? 'Added to Wishlist' : 'Removed from Wishlist'}
                </span>
                <button 
                  type="button"
                  onClick={() => setWishlistToast(null)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded-md hover:bg-white/10"
                  title="Close notification"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs font-bold text-gray-100 truncate mt-0.5">
                {wishlistToast.product.name}
              </p>
              {wishlistToast.added && (
                <button
                  type="button"
                  onClick={() => {
                    setWishlistToast(null);
                    setIsWishlistModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-[#b3c5ff] hover:text-white hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View Wishlist ({wishlistIds.length})</span>
                  <ChevronRight size={12} />
                </button>
              )}
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

      {/* Wishlist Modal */}
      <WishlistModal 
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        wishlistIds={wishlistIds}
        allProducts={productsWithRealRatings}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onViewProduct={handleViewProduct}
        onNavigateToShop={() => setActiveTab('shop')}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
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
            className="fixed bottom-6 right-6 z-30 p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg border border-slate-700/50 flex items-center justify-center cursor-pointer group"
            aria-label="Scroll to top"
          >
            <ArrowUp size={20} className="transition-transform group-hover:-translate-y-0.5" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
