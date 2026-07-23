import React, { useEffect, useState } from 'react';
import { Order, OrderStatus, TrackingMilestone } from '../types';
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  logAuditEvent
} from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { CatalogManager } from './CatalogManager';
import { RoleManager } from './RoleManager';
import { AdminBlogPanel } from './AdminBlogPanel';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel';
import { defaultBlogPosts } from '../data/blogPosts';
import { BlogPost } from '../types';
import { auth } from '../firebase';
import { 
  Database, 
  Search, 
  Trash2, 
  Package,
  RefreshCw, 
  CheckCircle2, 
  Truck, 
  Settings, 
  ShieldAlert, 
  Sparkles,
  ArrowRight,
  ClipboardList,
  Filter,
  Download,
  User,
  MapPin,
  FileText,
  Plus,
  Minus,
  Building,
  Phone,
  Mail,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
  X,
  XCircle,
  TrendingUp,
  Users,
  BookOpen
} from 'lucide-react';

interface AIQuoteResult {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  state: string;
  systemKva: string;
  batteryTech: 'tubular' | 'lithium';
  batteryInfo: string;
  batteriesCount: number;
  panelsCount: number;
  panelsInfo: string;
  inverterInfo: string;
  accessories: string[];
  accessoriesPrices?: {[accessoryKey: string]: number};
  appliancesMatched: string[];
  serviceFee: number;
  price: number;
  proposalText: string;
}

