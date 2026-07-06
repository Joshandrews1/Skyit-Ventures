import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Search, MapPin, Truck, HelpCircle, ArrowRight, ArrowLeft, RefreshCw, Calendar, PackageCheck, ClipboardList } from 'lucide-react';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getOrCreateGuestUid, getCachedOrders, getCachedOrderIds, cacheOrderDetails } from '../lib/guestCache';

interface TrackingDashboardProps {
  initialOrderId?: string;
  onSelectProduct?: (prodId: string) => void;
  currentUser?: any;
  onOpenLogin?: () => void;
}

export const TrackingDashboard: React.FC<TrackingDashboardProps> = ({ 
  initialOrderId = '',
  onSelectProduct,
  currentUser,
  onOpenLogin
}) => {
  const [searchId, setSearchId] = useState(initialOrderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);

  // States for logged-in user order list history
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userOrdersLoading, setUserOrdersLoading] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);

  // Real-time listener for current user orders from firestore
  useEffect(() => {
    // Rely on current firebase authorized occupant profile
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) {
      setUserOrders([]);
      return;
    }

    setUserOrdersLoading(true);
    try {
      const ordersCol = collection(db, 'orders');
      const q = query(ordersCol, where('userId', '==', activeUser.uid));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Order);
        });
        
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserOrders(list);
        setUserOrdersLoading(false);

        // If the user hasn't selected a specific order, auto-load their latest order
        if (list.length > 0 && !searchId && !initialOrderId) {
          setSearchId(list[0].id);
        }
      }, (err) => {
        console.warn("Firestore onsnapshot failed for tracking account list:", err);
        setUserOrdersLoading(false);
      });

      return () => unsubscribe();
    } catch (fErr) {
      console.warn("Firestore query setup error:", fErr);
      setUserOrdersLoading(false);
    }
  }, [currentUser]);

  // Load and synchronize cached guest orders if not signed in
  useEffect(() => {
    const activeUser = auth.currentUser || currentUser;
    if (activeUser) return;

    // Load initial cached orders immediately for zero delay
    const cached = getCachedOrders();
    setUserOrders(cached);
    
    // Auto-select latest order if none is selected
    if (cached.length > 0 && !searchId && !initialOrderId) {
      setSearchId(cached[0].id);
    }

    const syncGuestOrders = async () => {
      const orderIds = getCachedOrderIds();
      if (orderIds.length === 0) return;

      const updatedOrders: Order[] = [];
      let hasUpdates = false;

      await Promise.all(orderIds.map(async (id) => {
        try {
          // Get the latest from Firestore (public get allowed)
          const docRef = doc(db, 'orders', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const freshOrder = docSnap.data() as Order;
            updatedOrders.push(freshOrder);
            cacheOrderDetails(freshOrder);
            hasUpdates = true;
          } else {
            // Fallback to API track endpoint
            const resp = await fetch(`/api/track/${id}`);
            if (resp.ok) {
              const freshOrder = await resp.json();
              updatedOrders.push(freshOrder);
              cacheOrderDetails(freshOrder);
              hasUpdates = true;
            } else {
              const existing = cached.find(o => o.id === id);
              if (existing) updatedOrders.push(existing);
            }
          }
        } catch (err) {
          console.warn("Could not sync guest order:", id, err);
          const existing = cached.find(o => o.id === id);
          if (existing) updatedOrders.push(existing);
        }
      }));

      if (hasUpdates) {
        updatedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserOrders(updatedOrders);
      }
    };

    syncGuestOrders();
  }, [currentUser, refreshToggle]);

  // Auto-refresh order tracking state every 4 seconds to catch real-time state changes!
  useEffect(() => {
    if (initialOrderId) {
      setSearchId(initialOrderId);
    }
  }, [initialOrderId]);

  useEffect(() => {
    if (!searchId) return;

    let active = true;
    const fetchOrder = async () => {
      try {
        // Try Firestore lookup first for real-time consistency
        try {
          const docRef = doc(db, 'orders', searchId.trim());
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && active) {
            const orderData = docSnap.data() as Order;
            setOrder(orderData);
            setError('');
            
            // If they are a guest, cache the successfully retrieved order details!
            if (!auth.currentUser && !currentUser) {
              cacheOrderDetails(orderData);
            }
            return;
          }
        } catch (dbErr) {
          console.warn("Firestore order tracking lookup fell back to REST API: ", dbErr);
        }

        const resp = await fetch(`/api/track/${searchId.trim()}`);
        if (!resp.ok) {
          if (active) setError("Order reference code not found in SkyIT system. Try placing an order first!");
          return;
        }
        const data = await resp.json();
        if (active) {
          setOrder(data);
          setError('');

          // If they are a guest, cache the successfully retrieved order details!
          if (!auth.currentUser && !currentUser) {
            cacheOrderDetails(data);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchOrder();

    // Setup polling (optimized to 30 seconds to minimize Firestore read counts)
    const interval = setInterval(fetchOrder, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [searchId, refreshToggle]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setRefreshToggle(prev => !prev);
  };

  // SVG Map helper coordinates and stages
  const getMapPosition = (status: OrderStatus) => {
    switch (status) {
      case 'cancelled': return { percent: 0 };
      case 'pending': return { percent: 5 };
      case 'confirmed': return { percent: 20 };
      case 'processing': return { percent: 45 };
      case 'shipped': return { percent: 65 };
      case 'out_for_delivery': return { percent: 85 };
      case 'delivered': return { percent: 100 };
      default: return { percent: 5 };
    }
  };

  const pos = order ? getMapPosition(order.status) : { percent: 5 };

  const formatNaira = (val: number) => {
    return "₦" + Math.floor(val).toLocaleString();
  };

  if (showAllOrders) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs max-w-4xl mx-auto text-slate-600 w-full overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAllOrders(false)}
              type="button"
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                <span>All Orders & Deployments</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                Comprehensive directory of your physical solar deployments and technical services history.
              </p>
            </div>
          </div>
          <span className="bg-brand-light text-brand text-[10px] font-black uppercase px-3 py-1 rounded-full border border-brand/20">
            {userOrders.length} {userOrders.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {/* Content list / table */}
        {userOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-200/50 rounded-2xl">
            <PackageCheck className="text-slate-300 mx-auto mb-3" size={48} />
            <h3 className="text-sm font-semibold text-slate-700">No Orders Registered</h3>
            <p className="text-xs text-slate-400 mt-2">
              Browse our catalog or size custom systems to initiate your first solar deployment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
              <div className="col-span-2">Order ID</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Items / Sizing</div>
              <div className="col-span-2">Total Price</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {/* List Rows */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
              {userOrders.map((ord) => {
                return (
                  <div
                    key={ord.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center p-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/80 transition-all shadow-xs"
                  >
                    {/* Order ID & Badge for status on mobile */}
                    <div className="col-span-1 md:col-span-2 flex justify-between items-center md:block">
                      <span className="font-mono text-xs font-black text-slate-900 block bg-slate-100 px-2 py-1 md:bg-transparent md:p-0 rounded-md">
                        {ord.id}
                      </span>
                      <div className="md:hidden">
                        <span className={`text-[8.5px] font-black uppercase px-2 py-1 rounded-full tracking-wider ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                          ord.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                          ord.status === 'out_for_delivery' ? 'bg-indigo-50 text-indigo-700' :
                          ord.status === 'shipped' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-span-1 md:col-span-2 text-[11px] text-slate-500 font-medium">
                      <span className="md:hidden text-[9px] font-black text-slate-400 uppercase block mb-0.5">Date</span>
                      {new Date(ord.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {/* Items / Sizing description */}
                    <div className="col-span-1 md:col-span-3 text-xs text-slate-600 font-medium">
                      <span className="md:hidden text-[9px] font-black text-slate-400 uppercase block mb-0.5">Sizing / Items</span>
                      <div className="truncate max-w-[280px]" title={ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                        {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="col-span-1 md:col-span-2 font-mono text-xs font-black text-slate-900">
                      <span className="md:hidden text-[9px] font-black text-slate-400 uppercase block mb-0.5">Total Amount</span>
                      {formatNaira(ord.total)}
                    </div>

                    {/* Status Badge (Desktop only) */}
                    <div className="hidden md:col-span-2 md:block">
                      <span className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider ${
                        ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                        ord.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                        ord.status === 'out_for_delivery' ? 'bg-indigo-50 text-indigo-700' :
                        ord.status === 'shipped' ? 'bg-blue-50 text-blue-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className="col-span-1 md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchId(ord.id);
                          setOrder(ord);
                          setError('');
                          setShowAllOrders(false);
                        }}
                        className="w-full md:w-auto bg-brand hover:bg-brand-hover text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-lg text-center transition-colors shadow-xs cursor-pointer"
                      >
                        Track
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-6 border border-slate-200 shadow-xs max-w-4xl mx-auto text-slate-600 w-full overflow-hidden">
      
      {/* Tracker Lookup Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
            <Truck className="text-brand animate-pulse" size={20} />
            <span>SkyIT Live Installation & Dispatch Tracker</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitor real-time hardware dispatch coordinates, technical milestone check-offs, and engineer commissioning updates.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Enter Order ID (e.g. SKYIT-7812)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 pl-9 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden text-slate-800 md:min-w-[210px] font-mono"
            />
          </div>
          <button 
            type="submit"
            className="bg-brand hover:bg-brand-hover text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
          >
            Track
          </button>
        </form>
      </div>

      {/* 1. Show order history tracker if user is logged in OR if they are a guest with cached orders on this device */}
      {(auth.currentUser || userOrders.length > 0) && (
        <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 font-sans" id="user-orders-history-panel">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <div className="flex items-center gap-1.5 text-slate-800">
              <ClipboardList className="text-brand" size={15} />
              <h3 className="font-display font-black text-[10px] uppercase tracking-wider">
                {auth.currentUser ? "My Purchases & Deployments" : "Recent Orders on This Device (Guest)"}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-brand-light text-brand text-[9px] font-black uppercase px-2 py-0.5 rounded border border-brand/20 hidden sm:inline-block">
                {userOrders.length} {userOrders.length === 1 ? 'Order' : 'Orders'} Found
              </span>
              {userOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllOrders(true)}
                  className="text-xs text-brand hover:text-brand-hover font-bold hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-wider text-[10px]"
                >
                  See All <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>

          {userOrdersLoading ? (
            <div className="py-4 text-center text-xs text-slate-455 font-semibold animate-pulse">
              Retrieving your secure purchase profile...
            </div>
          ) : userOrders.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/50">
              No orders registered yet. Customize solar installations or shop devices to start!
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-2 overflow-y-hidden whitespace-nowrap scrollbar-thin scroll-smooth w-full max-w-full">
              {userOrders.map((ord) => {
                const isActive = searchId === ord.id;
                return (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => {
                      setSearchId(ord.id);
                      setOrder(ord);
                      setError('');
                    }}
                    className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-all text-left flex-shrink-0 cursor-pointer min-w-[210px] sm:min-w-[245px] select-none ${
                      isActive
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black tracking-tight block">
                          {ord.id}
                        </span>
                        <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-sm tracking-wider ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                          ord.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                          ord.status === 'out_for_delivery' ? 'bg-indigo-50 text-indigo-700' :
                          ord.status === 'shipped' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                        {new Date(ord.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-black block">
                        {formatNaira(ord.total)}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {ord.items.reduce((sum, i) => sum + i.quantity, 0)} {ord.items.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!auth.currentUser && (
        <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans" id="history-prompt-alert">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-display font-semibold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
              <span>🔒</span>
              <span>Sync Your Order History Everywhere</span>
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal max-w-xl">
              Log in with your secure account to save order tracking timelines, configure maintenance service reminders, and see past purchases synced automatically on any device.
            </p>
          </div>
          <button
            onClick={onOpenLogin}
            type="button"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl text-center shadow-xs cursor-pointer select-none"
          >
            Log In / Sign Up
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-750 text-xs font-medium p-4 rounded-xl border border-red-100 text-center space-y-2">
          <p>{error}</p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Hint: Head back to shop, add products or solar custom kits to your cart, and complete payment via the simulated 3D Secure gateway to start tracking.
          </p>
        </div>
      )}

      {!order && !error && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-250 text-center">
          <PackageCheck className="text-slate-300 mb-3" size={48} />
          <h3 className="text-sm font-display font-semibold text-slate-700">No active tracking sequence initiated</h3>
          <p className="text-xs text-slate-405 max-w-xs mt-2 leading-relaxed">
            Enter an order ID above or complete a payment. The system will visualize real-time coordinates, engineer logs, and live stage advancements.
          </p>
        </div>
      )}

      {order && (
        <div className="space-y-6">
          
          {/* Order Details Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Tracking Code</span>
              <strong className="text-brand text-sm font-mono mt-1 block">{order.id}</strong>
            </div>

            <div>
              <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Recipient Name</span>
              <strong className="text-slate-800 mt-1 block font-display">{order.customerDetails.name}</strong>
              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{order.customerDetails.phone}</span>
            </div>

            <div>
              <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Deployment Address</span>
              <strong className="text-slate-800 mt-1 block font-display">{order.customerDetails.city}</strong>
              <span className="block text-[10px] text-slate-500 truncate mt-0.5">{order.customerDetails.address}</span>
            </div>

            <div>
              <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Delivery Mode</span>
              <strong className="text-brand font-bold text-xs mt-1 block font-display">
                <span>SkyIT Heavy Transit & Setup</span>
              </strong>
            </div>
          </div>

          {order.status === 'cancelled' && (
            <div className="bg-rose-50 border border-rose-200 text-rose-850 rounded-xl p-4 flex items-start gap-3 text-xs leading-relaxed animate-fadeIn">
              <span className="text-rose-500 text-lg">⚠️</span>
              <div>
                <p className="font-black uppercase tracking-wider text-rose-800">Deployment Order Cancelled</p>
                <p className="mt-0.5 text-slate-600 font-medium">This hardware installation, logistics and technical setup order has been cancelled by staff operations. Please reach out to your designated account manager or support team if you think this is in error.</p>
              </div>
            </div>
          )}

          {/* POLL DATABASE / REFRESH STATUS ROW */}
          <div className="flex justify-end gap-2 text-xs mb-2">
            <button
              onClick={() => setRefreshToggle(prev => !prev)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200 p-2 rounded-lg flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin text-brand" : "text-slate-500"} />
              <span>Refresh Status</span>
            </button>
          </div>

          {/* ACTIVE SPEEDMAP VISUAL GRAPH */}
          <div className="bg-slate-50 p-3.5 sm:p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-display font-bold text-slate-800">Visual Setup Coordinates Path</span>
              <span className="text-[10px] text-brand bg-brand-light px-2 py-0.5 rounded border border-brand/20 font-mono">
                Active State: {pos.percent}% Commissioned
              </span>
            </div>

            {/* Custom SVG Path Road Map */}
            <div className="overflow-x-auto w-full no-scrollbar pb-3">
              <div className="relative pt-6 pb-2 min-w-[600px] sm:min-w-0">
                {/* Path line */}
                <div className="absolute top-8 left-4 right-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand transition-all duration-1000 ease-out" 
                    style={{ width: `${pos.percent}%` }}
                  />
                </div>

                {/* Landmark Nodes */}
                <div className="relative flex justify-between px-4">
                  {[
                    { label: "Warehouse", desc: "Hardware Ready", limit: 'pending' },
                    { label: "Approved", desc: "Safety Checked", limit: 'confirmed' },
                    { label: "Sizing Check", desc: "Engineers Ready", limit: 'processing' },
                    { label: "Transit Unit", desc: "Truck Dispatched", limit: 'shipped' },
                    { label: "Field Team", desc: "Arrived On Site", limit: 'out_for_delivery' },
                    { label: "Commissioned", desc: "Fully Online", limit: 'delivered' }
                  ].map((pt, index) => {
                    const milestonesOrder: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                    const itemIndex = milestonesOrder.indexOf(pt.limit as OrderStatus);
                    const orderIndex = milestonesOrder.indexOf(order.status);
                    const isDone = itemIndex <= orderIndex;
                    const isActive = order.status === pt.limit;

                    return (
                      <div key={index} className="flex flex-col items-center text-center max-w-[85px] sm:max-w-[110px] relative z-10">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 text-[10px] font-mono font-bold ${
                          isActive ? 'bg-brand text-white ring-4 ring-brand/25' :
                          isDone ? 'bg-brand-light text-brand border border-brand/20' : 'bg-slate-200 text-slate-400 border border-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        <span className={`text-[9px] md:text-xs font-display mt-2 block ${isDone ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
                          {pt.label}
                        </span>
                        <span className="text-[8px] text-slate-400 block truncate max-w-full mt-0.5">{pt.desc}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Moving delivery truck indicator float */}
                <div 
                  className="absolute top-2 transition-all duration-1000 ease-out -translate-x-1/2" 
                  style={{ left: `calc(1rem + (${pos.percent / 100} * (100% - 2rem)))` }}
                >
                  <div className="bg-brand text-white p-1 rounded shadow-sm text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider">
                    <Truck size={12} className="animate-bounce" />
                    <span>SkyIT Crew</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ITEM CHECK-OFF LIST DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            
            {/* Milestones log list */}
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 lg:col-span-2 space-y-4">
              <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Hardware Deployment Log Updates
              </h4>

              <div className="space-y-5 relative pl-5 border-l border-slate-200">
                {order.trackingProgress.map((mile) => (
                  <div key={mile.status} className="relative group">
                    {/* Circle Indicator on left margin */}
                    <div className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 ${
                      mile.completed ? 'bg-brand border-white ring-4 ring-brand/10' : 'bg-slate-100 border-slate-300'
                    }`} />
                    
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                        <span className={`text-xs font-display font-bold break-words ${mile.completed ? 'text-slate-800' : 'text-slate-400'}`}>
                          {mile.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 bg-slate-50 border border-slate-100/60 rounded-md px-1.5 py-0.5 shrink-0 select-none self-start sm:self-auto">
                          <Calendar size={10} className="text-brand shrink-0" />
                          <span>{mile.timestamp}</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed max-w-2xl break-words">
                        {mile.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchases summary */}
            <div className="bg-slate-50 p-3.5 sm:p-5 rounded-xl border border-slate-200 space-y-4 text-xs h-fit text-slate-650">
              <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                Order Content Pack
              </h4>
              
              <div className="space-y-3">
                {order.items.map((it) => (
                  <div key={it.product.id} className="flex gap-2 pb-2.5 border-b border-slate-200">
                    <img 
                      src={it.product.image} 
                      alt="" 
                      className="w-9 h-9 object-cover rounded-md border border-slate-255 bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate leading-snug">{it.product.name}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5 font-mono">Qty: {it.quantity} x {formatNaira(it.product.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Product Subtotal</span>
                  <span className="font-mono">{formatNaira(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium font-bold">
                    <span>Campaign Savings</span>
                    <span className="font-mono">-{formatNaira(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping & Logistics</span>
                  <span className="font-mono">{order.deliveryFee === 0 ? "FREE" : formatNaira(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-display font-bold text-xs text-slate-800 pt-2 border-t border-slate-200">
                  <span>Grand Total Paid</span>
                  <span className="text-slate-950 font-mono font-bold">{formatNaira(order.total)}</span>
                </div>
                <div className="pt-2">
                  <span className="text-[8px] text-slate-400 font-mono uppercase block tracking-wider">Authorized via</span>
                  <span className="text-[10px] font-semibold text-slate-800 block mt-0.5">{order.paymentMethod}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