interface AdminPanelProps {
  isUserAdmin?: boolean;
  isUserEditor?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isUserAdmin = false, isUserEditor = false }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Re-edit Order Parameters States
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSubtotal, setEditSubtotal] = useState(0);
  const [editDeliveryFee, setEditDeliveryFee] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [confirmingCancelOrderId, setConfirmingCancelOrderId] = useState<string | null>(null);

  // AI Quote Generation Workspace States
  const [adminView, setAdminView] = useState<'logistics' | 'analytics' | 'quote' | 'products' | 'blog' | 'roles'>(() => {
    return (localStorage.getItem('adminView') as 'logistics' | 'analytics' | 'quote' | 'products' | 'blog' | 'roles') || 'logistics';
  });

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(defaultBlogPosts);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'blog_posts'), (snapshot) => {
      if (!snapshot.empty) {
        const list: BlogPost[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as BlogPost));
        setBlogPosts(list);
      }
    }, (err) => {
      console.warn("Firestore blog posts sync notice:", err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('adminView', adminView);
  }, [adminView]);

  const [documentType, setDocumentType] = useState<'quotation' | 'receipt'>('quotation');
  const [docCode] = useState(() => Math.floor(10000 + Math.random() * 90000));
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const views: ('logistics' | 'analytics' | 'quote' | 'products' | 'blog' | 'roles')[] = isUserAdmin 
    ? ['logistics', 'analytics', 'quote', 'products', 'blog', 'roles']
    : ['logistics', 'analytics', 'quote', 'products', 'blog'];
  
  const handleNavigateView = (direction: 'prev' | 'next') => {
    const currentIndex = views.indexOf(adminView);
    if (direction === 'prev' && currentIndex > 0) {
      const prevView = views[currentIndex - 1];
      setAdminView(prevView);
      if (tabsRef.current) {
        tabsRef.current.scrollBy({ left: -160, behavior: 'smooth' });
      }
    } else if (direction === 'next' && currentIndex < views.length - 1) {
      const nextView = views[currentIndex + 1];
      setAdminView(nextView);
      if (tabsRef.current) {
        tabsRef.current.scrollBy({ left: 160, behavior: 'smooth' });
      }
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  const [narrativeInput, setNarrativeInput] = useState('');
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [generationLoaderMsg, setGenerationLoaderMsg] = useState('');
  const [quoteError, setQuoteError] = useState('');
  const [quoteResult, setQuoteResult] = useState<AIQuoteResult>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    city: "Lagos",
    state: "Lagos State",
    systemKva: "5.0 KVA",
    batteryTech: "lithium",
    batteryInfo: "1x 5.12KWH LFP Lithium Wall Bank",
    batteriesCount: 1,
    panelsCount: 4,
    panelsInfo: "4x 550W Tier-1 Monocrystalline Solar Panels",
    inverterInfo: "1x 5KVA High-Efficiency Smart Pure Sine Wave Hybrid Inverter",
    accessories: ["Surge Protectors", "AC/DC Breakers", "16mm Copper Cabling"],
    accessoriesPrices: {
      "Surge Protectors": 45000,
      "AC/DC Breakers": 35000,
      "16mm Copper Cabling": 85000
    },
    appliancesMatched: ["1x Inverter AC", "1x Smart Refrigerator", "Basic Lighting"],
    serviceFee: 150000,
    price: 2450000,
    proposalText: "Premium modular solar energy system engineered to supply clean power fallback, tailored specifically for the client's home or office requirements."
  });

  // Live edit helpers for accessories & appliances
  const [newAccessoryText, setNewAccessoryText] = useState('');
  const [newApplianceText, setNewApplianceText] = useState('');

  // 1. Listen or fetch orders live from Firestore
  useEffect(() => {
    setIsLoading(true);
    const ordersColRef = collection(db, 'orders');
    
    // Set up a real-time snapshot listener so that changes sync instantly!
    const unsubscribe = onSnapshot(ordersColRef, (snapshot) => {
      console.log("AdminPanel: onSnapshot triggered, order count:", snapshot.size);
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        ordersList.push(docSnap.data() as Order);
      });
      // Sort orders by date descending
      ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ordersList);
      setIsLoading(false);
    }, (error) => {
      console.warn("Snapshot listener requires login/permissions, fallback to static fetch:", error);
      // Fallback to one-time gets
      fetchOrdersOnce();
    });

    return () => unsubscribe();
  }, []);

  const fetchOrdersOnce = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const ordersList: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        ordersList.push(docSnap.data() as Order);
      });
      ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ordersList);
    } catch (err) {
      console.warn("Firestore list orders fallback/permissions notice: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Quote Generation Functions
  const handleGenerateAIQuote = async () => {
    if (!narrativeInput.trim()) {
      setQuoteError("Please enter some plain text specifications first.");
      return;
    }

    setQuoteError("");
    setIsGeneratingQuote(true);
    setGenerationLoaderMsg("Parsing narrative specification client info...");

    const intervals = [
      setTimeout(() => setGenerationLoaderMsg("Analyzing appliance loads & surge requirements..."), 1200),
      setTimeout(() => setGenerationLoaderMsg("Matching with optimal hybrid inverter packages..."), 2500),
      setTimeout(() => setGenerationLoaderMsg("Calculating direct engineering costs in Nairas..."), 3800),
      setTimeout(() => setGenerationLoaderMsg("Formulating professional business proposal..."), 5000)
    ];

    try {
      const response = await fetch("/api/admin/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plainText: narrativeInput })
      });

      if (!response.ok) {
        throw new Error("Temporary network delay on AI service. Try again.");
      }

      const data = await response.json();
      setQuoteResult(data);
      setFeedbackMsg("AI successfully formulated quotation proposal!");
      setTimeout(() => setFeedbackMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setQuoteError(err.message || "Failed to generate proposal quote.");
    } finally {
      intervals.forEach(clearTimeout);
      setIsGeneratingQuote(false);
    }
  };

  const handleSaveGeneratedQuoteToDB = async () => {
    if (!quoteResult) return;

    setFeedbackMsg("Recording quotation as active contract in Firestore...");
    try {
      const orderId = "SK-" + Math.floor(100000 + Math.random() * 900000);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newProduct = {
        id: `custom-ai-${Date.now()}`,
        name: `Customized ${quoteResult.systemKva} (${quoteResult.batteryTech === 'lithium' ? 'LiFePO4 Lithium' : 'Tall Tubular'}) Solar Installation`,
        description: `${quoteResult.inverterInfo}. ${quoteResult.batteryInfo}. ${quoteResult.panelsInfo}.`,
        category: "Inverters",
        price: quoteResult.price,
        originalPrice: quoteResult.price,
        discountPercent: 0,
        rating: 5.0,
        ratingCount: 1,
        image: quoteResult.batteryTech === 'lithium' 
          ? 'https://images.unsplash.com/photo-1548613053-220ef31815bb?auto=format&fit=crop&w=400&q=80'
          : 'https://images.unsplash.com/photo-1620038650424-8547d2a2c289?auto=format&fit=crop&w=400&q=80',
        features: [quoteResult.inverterInfo, quoteResult.batteryInfo, quoteResult.panelsInfo, ...quoteResult.accessories],
        specs: { "System Capacity": quoteResult.systemKva, "Primary battery storage": quoteResult.batteryInfo, "Solar Panel Array": quoteResult.panelsInfo },
        stock: 1
      };

      const customOrder: Order = {
        id: orderId,
        items: [{ product: newProduct, quantity: 1 }],
        subtotal: quoteResult.price - quoteResult.serviceFee,
        deliveryFee: 0,
        discount: 0,
        total: quoteResult.price,
        customerDetails: {
          name: quoteResult.customerName,
          email: quoteResult.customerEmail,
          phone: quoteResult.customerPhone,
          city: quoteResult.city,
          address: `${quoteResult.customerAddress}, ${quoteResult.city}, ${quoteResult.state}`
        },
        status: 'confirmed',
        createdAt: now.toISOString(),
        paymentMethod: "Bank Draft/System Quotation",
        trackingProgress: [
          { status: 'pending', label: 'Order Approved', timestamp: timeStr, completed: true, desc: "AI-Generated Quote accepted on contract." },
          { status: 'confirmed', label: 'Engineering Audit Passed', timestamp: timeStr, completed: true, desc: "Technical loads aligned & matched." },
          { status: 'processing', label: 'Lab Pre-commissioning', timestamp: '--:--', completed: false, desc: "Components array optimization at SkyIT center." },
          { status: 'shipped', label: 'Dispatched to Site', timestamp: '--:--', completed: false, desc: "Cabling and heavy panels en route via SkyIT Delivery." },
          { status: 'out_for_delivery', label: 'Engineering Team Deploying', timestamp: '--:--', completed: false, desc: "Technical field crew preparing deployment." },
          { status: 'delivered', label: 'System Handover Live', timestamp: '--:--', completed: false, desc: "Installation checkout completed." }
        ]
      };

      await setDoc(doc(db, 'orders', orderId), customOrder);

      // Securely dispatch an email notification to the admins with the quote details to verify accuracy
      try {
        fetch("/api/admin/notify-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quote: quoteResult,
            orderId: orderId
          })
        }).then(res => {
          if (!res.ok) console.warn("Admin SMTP notification response was not ok");
        }).catch(e => {
          console.warn("Could not dispatch SMTP notify-quote:", e);
        });
      } catch (notifyErr) {
        console.warn("Admin quotation notification call failed:", notifyErr);
      }

      setFeedbackMsg(`Successfully logged solar contract ${orderId} in database!`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      setAdminView('logistics'); // Switch back to see our brand new order live!
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg("Failed to store contract. Ensure Firestore is authenticated.");
      setTimeout(() => setFeedbackMsg(''), 4000);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quoteResult) return;
    const element = document.getElementById('quote-print-element');
    if (!element) {
      alert("Quotation preview element not found.");
      return;
    }

    setFeedbackMsg("Rendering design grids to Vector PDF file...");
    
    // Polyfill window.getComputedStyle to translate Tailwind v4 oklch() and oklab() colors to rgb() to prevent html2pdf/html2canvas crashes
    const originalGetComputedStyle = window.getComputedStyle;
    const convertOklToRgb = (colorStr: string): string => {
      if (!colorStr || typeof colorStr !== 'string') {
        return colorStr;
      }
      if (!colorStr.includes('oklch') && !colorStr.includes('oklab')) {
        return colorStr;
      }
      const f = (x: number) => x > 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
      let result = colorStr;

      try {
        if (result.includes('oklch')) {
          const oklchRegex = /oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/g;
          result = result.replace(oklchRegex, (match, lStr, cStr, hStr, aStr) => {
            let L = parseFloat(lStr);
            if (lStr.endsWith('%')) {
              L = parseFloat(lStr) / 100;
            }
            const C = parseFloat(cStr);
            const H = parseFloat(hStr);
            let alpha = 1;
            if (aStr) {
              if (aStr.endsWith('%')) {
                alpha = parseFloat(aStr) / 100;
              } else {
                alpha = parseFloat(aStr);
              }
            }
            const rad = H * Math.PI / 180;
            const oklabA = C * Math.cos(rad);
            const oklabB = C * Math.sin(rad);
            
            const l_ = L + 0.3963377774 * oklabA + 0.2158037573 * oklabB;
            const m_ = L - 0.1055613458 * oklabA - 0.0638541167 * oklabB;
            const s_ = L - 0.0894841775 * oklabA - 1.2914855414 * oklabB;
            
            const l = l_ * l_ * l_;
            const m = m_ * m_ * m_;
            const s = s_ * s_ * s_;
            
            let rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
            let gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
            let bLinear = -0.0041960863 * l - 0.7034186145 * m + 1.7076147010 * s;
            
            rLinear = Math.max(0, Math.min(1, rLinear));
            gLinear = Math.max(0, Math.min(1, gLinear));
            bLinear = Math.max(0, Math.min(1, bLinear));
            
            const r = Math.round(f(rLinear) * 255);
            const g = Math.round(f(gLinear) * 255);
            const b = Math.round(f(bLinear) * 255);
            
            return aStr ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
          });
        }

        if (result.includes('oklab')) {
          const oklabRegex = /oklab\(\s*([\d.%]+)\s+([-+e\d.]+)\s+([-+e\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/g;
          result = result.replace(oklabRegex, (match, lStr, aCoordStr, bCoordStr, aStr) => {
            let L = parseFloat(lStr);
            if (lStr.endsWith('%')) {
              L = parseFloat(lStr) / 100;
            }
            const oklabA = parseFloat(aCoordStr);
            const oklabB = parseFloat(bCoordStr);
            let alpha = 1;
            if (aStr) {
              if (aStr.endsWith('%')) {
                alpha = parseFloat(aStr) / 100;
              } else {
                alpha = parseFloat(aStr);
              }
            }
            
            const l_ = L + 0.3963377774 * oklabA + 0.2158037573 * oklabB;
            const m_ = L - 0.1055613458 * oklabA - 0.0638541167 * oklabB;
            const s_ = L - 0.0894841775 * oklabA - 1.2914855414 * oklabB;
            
            const l = l_ * l_ * l_;
            const m = m_ * m_ * m_;
            const s = s_ * s_ * s_;
            
            let rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
            let gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
            let bLinear = -0.0041960863 * l - 0.7034186145 * m + 1.7076147010 * s;
            
            rLinear = Math.max(0, Math.min(1, rLinear));
            gLinear = Math.max(0, Math.min(1, gLinear));
            bLinear = Math.max(0, Math.min(1, bLinear));
            
            const r = Math.round(f(rLinear) * 255);
            const g = Math.round(f(gLinear) * 255);
            const b = Math.round(f(bLinear) * 255);
            
            return aStr ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
          });
        }
      } catch (e) {
        return colorStr.includes('0.9') ? 'rgb(15, 23, 42)' : 'rgb(241, 245, 249)';
      }
      return result;
    };

    (window as any).getComputedStyle = function (elt: any, pseudoElt: any) {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return (val: string) => {
              const originalValue = target.getPropertyValue(val);
              return convertOklToRgb(originalValue);
            };
          }
          const val = Reflect.get(target, prop);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          if (typeof val === 'string') {
            return convertOklToRgb(val);
          }
          return val;
        }
      });
    };

    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    const originalMaxWidth = element.style.maxWidth;
    const originalPadding = element.style.padding;
    const originalBoxSizing = element.style.boxSizing;

    // Temporarily apply precise 800px A4 desktop width constraints to the live onscreen element.
    // This absolutely guarantees that html2canvas reads fully painted responsive hierarchies
    // without suffering from clipping or mobile browser memory optimization blanks.
    element.style.width = '800px';
    element.style.minWidth = '800px';
    element.style.maxWidth = '800px';
    element.style.padding = '32px';
    element.style.boxSizing = 'border-box';

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin:       8,
        filename:     `${quoteResult.customerName.replace(/\s+/g, '_')}_SkyIT_Solar_${documentType === 'receipt' ? 'Receipt' : 'Quote'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          width: 800,
          windowWidth: 1024
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().from(element).set(opt as any).save();
      setFeedbackMsg(`Professional PDF ${documentType === 'receipt' ? 'receipt' : 'quote'} generated/downloaded successfully!`);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setFeedbackMsg("Failed to generate PDF. Invoking printing console...");
      setTimeout(() => setFeedbackMsg(''), 4000);
      window.print();
    } finally {
      // Instantly restore original responsive styling attributes to ensure seamless mobile touch interactions
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.padding = originalPadding;
      element.style.boxSizing = originalBoxSizing;

      window.getComputedStyle = originalGetComputedStyle;
    }
  };

  // 2. Seed mock orders so the screen has active files to test out immediately
  const handleSeedDatabase = async () => {
    setIsLoading(true);
    setFeedbackMsg("Bootstrapping simulation records in Firestore...");
    
    const baseNow = new Date();
    
    const demoOrders: Order[] = [
      {
        id: "SK-901248",
        items: [
          {
            product: {
              id: "prod-2",
              name: "Smart 3.5KVA Pure Sine Wave Inverter",
              description: "High performance MPPT inverter with customizable digital bypass limits.",
              category: "Inverters",
              price: 480000,
              originalPrice: 535000,
              discountPercent: 10,
              rating: 4.8,
              ratingCount: 42,
              image: "https://images.unsplash.com/photo-1620038650424-8547d2a2c289?auto=format&fit=crop&w=400&q=80",
              features: ["Pure Sine Output", "Built-in MPPT", "Lagos Delivery"],
              specs: { "KVA Rating": "3.5 KVA", "Efficiency": "94%" },
              stock: 8
            },
            quantity: 1
          },
          {
            product: {
              id: "prod-5",
              name: "5.0KWH Premium Lithium Powerwall",
              description: "Long-lived premium LiFePO4 pack. Wall mounted space-saving layout.",
              category: "Batteries",
              price: 1850000,
              originalPrice: 2200000,
              discountPercent: 15,
              rating: 4.9,
              ratingCount: 31,
              image: "https://images.unsplash.com/photo-1548613053-220ef31815bb?auto=format&fit=crop&w=400&q=80",
              features: ["LiFePO4 Chemistry", "6000 Cycles", "Smart BMS"],
              specs: { "Capacity": "5.0 KWH", "Voltage": "48V" },
              stock: 4
            },
            quantity: 1
          }
        ],
        subtotal: 2330000,
        deliveryFee: 0,
        discount: 405000,
        total: 2330000,
        customerDetails: {
          name: "Michael Adeleke",
          email: "adeleke.m@lagoscorp.ng",
          phone: "+234 809 999 8210",
          city: "Lagos",
          address: "Block B, Penthouse suite, Ikoyi Towers"
        },
        status: "processing",
        createdAt: new Date(baseNow.getTime() - 4 * 3600000).toISOString(),
        paymentMethod: "Bank Transfer/Direct Draft",
        trackingProgress: [
          { status: 'pending', label: 'Order Approved', timestamp: '10:14 AM', completed: true, desc: "Order approved. Layout drawings locked." },
          { status: 'confirmed', label: 'Engineering Audit Passed', timestamp: '10:17 AM', completed: true, desc: "Technical loads audit verified." },
          { status: 'processing', label: 'Lab Pre-commissioning', timestamp: '10:30 AM', completed: true, desc: "LFP Battery banks balanced at SkyIT tech lab." },
          { status: 'shipped', label: 'Dispatched to Site', timestamp: '--:--', completed: false, desc: "Cabling and heavy panels en route via SkyIT Delivery." },
          { status: 'out_for_delivery', label: 'Engineering Team Deploying', timestamp: '--:--', completed: false, desc: "Technical field crew preparing tools." },
          { status: 'delivered', label: 'System Handover Live', timestamp: '--:--', completed: false, desc: "Verification checklist completed." }
        ]
      },
      {
        id: "SK-140283",
        items: [
          {
            product: {
              id: "prod-6",
              name: "Ultra-HD CCTV dome security suite",
              description: "4x 4K outdoor bullet dome cameras, 8-channel NVR with human AI motion triggers.",
              category: "Security Systems",
              price: 320000,
              originalPrice: 400000,
              discountPercent: 20,
              rating: 4.7,
              ratingCount: 19,
              image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80",
              features: ["4K Night Vision", "AI Smart Triggers", "Weatherproof"],
              specs: { "Resolution": "8.0 Megapixels", "Channels": "8 Channels" },
              stock: 12
            },
            quantity: 1
          }
        ],
        subtotal: 320000,
        deliveryFee: 15000,
        discount: 80000,
        total: 335000,
        customerDetails: {
          name: "Chinedu Okafor",
          email: "chinedu@okaforholding.com",
          phone: "+234 812 345 6789",
          city: "Delta",
          address: "House 4A, Crescent 17, Gwarinpa Estate"
        },
        status: "confirmed",
        createdAt: new Date(baseNow.getTime() - 24 * 3600000).toISOString(),
        paymentMethod: "Flutterwave Redirect Secure",
        trackingProgress: [
          { status: 'pending', label: 'Order Approved', timestamp: '01:05 PM', completed: true, desc: "Order approved. Layout drawings locked." },
          { status: 'confirmed', label: 'Engineering Audit Passed', timestamp: '01:15 PM', completed: true, desc: "Technical loads audit verified." },
          { status: 'processing', label: 'Lab Pre-commissioning', timestamp: '--:--', completed: false, desc: "LFP Battery banks balanced." },
          { status: 'shipped', label: 'Dispatched to Site', timestamp: '--:--', completed: false, desc: "Cabling and heavy panels en route." },
          { status: 'out_for_delivery', label: 'Engineering Team Deploying', timestamp: '--:--', completed: false, desc: "Technical field crew preparing tools." },
          { status: 'delivered', label: 'System Handover Live', timestamp: '--:--', completed: false, desc: "Verification checklist completed." }
        ]
      }
    ];

    try {
      for (const ord of demoOrders) {
        const orderRef = doc(db, 'orders', ord.id);
        await setDoc(orderRef, ord);
      }
      setFeedbackMsg("Successfully seeded sample records in Firestore!");
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (saveErr) {
      console.error(saveErr);
      handleFirestoreError(saveErr, OperationType.WRITE, 'orders');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Update Status of an order in Firestore
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    setFeedbackMsg(`Advancing order ${orderId} state to [${newStatus}]...`);
    
    // Find the current order values to compile updated milestones
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Status sequences
    const statusSequence: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    const currentTargetIndex = statusSequence.indexOf(newStatus);

    const updatedMilestones: TrackingMilestone[] = targetOrder.trackingProgress.map((m) => {
      const idx = statusSequence.indexOf(m.status);
      const isCompleted = idx <= currentTargetIndex;
      return {
        ...m,
        completed: isCompleted,
        timestamp: isCompleted && m.timestamp === '--:--' ? timeStr : m.timestamp
      };
    });

    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, {
        status: newStatus,
        trackingProgress: updatedMilestones,
        updatedAt: new Date().toISOString()
      });

      // Log order state advancement
      await logAuditEvent(
        'UPDATE_ORDER_STATUS',
        orderId,
        'order',
        `Updated logistics status of order ${orderId} to: ${newStatus.toUpperCase()}`
      );

      setFeedbackMsg(`Successfully pushed state [${newStatus}] to order ${orderId}!`);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg(`Update failed due to security/network permissions.`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // 4. Cancel an order (setting status to 'cancelled')
  const handleCancelOrder = async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    
    if (targetOrder.status === 'cancelled') {
      return;
    }

    setFeedbackMsg(`Cancelling order ${orderId}...`);
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      // Log the order cancellation
      await logAuditEvent(
        'CANCEL_ORDER',
        orderId,
        'order',
        `Cancelled order record ${orderId} (Previous Status: ${targetOrder.status.toUpperCase()})`
      );

      setFeedbackMsg(`Order ${orderId} cancelled successfully.`);
      setConfirmingCancelOrderId(null);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg(`Cancellation failed: ${err.message || 'Permission denied'}`);
      setConfirmingCancelOrderId(null);
      setTimeout(() => setFeedbackMsg(''), 4500);
    }
  };

  // 5. Initialize Editing State with an Order's Details
  const startEditingOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setEditName(order.customerDetails.name);
    setEditEmail(order.customerDetails.email || '');
    setEditPhone(order.customerDetails.phone || '');
    setEditAddress(order.customerDetails.address || '');
    setEditCity(order.customerDetails.city || 'Lagos');
    setEditSubtotal(order.subtotal);
    setEditDeliveryFee(order.deliveryFee);
    setEditDiscount(order.discount);
  };

  // 6. Save Edited Order back to Firestore
  const handleSaveEditedOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const parseNum = (val: any) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const updatedSubtotal = parseNum(editSubtotal);
    const updatedDeliveryFee = parseNum(editDeliveryFee);
    const updatedDiscount = parseNum(editDiscount);
    const updatedTotal = updatedSubtotal + updatedDeliveryFee - updatedDiscount;

    const changes: string[] = [];
    if (order.customerDetails.name !== editName) {
      changes.push(`Name: "${order.customerDetails.name}" -> "${editName}"`);
    }
    if ((order.customerDetails.email || '') !== editEmail) {
      changes.push(`Email: "${order.customerDetails.email || ''}" -> "${editEmail}"`);
    }
    if ((order.customerDetails.phone || '') !== editPhone) {
      changes.push(`Phone: "${order.customerDetails.phone || ''}" -> "${editPhone}"`);
    }
    if ((order.customerDetails.address || '') !== editAddress) {
      changes.push(`Address: "${order.customerDetails.address || ''}" -> "${editAddress}"`);
    }
    if ((order.customerDetails.city || '') !== editCity) {
      changes.push(`City: "${order.customerDetails.city || ''}" -> "${editCity}"`);
    }
    if (order.subtotal !== updatedSubtotal) {
      changes.push(`Subtotal: ₦${order.subtotal.toLocaleString()} -> ₦${updatedSubtotal.toLocaleString()}`);
    }
    if (order.deliveryFee !== updatedDeliveryFee) {
      changes.push(`Delivery Fee: ₦${order.deliveryFee.toLocaleString()} -> ₦${updatedDeliveryFee.toLocaleString()}`);
    }
    if (order.discount !== updatedDiscount) {
      changes.push(`Discount: ₦${order.discount.toLocaleString()} -> ₦${updatedDiscount.toLocaleString()}`);
    }

    if (changes.length === 0) {
      setEditingOrderId(null);
      return;
    }

    setFeedbackMsg(`Saving order changes ${orderId}...`);
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, {
        customerDetails: {
          name: editName,
          email: editEmail,
          phone: editPhone,
          address: editAddress,
          city: editCity
        },
        subtotal: updatedSubtotal,
        deliveryFee: updatedDeliveryFee,
        discount: updatedDiscount,
        total: updatedTotal,
        updatedAt: new Date().toISOString()
      });

      // Log the audited changes
      await logAuditEvent(
        'UPDATE_ORDER_PARAMETERS',
        orderId,
        'order',
        `Re-edited order parameters. Changes: ${changes.join(' | ')}`
      );

      setFeedbackMsg(`Order ${orderId} updated successfully.`);
      setEditingOrderId(null);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg(`Failed to save edits: ${err.message || 'Permission denied'}`);
      setTimeout(() => setFeedbackMsg(''), 4500);
    }
  };

  // Filter logic
  const filteredOrders = orders.filter(o => {
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = 
      o.id.toLowerCase().includes(searchLow) ||
      o.customerDetails.name.toLowerCase().includes(searchLow) ||
      (o.customerDetails.email && o.customerDetails.email.toLowerCase().includes(searchLow)) ||
      (o.customerDetails.phone && o.customerDetails.phone.toLowerCase().includes(searchLow)) ||
      (o.customerDetails.address && o.customerDetails.address.toLowerCase().includes(searchLow)) ||
      (o.customerDetails.city && o.customerDetails.city.toLowerCase().includes(searchLow));
    
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="admin-panel-container">
      
      {/* Welcome Banner */}
      <div className="bg-[#050505] p-6 rounded-3xl border border-gray-800 text-white relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="bg-brand text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-sm tracking-wide">
              Secure Cloud Management
            </span>
            <span className="text-emerald-400 font-mono text-[9px] flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 border border-emerald-800/50 rounded">
              ● Firebase Online
            </span>
          </div>
          <h2 className="font-display font-black text-2xl tracking-tight text-white leading-none">
            SkyIT Ventures Management Suite
          </h2>
          <p className="text-xs text-gray-400">
            Comprehensive hub for overseeing logistics, AI-powered document generation, and inventory management.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 bg-brand-light text-brand text-xs font-semibold rounded-xl border border-brand/20 flex items-center gap-1.5 animate-scale-up">
          <Sparkles size={14} className="fill-brand/20 animate-spin" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Slideable Tabs Selector Navigation Container */}
      <div className="relative flex items-center border-b border-slate-200">
        
        {/* Left sliding button */}
        <button
          onClick={() => handleNavigateView('prev')}
          disabled={adminView === views[0]}
          className={`absolute left-0 z-10 p-2.5 h-full flex items-center bg-gradient-to-r from-white via-white/80 to-transparent transition-opacity ${
            adminView === views[0] ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:text-brand'
          }`}
          title="Slide to previous setup"
          aria-label="Previous view"
        >
          <div className="bg-slate-50 border border-slate-200 rounded-full p-1 shadow-3xs active:scale-90 transition-transform">
            <ChevronLeft size={13} strokeWidth={2.5} />
          </div>
        </button>

        {/* Scrollable Tabs */}
        <div 
          ref={tabsRef}
          className="flex-1 flex gap-3 overflow-x-auto scrollbar-none flex-nowrap whitespace-nowrap px-8 sm:px-0 w-full scroll-smooth select-none md:justify-center"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            onClick={() => setAdminView('logistics')}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border flex items-center gap-2 flex-shrink-0 cursor-pointer ${
              adminView === 'logistics' 
                ? 'bg-brand text-white border-brand' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Truck size={14} />
            <span>📦 Deliveries</span>
          </button>

          <button
            onClick={() => setAdminView('analytics')}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border flex items-center gap-2 flex-shrink-0 cursor-pointer ${
              adminView === 'analytics' 
                ? 'bg-brand text-white border-brand' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={14} />
            <span>📊 Analytics</span>
          </button>
          
          <button
            onClick={() => setAdminView('quote')}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border flex items-center gap-2 flex-shrink-0 cursor-pointer ${
              adminView === 'quote' 
                ? 'bg-brand text-white border-brand' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={14} className={adminView === 'quote' ? 'text-white' : 'text-brand'} />
            <span>✍️ AI Quotes</span>
          </button>
          
          <button
            onClick={() => setAdminView('products')}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border flex items-center gap-2 flex-shrink-0 cursor-pointer ${
              adminView === 'products' 
                ? 'bg-brand text-white border-brand' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Package size={14} />
            <span>🛍️ Catalog</span>
          </button>

          <button
            onClick={() => setAdminView('blog')}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border flex items-center gap-2 flex-shrink-0 cursor-pointer ${
              adminView === 'blog' 
                ? 'bg-brand text-white border-brand' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookOpen size={14} />
            <span>📰 Blog Articles</span>
          </button>

          {isUserAdmin && (
            <button
              onClick={() => setAdminView('roles')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                adminView === 'roles' 
                  ? 'bg-brand text-white border-brand' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users size={14} />
              <span>🛡️ Roles</span>
            </button>
          )}
        </div>

        {/* Right sliding button */}
        <button
          onClick={() => handleNavigateView('next')}
          disabled={adminView === views[views.length - 1]}
          className={`absolute right-0 z-10 p-2.5 h-full flex items-center bg-gradient-to-l from-white via-white/80 to-transparent transition-opacity ${
            adminView === views[views.length - 1] ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:text-brand'
          }`}
          title="Slide to next setup"
          aria-label="Next view"
        >
          <div className="bg-slate-50 border border-slate-200 rounded-full p-1 shadow-3xs active:scale-90 transition-transform">
            <ChevronRight size={13} strokeWidth={2.5} />
          </div>
        </button>

      </div>

      {adminView === 'analytics' ? (
        <AdminAnalyticsPanel 
          orders={orders} 
          onNavigateTab={setAdminView} 
        />
      ) : adminView === 'roles' ? (
        <RoleManager 
          currentUserUid={auth.currentUser?.uid} 
          isUserAdmin={isUserAdmin}
          isUserEditor={isUserEditor}
        />
      ) : adminView === 'blog' ? (
        <AdminBlogPanel 
          posts={blogPosts} 
          onPostsChange={setBlogPosts} 
        />
      ) : adminView === 'products' ? (
        <CatalogManager />
      ) : adminView === 'quote' ? (
        <div className="space-y-6">
          
          {/* Narrative Plain Text Entry Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <FileText size={16} className="text-brand" />
                  <span>Plain Text Client Requirements Narrative</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Input raw specifications, hand-written notes, client load requests, or logistics budgets. Gemini AI will size the components.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                AI Sizing Engine
              </span>
            </div>

            {/* Quick Templates Selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Click quick-seed templates:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "3.5KVA Tubular (Kaduna)",
                    text: "Sized a 3.5KVA Tubular system for Alhaji Shuaibu in Kaduna. He has some LED lights, a smart TV, inverter fridge, and 2 ceiling fans. Keep the contract total price at N1,780,000 Naira including transportation."
                  },
                  {
                    label: "6.0KVA Premium Lithium (Ikeja)",
                    text: "Premium quotation for Dr. Chinedu Okafor in Ikeja. Wants our 6.0KVA (15KWH) premium lithium energy system to support normal household electronics, deep freezer, and two energy-saving inverter air conditioners. Standard contract sum is 4,950,000 Naira total."
                  },
                  {
                    label: "1.5KVA Starter (Ibadan)",
                    text: "Starter solar project note for Mrs. Funmi Alao in Ibadan. Sized a 1.5KVA starter model with tubular battery layout. Primary appliances: laptop, 4 lightbulbs, 1 table fan. Total contract price N948,000 Naira."
                  }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setNarrativeInput(tpl.text)}
                    className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-1.5 rounded-xl transition-all font-semibold"
                  >
                    💡 {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Textarea input */}
            <textarea
              value={narrativeInput}
              onChange={(e) => setNarrativeInput(e.target.value)}
              placeholder="Paste unstructured notes from lead engineer or clients here... (e.g., 'Sized a 5kva system for Chief Adenuga in Delta, 1 fridge, 3 lighting fixtures, wants tubular cells, total is ₦1.9M...')"
              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden text-slate-800 placeholder-slate-400 resize-none font-sans"
              disabled={isGeneratingQuote}
            />

            {quoteError && (
              <p className="text-xs text-rose-500 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                ⚠️ {quoteError}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleGenerateAIQuote}
                className="bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-98"
                disabled={isGeneratingQuote || !narrativeInput.trim()}
              >
                {isGeneratingQuote ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>{generationLoaderMsg}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="fill-white/20 animate-pulse" />
                    <span>Compile Quotation with Gemini AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Quotation Workspace (Split Panel Layout) */}
          {quoteResult && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Adjust Parameters Ledger Form */}
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-4">
                <div className="border-b pb-2">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    Adjust Sizing Parameters (Tweak Proposal)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Fine-tune any values generated by Gemini. The preview sheet on the right compiles live.
                  </p>
                </div>

                {/* Selected Document Type Toggle */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                  <label className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider block">Generated Document Template</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDocumentType('quotation')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center cursor-pointer ${
                        documentType === 'quotation'
                          ? 'bg-brand text-white border-brand shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Proposal & Quotation
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentType('receipt')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center cursor-pointer ${
                        documentType === 'receipt'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Payment Receipt
                    </button>
                  </div>
                </div>

                {/* Client Profile fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</label>
                    <input
                      type="text"
                      value={quoteResult.customerName}
                      onChange={(e) => setQuoteResult({ ...quoteResult, customerName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Line</label>
                    <input
                      type="text"
                      value={quoteResult.customerPhone}
                      onChange={(e) => setQuoteResult({ ...quoteResult, customerPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Email address</label>
                    <input
                      type="email"
                      value={quoteResult.customerEmail}
                      onChange={(e) => setQuoteResult({ ...quoteResult, customerEmail: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Installation Site Address</label>
                    <input
                      type="text"
                      value={quoteResult.customerAddress}
                      onChange={(e) => setQuoteResult({ ...quoteResult, customerAddress: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">City</label>
                    <input
                      type="text"
                      value={quoteResult.city}
                      onChange={(e) => setQuoteResult({ ...quoteResult, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">State</label>
                    <input
                      type="text"
                      value={quoteResult.state}
                      onChange={(e) => setQuoteResult({ ...quoteResult, state: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                  </div>
                </div>

                {/* Technical stats fields */}
                <div className="grid grid-cols-3 gap-2 border-t pt-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Capacity (KVA)</label>
                    <input
                      type="text"
                      value={quoteResult.systemKva}
                      onChange={(e) => setQuoteResult({ ...quoteResult, systemKva: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 uppercase font-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Inverter Label</label>
                    <input
                      type="text"
                      value={quoteResult.inverterInfo}
                      onChange={(e) => setQuoteResult({ ...quoteResult, inverterInfo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 truncate"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Battery Cells</label>
                    <select
                      value={quoteResult.batteryTech}
                      onChange={(e) => setQuoteResult({ ...quoteResult, batteryTech: e.target.value as 'tubular' | 'lithium' })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-bold uppercase"
                    >
                      <option value="tubular">Tubular</option>
                      <option value="lithium">Lithium</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Battery Setup Label</label>
                    <input
                      type="text"
                      value={quoteResult.batteryInfo}
                      onChange={(e) => setQuoteResult({ ...quoteResult, batteryInfo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Batteries Count</label>
                    <input
                      type="number"
                      value={quoteResult.batteriesCount}
                      onChange={(e) => setQuoteResult({ ...quoteResult, batteriesCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">PV Panel Array Label</label>
                    <input
                      type="text"
                      value={quoteResult.panelsInfo}
                      onChange={(e) => setQuoteResult({ ...quoteResult, panelsInfo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">PV Solar Panels Qty</label>
                    <input
                      type="number"
                      value={quoteResult.panelsCount}
                      onChange={(e) => setQuoteResult({ ...quoteResult, panelsCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-mono"
                    />
                  </div>
                </div>

                {/* Accounting ledger parameters */}
                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Engineering Service Fee (₦)</label>
                    <input
                      type="number"
                      value={quoteResult.serviceFee}
                      onChange={(e) => setQuoteResult({ ...quoteResult, serviceFee: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-mono font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Total Sized Quote Price (₦)</label>
                    <input
                      type="number"
                      value={quoteResult.price}
                      onChange={(e) => setQuoteResult({ ...quoteResult, price: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-mono font-semibold text-brand"
                    />
                  </div>
                </div>

                {/* Editorial text briefing */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Executive Sizing Brief Narrative</label>
                  <textarea
                    value={quoteResult.proposalText}
                    onChange={(e) => setQuoteResult({ ...quoteResult, proposalText: e.target.value })}
                    className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-sans resize-none"
                  />
                </div>

                {/* Accessories dynamic modifiers */}
                <div className="space-y-2 border-t pt-3">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Accessories bundle included & Prices (₦)</label>
                  
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {quoteResult.accessories.map((acc, index) => {
                      const priceVal = quoteResult.accessoriesPrices?.[acc] ?? 0;
                      return (
                        <div key={index} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-150 rounded-xl">
                          <span className="text-[10px] font-medium text-slate-700 truncate flex-1 block pr-2" title={acc}>
                            {acc}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] text-slate-400 font-bold">₦</span>
                            <input 
                              type="number"
                              placeholder="Price"
                              value={priceVal === 0 ? '' : priceVal}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const updatedPrices = { ...(quoteResult.accessoriesPrices || {}) };
                                updatedPrices[acc] = val;
                                setQuoteResult({ ...quoteResult, accessoriesPrices: updatedPrices });
                              }}
                              className="w-20 bg-white border border-slate-200 rounded-lg py-0.5 px-1.5 text-[10px] font-mono text-right focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                            />
                            <button 
                              onClick={() => {
                                const updated = quoteResult.accessories.filter((_, i) => i !== index);
                                const updatedPrices = { ...(quoteResult.accessoriesPrices || {}) };
                                delete updatedPrices[acc];
                                setQuoteResult({ 
                                  ...quoteResult, 
                                  accessories: updated,
                                  accessoriesPrices: updatedPrices
                                });
                              }}
                              className="text-slate-400 hover:text-red-500 font-bold text-sm px-1.5"
                              type="button"
                              title="Remove hardware"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {quoteResult.accessories.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No accessories listed.</p>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Add custom hardware component..."
                      value={newAccessoryText}
                      onChange={e => setNewAccessoryText(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                    <button 
                      onClick={() => {
                        if (newAccessoryText.trim()) {
                          const name = newAccessoryText.trim();
                          const updatedPrices = { ...(quoteResult.accessoriesPrices || {}) };
                          updatedPrices[name] = 0;
                          setQuoteResult({
                            ...quoteResult,
                            accessories: [...quoteResult.accessories, name],
                            accessoriesPrices: updatedPrices
                          });
                          setNewAccessoryText('');
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-3 text-xs text-slate-800 font-black"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Appliances dynamic modifiers */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Supported appliances array</label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {quoteResult.appliancesMatched.map((app, index) => (
                      <span key={index} className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2 py-0.5 text-[9px] flex items-center gap-1.5 font-medium">
                        <span>{app}</span>
                        <button 
                          onClick={() => {
                            const updated = quoteResult.appliancesMatched.filter((_, i) => i !== index);
                            setQuoteResult({ ...quoteResult, appliancesMatched: updated });
                          }}
                          className="text-slate-400 hover:text-red-500 font-black text-xs"
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Add supported item..."
                      value={newApplianceText}
                      onChange={e => setNewApplianceText(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    />
                    <button 
                      onClick={() => {
                        if (newApplianceText.trim()) {
                          setQuoteResult({
                            ...quoteResult,
                            appliancesMatched: [...quoteResult.appliancesMatched, newApplianceText.trim()]
                          });
                          setNewApplianceText('');
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-3 text-xs text-slate-800 font-black"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Quotation letterhead A4 Preview with double-actions */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Actions Bar */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-3xs flex flex-wrap gap-3 items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Action Control Panel</span>
                    <span className="font-bold text-slate-700">Official System {documentType === 'receipt' ? 'Receipt' : 'Invoice'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="bg-brand hover:bg-brand-hover text-white transition-all text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={handleSaveGeneratedQuoteToDB}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Record & Log Contract</span>
                    </button>
                  </div>
                </div>

                {/* Printable A4 Container with letterhead */}
                <div className="bg-white border border-slate-200 rounded-3xl p-1 shadow-2xs overflow-hidden">
                  <div 
                    id="quote-print-element" 
                    className="bg-white text-slate-800 p-8 mx-auto max-w-[800px] text-xs font-sans space-y-6"
                  >
                    
                    {/* Brand banner Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-950 pb-4">
                      <div className="space-y-1 max-w-[480px]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <img 
                            src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                            className="w-7 h-7 object-contain" 
                            referrerPolicy="no-referrer"
                            alt="SkyIT Logo" 
                          />
                          <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase leading-none">
                            SKYIT VENTURES LTD
                          </h1>
                        </div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1">Premium Hybrid Solar Engineering & Power Backup Solutions</p>
                        
                        <div className="grid grid-cols-2 gap-3 text-[7.5px] leading-tight text-slate-600">
                          <div>
                            <span className="font-extrabold text-slate-900 block uppercase text-[7px]">Head Office:</span>
                            <p className="font-medium">KM 1 DSC Expressway beside Jesus Temple Church, Ebrumede, Effurun-Warri, Delta State</p>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block uppercase text-[7px]">Branch Office:</span>
                            <p className="font-medium">Manjo Plaza, NNPC Service Station, Ikota, Second Gate, K.M 22, Lekki-Epe Expressway, Lekki, Lagos</p>
                          </div>
                        </div>

                        <div className="pt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[7.5px] text-slate-500 font-mono border-t border-slate-100 mt-1">
                          <p>
                            <span className="font-extrabold text-slate-800">Email:</span> <strong className="text-slate-900 font-semibold font-sans">skyitventures01@gmail.com</strong>
                          </p>
                          <p>
                            <span className="font-extrabold text-slate-800">Lines:</span> <strong className="text-slate-900 font-bold">+234-9135396292, +234-9074444140, +234-9017777773, +234-9017777774</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`${documentType === 'receipt' ? 'bg-emerald-600' : 'bg-slate-950'} text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wide`}>
                          {documentType === 'receipt' ? 'OFFICIAL PAYMENT RECEIPT' : 'PROPOSAL & QUOTATION'}
                        </span>
                        <p className="mt-2 text-[9px] font-bold text-slate-900">
                          DATE: {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[8px] text-slate-500 font-mono">CODE: {documentType === 'receipt' ? 'SKY-REC' : 'SKY-QTY'}-{docCode}</p>
                        <p className="text-[8px] text-slate-500 font-mono">
                          {documentType === 'receipt' ? 'PAYMENT STATUS: PAID (FULL)' : 'VALIDITY: 14 Days'}
                        </p>
                      </div>
                    </div>

                    {/* Lead proposal Brief */}
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-brand tracking-widest block mb-1">
                        {documentType === 'receipt' ? 'Transaction Narrative & Reference' : 'Executive Summary'}
                      </span>
                      <p className="text-slate-600 italic leading-relaxed text-[10px]">
                        "{quoteResult.proposalText}"
                      </p>
                    </div>

                    {/* Profile layout */}
                    <div className="grid grid-cols-2 gap-6">
                      
                      <div>
                        <span className="text-[8px] font-black tracking-wider uppercase text-slate-400 block mb-1.5">
                          PREPARED FOR CLIENT
                        </span>
                        <div className="space-y-0.5 text-[10px]">
                          <p className="font-bold text-slate-900 text-sm leading-tight text-brand">
                            {quoteResult.customerName || "Valued Client"}
                          </p>
                          {quoteResult.customerEmail && quoteResult.customerEmail.trim() !== "" ? (
                            <p className="text-slate-500">{quoteResult.customerEmail}</p>
                          ) : null}
                          {quoteResult.customerPhone && quoteResult.customerPhone.trim() !== "" ? (
                            <p className="text-slate-500 font-mono">{quoteResult.customerPhone}</p>
                          ) : null}
                          {quoteResult.customerAddress && quoteResult.customerAddress.trim() !== "" && (
                            <p className="text-slate-400 italic mt-1 leading-normal">
                              {quoteResult.customerAddress}
                            </p>
                          )}
                          <p className="text-slate-400 font-medium">
                            {quoteResult.city}, {quoteResult.state}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <div>
                          <span className="text-[8px] font-black tracking-wider uppercase text-slate-400 block mb-1">
                            ENGINEERING CLASSIFICATION
                          </span>
                          <p className="font-black text-slate-800 text-xs uppercase flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                            <span>{quoteResult.systemKva} SYSTEM DEPLOYMENT</span>
                          </p>
                          <p className="text-[9px] text-slate-500 mt-2 font-medium">
                            🌿 Inverter: {quoteResult.inverterInfo}
                          </p>
                          <p className="text-[9px] text-slate-500 font-medium">
                            🔋 Storage: {quoteResult.batteryInfo} ({quoteResult.batteriesCount} Units)
                          </p>
                          <p className="text-[9px] text-slate-500 font-medium">
                            ☀️ PV Array: {quoteResult.panelsInfo} ({quoteResult.panelsCount} Units)
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Equipment matching lists */}
                    <div className="grid grid-cols-2 gap-6 pt-2">
                      
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-black tracking-wider uppercase text-slate-400 block">
                          APPLIANCES COVERED BY SYSTEM DESIGN
                        </span>
                        <ul className="grid grid-cols-1 gap-1 pl-4 list-disc text-slate-605 text-[9px]">
                          {quoteResult.appliancesMatched.map((item, idx) => (
                            <li key={idx} className="font-medium text-slate-600">{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[8px] font-black tracking-wider uppercase text-slate-400 block">
                          ACCESSORY BALANCE OF SYSTEM (BOS)
                        </span>
                        <ul className="grid grid-cols-1 gap-1 pl-4 list-disc text-slate-605 text-[9px]">
                          {quoteResult.accessories.map((acc, idx) => (
                            <li key={idx} className="font-medium text-slate-600">{acc}</li>
                          ))}
                        </ul>
                      </div>

                    </div>

                    {/* Sizing Ledger Table */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[8px] font-black tracking-wider uppercase text-slate-400 block">
                        BILL OF MATERIALS (BOM) & PRICING
                      </span>
                      <div className="border border-slate-150 rounded-2xl overflow-hidden">
                        {(() => {
                          const totalAccessoriesPrice = quoteResult.accessories.reduce((sum, acc) => {
                            return sum + (quoteResult.accessoriesPrices?.[acc] || 0);
                          }, 0);
                          return (
                            <table className="w-full text-left border-collapse text-[9px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[8px] tracking-wider">
                                  <th className="py-2 px-3">Item Description</th>
                                  <th className="py-2 px-3 text-right shrink-0">Qty</th>
                                  <th className="py-2 px-3 text-right">Ext Value (₦)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-650">
                                <tr>
                                  <td className="py-2 px-3 font-semibold text-slate-800">
                                    {quoteResult.inverterInfo} (MPPT Built-in)
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">1 Unit</td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-400">Included</td>
                                </tr>
                                {quoteResult.batteriesCount > 0 && (
                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-slate-800">
                                      {quoteResult.batteryInfo} ({quoteResult.batteryTech})
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">{quoteResult.batteriesCount} Units</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-400">Included</td>
                                  </tr>
                                )}
                                {quoteResult.panelsCount > 0 && (
                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-slate-800">
                                      {quoteResult.panelsInfo} (Tier-1 high efficiency cells)
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">{quoteResult.panelsCount} Units</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-400">Included</td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="py-2 px-3 font-semibold text-slate-800">
                                    Balance of System (Cables, Trunking, AC/DC Breakers, Over-voltage surge protectors)
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">1 Lot</td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-400">Included</td>
                                </tr>
                                
                                {/* Dynamically list priced accessories */}
                                {quoteResult.accessories.map((acc, aIdx) => {
                                  const accPrice = quoteResult.accessoriesPrices?.[acc] || 0;
                                  if (accPrice <= 0) return null;
                                  return (
                                    <tr key={`bom-acc-${aIdx}`}>
                                      <td className="py-2 px-3 text-slate-800 pl-5 border-l-2 border-brand font-medium">
                                        🔧 Accessory: {acc}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono">1 Lot</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-700 font-semibold">
                                        ₦{accPrice.toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })}

                                <tr>
                                  <td className="py-2 px-3 font-semibold text-slate-800">
                                    Site delivery, transport, mount, dynamic calibration & commissioning engineering fee
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">1 Job</td>
                                  <td className="py-2 px-3 text-right font-mono font-black text-slate-700">
                                    ₦{quoteResult.serviceFee.toLocaleString()}
                                  </td>
                                </tr>
                                
                                <tr className="border-t border-slate-200 text-[10px] bg-slate-50/50">
                                  <td className="py-2 px-3 font-extrabold text-slate-800" colSpan={2}>
                                    System Machinery & Hardware Base Value
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                                    ₦{(quoteResult.price - quoteResult.serviceFee - totalAccessoriesPrice).toLocaleString()}
                                  </td>
                                </tr>
                                
                                <tr className="bg-slate-50 border-t border-slate-300 font-extrabold text-[12px]">
                                  <td className="py-2.5 px-3 uppercase text-slate-900" colSpan={2}>
                                    Fully Sized Contract Sum (All VAT Incl.)
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-black text-brand text-sm border-l">
                                    ₦{quoteResult.price.toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Payment accounts instructions */}
                    <div className="border-t border-slate-200 pt-5 space-y-4">
                      <div className="bg-slate-50/65 rounded-2xl p-4 border border-slate-150 text-[10px] space-y-3">
                        <div className="flex items-center gap-1.5 text-slate-900">
                          <span className="text-xs">🏢</span> 
                          <span className="font-extrabold uppercase tracking-wider text-[9px]">
                            OFFICIAL BANK PAYMENT DETAILS
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 pt-1">
                          {/* UBA Bank Column */}
                          <div className="space-y-1.5 border-r border-slate-200 pr-4">
                            <span className="font-black text-slate-950 uppercase tracking-wider block text-[10px] pb-1 border-b border-slate-200">
                              UBA BANK
                            </span>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">ACCOUNT NAME:</p>
                              <p className="font-black text-slate-800 text-[10px] uppercase tracking-wide leading-tight">SKYITVENTURES</p>
                            </div>
                            <div className="pt-0.5">
                              <p className="font-black text-slate-950 font-mono text-sm tracking-wide leading-none">
                                1019649972
                              </p>
                            </div>
                          </div>

                          {/* Moniepoint Column */}
                          <div className="space-y-1.5 pl-2">
                            <span className="font-black text-slate-950 uppercase tracking-wider block text-[10px] pb-1 border-b border-slate-200">
                              MONIEPOINT
                            </span>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">ACCOUNT NAME:</p>
                              <p className="font-black text-slate-800 text-[10px] uppercase tracking-wide leading-tight">SKYITVENTURE LTD</p>
                            </div>
                            <div className="pt-0.5">
                              <p className="font-black text-slate-950 font-mono text-sm tracking-wide leading-none">
                                8197495545
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-200/80 pt-2.5 text-center text-slate-500 font-extrabold italic text-[8.5px] tracking-wide uppercase">
                          * PLEASE USE QUOTE REFERENCE OR NAME AS PAYMENT DESCRIPTION.
                        </div>

                        <div className="flex items-center justify-center gap-1.5 text-[8px] text-slate-400 tracking-widest font-black uppercase pt-1 border-t border-dotted border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-450 inline-block mb-0.5"></span>
                          <span>SKYIT VENTURES OFFICIAL FINANCIAL DOCUMENT</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end text-[8px] text-slate-450 leading-normal gap-4">
                        <div>
                          <p className="text-[7.5px] text-slate-450 mt-1 leading-relaxed max-w-[420px]">
                            <strong>Notice & Sizing Specifications:</strong> Subject to technical roof feasibility audit. All machinery and hardware components are backed by SkyIT's lifetime premium technical support and certified hardware warranties.
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-400 mb-8 leading-none uppercase tracking-wide">Authorized Operations Endorsement</p>
                          <p className="font-mono text-[9px] border-t border-slate-350 pt-1 text-slate-800 font-extrabold uppercase tracking-widest">
                            SKYIT SIZING CERTIFIED
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      ) : (
        <>
          {/* Control Filters Area */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by Order ID, Client Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-9.5 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Status Dropdown Filter */}
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-705 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
              >
                <option value="All">All Operations (Show All)</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing (Pre-com)</option>
                <option value="shipped">Shipped</option>
                <option value="out_for_delivery">Out For Delivery (Installing)</option>
                <option value="delivered">Delivered (Live Handover)</option>
              </select>
            </div>

            {/* Manual Refresh / Sync Button */}
            <div>
              <button
                type="button"
                onClick={fetchOrdersOnce}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
                id="btn-sync-orders"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                <span>Sync Live Orders</span>
              </button>
            </div>

            <div className="text-right text-[10px] font-mono text-slate-400">
              Showing {filteredOrders.length} / {orders.length} Logged Systems
            </div>

          </div>

          {/* Orders Grid/Table Display */}
          {isLoading ? (
            <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center space-y-3">
              <RefreshCw className="animate-spin text-brand mx-auto" size={32} />
              <p className="text-xs text-slate-400 font-mono">Synchronizing with live Firestore nodes...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center space-y-3">
              <ClipboardList className="text-slate-300 mx-auto" size={40} />
              <h3 className="text-sm font-semibold text-slate-700">No Operations Found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                There are currently no orders matching this search criteria. Build custom client quotes or click "One-Click Seed Orders" above to populate records.
              </p>
            </div>
          ) : (
            <div className="space-y-4 font-sans">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-3xs hover:shadow-2xs transition-shadow flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100"
                >
                  
                  {/* Box 1: Customer Profile Details */}
                  <div className="p-5 md:w-1/3 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-slate-900 border-b border-brand border-dashed leading-none py-1 block">
                        {order.id}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {editingOrderId === order.id ? (
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Edit Customer Details</span>
                        <div className="space-y-1.5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 block">Name</label>
                            <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-white border border-slate-205 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand font-bold"
                              placeholder="Customer Name"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 block">Email</label>
                            <input 
                              type="email" 
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full bg-white border border-slate-205 rounded-lg p-2 text-[11px] text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand"
                              placeholder="Email Address"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 block">Phone</label>
                            <input 
                              type="text" 
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full bg-white border border-slate-205 rounded-lg p-2 text-[11px] text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand font-mono"
                              placeholder="Phone Number"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 block">Address</label>
                            <textarea 
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              className="w-full bg-white border border-slate-205 rounded-lg p-2 text-[11px] text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand h-12"
                              placeholder="Installation Address"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 block">City</label>
                            <input 
                              type="text" 
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              className="w-full bg-white border border-slate-205 rounded-lg p-2 text-[11px] text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand"
                              placeholder="City"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'cancelled' ? 'bg-rose-500' : 'bg-brand'}`} />
                          <span>{order.customerDetails.name}</span>
                        </div>
                        <p className="text-[11px] truncate leading-tight text-slate-500">{order.customerDetails.email}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{order.customerDetails.phone}</p>
                        <p className="text-[11px] italic bg-slate-100 p-1.5 rounded border border-slate-200 mt-1">{order.customerDetails.address}, {order.customerDetails.city || 'Lagos'}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-150">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Hardware Selected</span>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-[10px] flex justify-between leading-normal text-slate-600">
                            <span className="truncate max-w-[190px] font-semibold">{item.product.name}</span>
                            <span className="font-mono text-slate-400 shrink-0">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Box 2: Sizing Accounting Metrics & Status Stepper */}
                  <div className="p-5 md:w-1/3 space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-2">Financial Breakdown</span>
                      
                      {editingOrderId === order.id ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-400 text-[10px]">Subtotal:</span>
                            <div className="flex items-center max-w-[130px]">
                              <span className="text-slate-400 mr-1 text-[11px]">₦</span>
                              <input 
                                type="number" 
                                value={editSubtotal}
                                onChange={(e) => setEditSubtotal(Number(e.target.value))}
                                className="w-full bg-white border border-slate-205 rounded p-1 text-xs font-mono font-bold text-right text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-400 text-[10px]">Delivery Fee:</span>
                            <div className="flex items-center max-w-[130px]">
                              <span className="text-slate-400 mr-1 text-[11px]">₦</span>
                              <input 
                                type="number" 
                                value={editDeliveryFee}
                                onChange={(e) => setEditDeliveryFee(Number(e.target.value))}
                                className="w-full bg-white border border-slate-205 rounded p-1 text-xs font-mono font-bold text-right text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-rose-500">
                            <span className="text-[10px]">Campaign Rebate:</span>
                            <div className="flex items-center max-w-[130px]">
                              <span className="mr-1 text-[11px]">-₦</span>
                              <input 
                                type="number" 
                                value={editDiscount}
                                onChange={(e) => setEditDiscount(Number(e.target.value))}
                                className="w-full bg-white border border-slate-205 rounded p-1 text-xs font-mono font-bold text-right text-rose-600 focus:outline-hidden focus:ring-1 focus:ring-brand"
                              />
                            </div>
                          </div>
                          <div className="flex justify-between font-black text-slate-900 border-t border-slate-100 pt-1.5 mt-1.5 text-sm">
                            <span className="font-sans">Receipt total:</span>
                            <span>₦{(editSubtotal + editDeliveryFee - editDiscount).toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cabinet subtotal:</span>
                            <span className="text-slate-700">₦{order.subtotal.toLocaleString()}</span>
                          </div>
                          {order.deliveryFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Logistic Delivery:</span>
                              <span className="text-slate-700">₦{order.deliveryFee.toLocaleString()}</span>
                            </div>
                          )}
                          {order.discount > 0 && (
                            <div className="flex justify-between text-rose-500">
                              <span>Campaign Rebate:</span>
                              <span>-₦{order.discount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-slate-900 border-t border-slate-100 pt-1.5 mt-1.5 text-sm">
                            <span className="font-sans">Receipt total:</span>
                            <span>₦{order.total.toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      <span className="text-[9px] bg-slate-100 border border-slate-200 rounded p-1 inline-block mt-3 font-medium text-slate-500">
                        🔐 Payment Method: {order.paymentMethod}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 block mb-1">Live Tracker Status</span>
                      <div className="flex items-center gap-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          order.status === 'delivered' ? 'bg-emerald-500 animate-pulse' :
                          order.status === 'cancelled' ? 'bg-rose-500' : 'bg-brand'
                        }`} />
                        <span className={`text-xs uppercase font-extrabold tracking-wider ${
                          order.status === 'cancelled' ? 'text-rose-600' : 'text-slate-800'
                        }`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Box 3: Technical Progress Controls */}
                  <div className="p-5 md:w-1/3 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">Advancement Trigger</label>
                        <div className="flex gap-1">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                            disabled={updatingOrderId === order.id}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 font-bold uppercase tracking-wide text-xs focus:ring-1 focus:ring-brand focus:outline-hidden disabled:opacity-50"
                          >
                            <option value="pending">1. Pending Review</option>
                            <option value="confirmed">2. Checked (Admin Approved)</option>
                            <option value="processing">3. Processing (Lab Pre-com)</option>
                            <option value="shipped">4. Shipped (En Route)</option>
                            <option value="out_for_delivery">5. Out for Installation</option>
                            <option value="delivered">6. Delivered & Handed Over</option>
                            <option value="cancelled">X. Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Micro milestone tracker overview */}
                      <div className="bg-slate-50 p-2.5 border border-slate-150 rounded-xl space-y-1.5">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">Milestones Completeness</span>
                        <div className="flex gap-1">
                          {order.trackingProgress.map((m, mIdx) => (
                            <div 
                              key={mIdx}
                              title={`${m.label}: ${m.completed ? 'Completeness Approved' : 'Incomplete'}`}
                              className={`h-1.5 flex-1 rounded-sm ${
                                m.completed ? 'bg-brand' : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[9px] text-slate-400 italic">Logistics Hub: SkyIT Ikeja Terminal</span>
                      <div className="flex gap-2">
                        {editingOrderId === order.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEditedOrder(order.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 px-3 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                              title="Save edits"
                            >
                              <Save size={12} />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOrderId(null)}
                              className="bg-slate-150 hover:bg-slate-200 text-slate-700 p-2 px-3 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                              title="Discard edits"
                            >
                              <X size={12} />
                              <span>Discard</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditingOrder(order)}
                              className="text-slate-500 hover:text-brand p-1.5 px-2.5 bg-slate-100 hover:bg-slate-200/50 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                              title="Re-edit details"
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                            {order.status === 'cancelled' ? (
                              <span className="text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                Cancelled
                              </span>
                            ) : confirmingCancelOrderId === order.id ? (
                              <div className="flex items-center gap-1.5 animate-fadeIn">
                                <span className="text-[9.5px] font-bold text-rose-650 uppercase tracking-wider mr-0.5">Sure?</span>
                                <button
                                  type="button"
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 px-2.5 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                                  title="Confirm cancellation"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingCancelOrderId(null)}
                                  className="text-slate-500 hover:text-slate-700 p-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                                  title="Keep order"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingCancelOrderId(order.id)}
                                className="text-slate-400 hover:text-rose-650 p-1.5 px-2.5 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                                title="Cancel this order"
                              >
                                <XCircle size={13} />
                                <span>Cancel</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
};

