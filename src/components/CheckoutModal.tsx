import { trackEvent } from '../lib/analytics';
import React, { useState } from 'react';
import { CartItem, CustomerDetails, Order } from '../types';
import { 
  X, Lock, CreditCard, User, Landmark, ShieldCheck, Mail, Phone, 
  MapPin, Loader2, ArrowRight, Truck, ChevronLeft, ArrowLeft, 
  ShoppingBag, CheckCircle2, Shield, Info, HelpCircle, Gift, MessageSquare
} from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getOrCreateGuestUid, cacheOrderDetails } from '../lib/guestCache';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderSuccess: (order: Order) => void;
  onOpenLogin?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onOrderSuccess,
  onOpenLogin
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'authenticating' | 'otp' | 'success'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authStage, setAuthStage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'flutterwave' | 'cod'>('flutterwave');
  const [allowGuestCheckout, setAllowGuestCheckout] = useState<boolean>(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(true);
  
  // Form Values
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: ""
  });

  const [card, setCard] = useState({
    number: "4000 1234 5678 9010",
    holder: "JOHN DOE",
    expiry: "12/28",
    cvv: "321"
  });

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;

    // Load allowGuestCheckout setting in real-time
    const unsub = onSnapshot(
      doc(db, 'settings', 'checkout'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.allowGuestCheckout === 'boolean') {
            setAllowGuestCheckout(data.allowGuestCheckout);
          }
        }
        setIsSettingsLoading(false);
      },
      (err) => {
        console.warn("Failed to retrieve guest checkout control setting:", err);
        setIsSettingsLoading(false);
      }
    );

    return () => unsub();
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      if (auth.currentUser) {
        const defaultName = auth.currentUser.displayName || "";
        const defaultEmail = auth.currentUser.email || "";
        setCustomer({
          name: defaultName,
          email: defaultEmail,
          phone: auth.currentUser.phoneNumber || "",
          city: "Lagos",
          address: ""
        });
        setCard(prev => ({
          ...prev,
          holder: defaultName ? defaultName.toUpperCase() : "JOHN DOE",
          number: "4000 1234 5678 9010",
          expiry: "12/28",
          cvv: "321"
        }));
      } else {
        setCustomer({
          name: "",
          email: "",
          phone: "",
          city: "",
          address: ""
        });
        setCard({
          number: "",
          holder: "",
          expiry: "",
          cvv: ""
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalOriginal = cartItems.reduce((acc, item) => acc + (item.product.originalPrice * item.quantity), 0);
  const discount = totalOriginal - subtotal;
  // Delivery fee is negotiated dynamically with 3rd party logistics post-purchase
  const deliveryFee = 0;
  const grandTotal = subtotal;

  const formatNaira = (val: number) => {
    return "₦" + Math.floor(val).toLocaleString();
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Perform robust email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!customer.email || !emailRegex.test(customer.email.trim())) {
      alert("The email address provided is not valid. Please enter a valid email address to proceed with your order.");
      return;
    }

    if (paymentMethod === 'cod') {
      const isCodAvailable = cartItems.every(item => item.product.allowCOD !== false);
      if (!isCodAvailable) {
        alert("Cash on Delivery is not available for premium items in your cart.");
        return;
      }

      setIsSubmitting(true);
      setStep('authenticating');
      setAuthStage("Registering Cash on Delivery order details...");
      await new Promise(r => setTimeout(r, 800));
      setAuthStage("Generating order tracking timelines...");
      await new Promise(r => setTimeout(r, 600));

      try {
        const currentUserId = auth.currentUser?.uid || getOrCreateGuestUid();
        const resp = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cartItems,
            subtotal,
            deliveryFee,
            discount,
            total: grandTotal,
            customerDetails: customer,
            userId: currentUserId,
            paymentMethod: "Cash on Delivery (COD)"
          })
        });

        if (!resp.ok) throw new Error("Server checkout failed.");

        const result = await resp.json();
        
        try {
          const orderDocRef = doc(db, 'orders', result.order.id);
          const completeOrder: Order = {
            ...result.order,
            userId: currentUserId
          };
          console.log("CheckoutModal: Writing order to Firestore:", result.order.id);
          await setDoc(orderDocRef, completeOrder);
          console.log("CheckoutModal: Order written successfully.");
          cacheOrderDetails(completeOrder);
        } catch (fErr) {
          console.warn("Cloud Firestore order snapshot save noticed non-fatal reject: ", fErr);
        }

        setIsSubmitting(false);
        setStep('success');
        
        trackEvent('purchase', {
          transaction_id: result.order.id,
          currency: 'NGN',
          value: grandTotal,
          items: cartItems.map(item => ({
            item_id: item.product.id,
            item_name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          }))
        });

        setTimeout(() => {
          onOrderSuccess({
            ...result.order,
            userId: currentUserId
          });
          onClose();
        }, 4000);

      } catch (err) {
        console.error(err);
        alert("Checkout communication failed. Please check your network.");
        setIsSubmitting(false);
        setStep('details');
      }
      return;
    }

    setIsSubmitting(true);
    setStep('authenticating');
    setAuthStage("Initializing standard Flutterwave secure gateway...");

    const uniqueTxRef = `TX-${Date.now()}`;
    const payload = {
      items: cartItems,
      subtotal,
      deliveryFee,
      discount,
      total: grandTotal,
      customerDetails: customer,
      userId: auth.currentUser?.uid || getOrCreateGuestUid(),
      paymentMethod: "Flutterwave Secure Checkout"
    };

    // Store order payload in both sessionStorage and localStorage as secondary fallback
    sessionStorage.setItem('pending_order_payload', JSON.stringify(payload));
    localStorage.setItem('pending_order_payload', JSON.stringify(payload));

    try {
      const resp = await fetch("/api/flutterwave/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: grandTotal,
          email: customer.email,
          phone: customer.phone,
          name: customer.name,
          orderId: uniqueTxRef,
          origin: window.location.origin
        })
      });

      const response = await resp.json();

      if (response.success && response.url) {
        setAuthStage("Redirecting to Flutterwave secure payment page...");
        await new Promise(r => setTimeout(r, 600));
        window.location.href = response.url;
        return;
      } else {
        throw new Error(response.error || "Launch rejected");
      }
    } catch (err: any) {
      console.error("Server-Redirect standard checkout failed:", err);
      alert(`Payment checkout initialization failed: ${err.message || err}. Please verify your live Flutterwave credentials.`);
      setStep('details');
      setIsSubmitting(false);
    }
  };

  const handleChargeCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (card.number.length < 16 || card.cvv.length < 3) {
      alert("Please enter valid card credentials.");
      return;
    }

    setIsSubmitting(true);
    setStep('authenticating');
    
    // Simulate payment gateway handshakes
    const messages = [
      "Establishing SSL connection to SkyIT Pay channel...",
      "Encrypting secure hardware asset protocol tokens...",
      "Contacting your issuing bank transfer authorization node...",
      "3D Secure 2.0 validation request initialized: OTP pending."
    ];

    for (let i = 0; i < messages.length; i++) {
      setAuthStage(messages[i]);
      await new Promise(r => setTimeout(r, 700));
    }

    setIsSubmitting(false);
    setStep('otp');
  };

  const verifyOtp = async () => {
    if (otpCode !== "482103") {
      setOtpError("Incorrect verification token credentials. Hint: Enter 482103");
      return;
    }

    setOtpError('');
    setIsSubmitting(true);
    setStep('authenticating');
    setAuthStage("Authorizing " + formatNaira(grandTotal) + " with SkyIT Pay Transfer Net...");
    
    await new Promise(r => setTimeout(r, 1000));
    setAuthStage("Securing transaction certificate...");
    await new Promise(r => setTimeout(r, 1000));

    // Post to checkout backend to save active order
    try {
      const currentUserId = auth.currentUser?.uid || getOrCreateGuestUid();
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          subtotal,
          deliveryFee,
          discount,
          total: grandTotal,
          customerDetails: customer,
          userId: currentUserId,
          paymentMethod: "Credit Card Secure Payment"
        })
      });

      if (!resp.ok) throw new Error("Server checkout failed.");

      const result = await resp.json();
      
      // Synchronously write to Firestore orders collection
      try {
        const orderDocRef = doc(db, 'orders', result.order.id);
        const completeOrder: Order = {
          ...result.order,
          userId: currentUserId
        };
        await setDoc(orderDocRef, completeOrder);
        cacheOrderDetails(completeOrder);
      } catch (fErr) {
        console.warn("Cloud Firestore order snapshot save noticed non-fatal reject: ", fErr);
      }

      setIsSubmitting(false);
      setStep('success');
      
      // Keep on success panel for a bit, then callback to tracking page
      setTimeout(() => {
        onOrderSuccess({
          ...result.order,
          userId: currentUserId
        });
        onClose();
      }, 1500);

    } catch (err) {
      console.error(err);
      alert("Checkout sync communication error. Initializing fallback.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[999] overflow-y-auto flex flex-col font-sans text-slate-800 animate-fade-in" id="full-page-checkout">
      
      {/* 1. Immersive Sticky Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg border border-slate-100 flex items-center justify-center bg-white shadow-xs p-0.5">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                alt="SkyIT Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-sm sm:text-base text-slate-900 tracking-tight leading-none">
                SkyIT <span className="text-brand">Ventures</span>
              </span>
              <span className="text-[8px] uppercase tracking-widest font-black text-slate-400 mt-1">
                Secure checkout
              </span>
            </div>
          </div>

          {/* Secure SSL Connection Hub */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-medium">
            <ShieldCheck className="text-emerald-600" size={15} />
            <span>Encrypted 256-bit SSL Connection</span>
          </div>

          {/* Cancel/Exit button */}
          <button 
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl cursor-pointer"
          >
            <X size={15} />
            <span>Cancel & Exit</span>
          </button>
        </div>
      </header>

      {/* 2. Responsive Multi-Column Full Page layout */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white">
        
        {/* Left Side: Active Checkout Step / Forms */}
        <div className="flex-1 p-4 sm:p-8 md:p-12 space-y-6">
          
          {/* Breadcrumb Navigation tracker */}
          <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-2">
            <span className="hover:text-slate-600 cursor-pointer" onClick={onClose}>Cart</span>
            <ChevronLeft size={10} className="rotate-180 text-slate-300" />
            <span className={step === 'details' ? 'text-brand font-black' : 'text-slate-400'}>Contact & Delivery</span>
            {(step === 'payment' || step === 'otp') && (
              <>
                <ChevronLeft size={10} className="rotate-180 text-slate-300" />
                <span className="text-brand font-black">Secure Payment</span>
              </>
            )}
          </nav>

          {/* CASE A: Guest Checkout is Deactivated Blockage */}
          {step === 'details' && !allowGuestCheckout && !auth.currentUser ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100 shadow-xs">
                <Lock size={30} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-display font-black text-slate-900">Guest Checkout Disabled</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  To secure your warranty tracking, professional design quotations, and invoice deliveries, our administration requires customers to sign in before finalizing purchases.
                </p>
              </div>

              <div className="pt-2 w-full space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenLogin) onOpenLogin();
                  }}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In or Create Account</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
                >
                  Return to Store
                </button>
              </div>
            </div>
          ) : step === 'details' ? (
            /* CASE B: Details Entry Form */
            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              
              {/* Header Title */}
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">Delivery & Contact Details</h2>
                <p className="text-xs text-slate-500 mt-1">Please provide accurate contact and shipping coordinates to secure your warranty coverage and Delta (HQ) / Lagos (Branch) logistics dispatch.</p>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                
                {/* Row 1: Full Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      required
                      value={customer.name}
                      onChange={(e) => setCustomer({...customer, name: e.target.value})}
                      className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl p-3 pl-11 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all placeholder-slate-400 font-medium"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                {/* Row 2: Email Address */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="email" 
                      required
                      value={customer.email}
                      onChange={(e) => setCustomer({...customer, email: e.target.value})}
                      className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl p-3 pl-11 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all placeholder-slate-400 font-medium"
                      placeholder="e.g. john.doe@mail.com"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Your e-receipt, design quotes, and order receipts are dispatched here.</span>
                </div>

                {/* Row 3: Grid - Phone & Delivery City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        required
                        value={customer.phone}
                        onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                        className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl p-3 pl-11 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all placeholder-slate-400 font-medium"
                        placeholder="e.g. +234 803 123 4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Delivery State</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                      <select 
                        required
                        value={customer.city}
                        onChange={(e) => setCustomer({...customer, city: e.target.value})}
                        className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl p-3 pl-11 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-medium cursor-pointer"
                      >
                        <option value="">Select State...</option>
                        <option value="Abia">Abia</option>
                        <option value="Adamawa">Adamawa</option>
                        <option value="Akwa Ibom">Akwa Ibom</option>
                        <option value="Anambra">Anambra</option>
                        <option value="Bauchi">Bauchi</option>
                        <option value="Bayelsa">Bayelsa</option>
                        <option value="Benue">Benue</option>
                        <option value="Borno">Borno</option>
                        <option value="Cross River">Cross River</option>
                        <option value="Delta">Delta (HQ Office)</option>
                        <option value="Ebonyi">Ebonyi</option>
                        <option value="Edo">Edo</option>
                        <option value="Ekiti">Ekiti</option>
                        <option value="Enugu">Enugu</option>
                        <option value="Gombe">Gombe</option>
                        <option value="Imo">Imo</option>
                        <option value="Jigawa">Jigawa</option>
                        <option value="Kaduna">Kaduna</option>
                        <option value="Kano">Kano</option>
                        <option value="Katsina">Katsina</option>
                        <option value="Kebbi">Kebbi</option>
                        <option value="Kogi">Kogi</option>
                        <option value="Kwara">Kwara</option>
                        <option value="Lagos">Lagos (Branch Office)</option>
                        <option value="Nasarawa">Nasarawa</option>
                        <option value="Niger">Niger</option>
                        <option value="Ogun">Ogun</option>
                        <option value="Ondo">Ondo</option>
                        <option value="Osun">Osun</option>
                        <option value="Oyo">Oyo</option>
                        <option value="Plateau">Plateau</option>
                        <option value="Rivers">Rivers</option>
                        <option value="Sokoto">Sokoto</option>
                        <option value="Taraba">Taraba</option>
                        <option value="Yobe">Yobe</option>
                        <option value="Zamfara">Zamfara</option>
                        <option value="Abuja">Abuja (FCT)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 4: Detailed Physical Address */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Detailed Shipping Address</label>
                  <textarea 
                    required
                    rows={3}
                    value={customer.address}
                    onChange={(e) => setCustomer({...customer, address: e.target.value})}
                    className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all placeholder-slate-400 font-medium resize-none"
                    placeholder="Street name, Building No, Apartment/Office suite, landmark..."
                  />
                </div>
              </div>

              {/* Secure Checkout Channels Selection */}
              <div className="pt-6 border-t border-slate-150 space-y-4">
                <label className="text-[11px] font-black text-slate-500 block tracking-wider uppercase">Select Secure Checkout Method</label>
                
                {(() => {
                  const isCodAvailable = cartItems.every(item => item.product.allowCOD !== false);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        
                        {/* Option 1: Flutterwave Pay */}
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('flutterwave')}
                          className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            paymentMethod === 'flutterwave'
                              ? 'border-brand bg-blue-50/20 text-slate-900 shadow-sm ring-1 ring-brand'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                            <ShieldCheck size={16} className={paymentMethod === 'flutterwave' ? 'text-brand' : 'text-slate-400'} />
                            <span>Flutterwave Secure Pay</span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                            Pay safely using local/international credit cards, instant bank transfers, and USSD dialcodes.
                          </span>
                        </button>

                        {/* Option 2: Cash On Delivery */}
                        <button
                          type="button"
                          disabled={!isCodAvailable}
                          onClick={() => {
                            if (isCodAvailable) setPaymentMethod('cod');
                          }}
                          className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                            !isCodAvailable 
                              ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-50' 
                              : 'cursor-pointer'
                          } ${
                            paymentMethod === 'cod' && isCodAvailable
                              ? 'border-brand bg-blue-50/20 text-slate-900 shadow-sm ring-1 ring-brand'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                            <Truck size={16} className={paymentMethod === 'cod' && isCodAvailable ? 'text-brand' : 'text-slate-400'} />
                            <span>Cash On Delivery (COD)</span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                            {!isCodAvailable 
                              ? "Unavailable: Cart contains high-value premium enterprise equipment requiring pre-order verification." 
                              : "Verify your delivery and pay securely via cash or local POS transfer upon receiving system."
                            }
                          </span>
                        </button>
                      </div>

                      {/* Warning notice if COD is disabled for cart contents */}
                      {!isCodAvailable && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed flex gap-3">
                          <span className="text-amber-600 font-black shrink-0">⚠️ COD DISABLED:</span>
                          <span>
                            Your cart includes specialized solar setups or heavy-duty industrial lithium batteries. These require professional warehouse processing and secure pre-order checkout.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Form Submission Actions */}
              <div className="pt-4 border-t border-slate-150">
                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover active:scale-98 transition-all text-white font-black uppercase tracking-wider py-4 px-6 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md cursor-pointer"
                >
                  <span>
                    {paymentMethod === 'flutterwave' 
                      ? 'Proceed to Flutterwave Gateway' 
                      : 'Place Cash on Delivery Order'
                    }
                  </span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
                <div className="flex justify-center items-center gap-1 text-[10px] text-slate-400 mt-3.5 font-mono">
                  <Shield size={12} className="text-emerald-600" />
                  <span>Verified PCI-DSS Compliant Secure Gateway Processing</span>
                </div>
              </div>
            </form>
          ) : step === 'payment' ? (
            /* CASE C: Credit Card Portal (SkyIT Pay) */
            <form onSubmit={handleChargeCard} className="space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">Credit Card Payment</h2>
                  <p className="text-xs text-slate-500 mt-1">Directly authorize using our fallback encrypted SkyIT Pay pipeline.</p>
                </div>
                <span className="text-[10px] text-brand uppercase font-black bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-blue-100 self-start sm:self-center">
                  <ShieldCheck size={13} className="text-brand animate-pulse" />
                  <span>SkyIT Direct Safe</span>
                </span>
              </div>

              {/* Graphical Credit Card */}
              <div className="bg-gradient-to-br from-[#003764] via-[#002544] to-[#011425] p-6 rounded-2xl text-white shadow-xl space-y-6 relative overflow-hidden aspect-video max-w-[350px] mx-auto border border-blue-900">
                {/* Visual grid effects */}
                <div className="absolute inset-0 bg-radial from-transparent to-black/40 pointer-events-none" />
                
                <div className="flex justify-between items-center relative">
                  <span className="text-[10px] tracking-widest font-mono text-blue-300 font-bold">SkyIT Pay Direct</span>
                  <div className="w-9 h-6 bg-amber-400/20 rounded border border-amber-400/30" /> {/* Card metallic chip */}
                </div>

                <div className="text-lg text-center tracking-[0.2em] font-mono leading-none relative my-4 font-bold text-blue-50">
                  {card.number || '•••• •••• •••• ••••'}
                </div>

                <div className="flex justify-between items-end relative">
                  <div>
                    <span className="text-[8px] text-blue-300 font-medium block uppercase tracking-widest">Card Holder</span>
                    <span className="text-xs font-bold font-mono text-white uppercase truncate max-w-[180px] inline-block">
                      {card.holder || 'YOUR FULL NAME'}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[8px] text-blue-300 font-medium block uppercase tracking-widest font-mono">Expires</span>
                      <span className="text-xs font-bold font-mono text-white text-center">
                        {card.expiry || 'MM/YY'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-blue-300 font-medium block uppercase tracking-widest font-mono">CVV</span>
                      <span className="text-xs font-bold font-mono text-white text-center">
                        {card.cvv || '•••'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form input fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      required
                      value={card.number}
                      onChange={(e) => setCard({...card, number: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-11 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-mono"
                      placeholder="e.g. 4000 1234 5678 9010"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Cardholder Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={card.holder}
                    onChange={(e) => setCard({...card, holder: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-bold uppercase"
                    placeholder="e.g. JOHN DOE"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Expiration Date</label>
                    <input 
                      type="text" 
                      required
                      value={card.expiry}
                      onChange={(e) => setCard({...card, expiry: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-mono text-center"
                      placeholder="MM/YY"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">CVV Security Code</label>
                    <input 
                      type="password" 
                      required
                      maxLength={3}
                      value={card.cvv}
                      onChange={(e) => setCard({...card, cvv: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-mono text-center"
                      placeholder="3 digits"
                    />
                  </div>
                </div>
              </div>

              {/* Bank security statement badge */}
              <div className="bg-slate-50 p-4 text-xs text-slate-500 flex items-start gap-3 border border-slate-200 rounded-xl leading-relaxed">
                <Lock className="text-brand shrink-0 mt-0.5" size={15} />
                <span>All transactions are strictly protected by standard industry AES-256 bank-level hardware cryptology. Credit cards are secured by Verified by Visa and Mastercard Identity checks.</span>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Back to Delivery
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover transition-colors active:scale-98 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-xs cursor-pointer shadow-sm"
                >
                  Authorize Payment
                </button>
              </div>
            </form>
          ) : step === 'authenticating' ? (
            /* CASE D: Authenticating Pipeline Handshake */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6 max-w-sm mx-auto">
              <Loader2 className="animate-spin text-brand" size={48} />
              <div className="space-y-1.5">
                <h4 className="text-lg font-display font-bold text-slate-900">Securing Gateway Pipeline</h4>
                <p className="text-xs text-slate-400">Communicating with OIDC network hosts...</p>
              </div>
              <p className="text-xs text-slate-500 font-mono bg-slate-50 p-4 rounded-xl border border-slate-200/80 leading-relaxed w-full">
                {authStage}
              </p>
            </div>
          ) : step === 'otp' ? (
            /* CASE E: 3D Secure OTP verification */
            <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-md max-w-md mx-auto space-y-5 animate-scale-up text-slate-600">
              
              {/* Fake bank header branding */}
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <div className="flex items-center gap-1.5 text-brand font-bold text-xs font-mono">
                  <Landmark size={15} />
                  <span>SkyIT Pay (Direct 3D Secure)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">LGS-SEC-77</span>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed space-y-3">
                <p>To authorize this transaction of <strong className="text-slate-900 font-black">{formatNaira(grandTotal)}</strong>, please enter the 6-digit temporary verification security code dispatched to your registered phone number.</p>
                
                {/* Visual aid hint */}
                <div className="bg-blue-50 border border-blue-100 text-[10px] text-blue-800 font-bold px-3 py-2.5 rounded-xl leading-relaxed flex flex-col gap-1">
                  <span>🛡️ SIMULATED AUTHENTICATION TRIGGER:</span>
                  <span>Use code <strong className="text-xs font-black bg-white border border-blue-200 px-1.5 py-0.5 rounded font-mono text-brand">482103</strong> to finalize payment.</span>
                </div>
              </div>

              {/* OTP Form entry */}
              <div className="space-y-3 max-w-[260px] mx-auto text-center pt-2">
                <input 
                  type="text"
                  maxLength={6}
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full tracking-[0.25em] text-xl font-black font-mono text-center p-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand"
                />

                {otpError && (
                  <p className="text-[10px] text-rose-600 font-bold block">{otpError}</p>
                )}

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={isSubmitting}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-black uppercase tracking-wider py-3.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Verify & Authorize
                </button>
              </div>

              <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3 font-medium">
                Need help? Contact support or close checkout to choose another payment route.
              </div>
            </div>
          ) : (
            /* CASE F: Order Confirmation Success screen */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6 max-w-md mx-auto" id="checkout-success-screen">
              <div className={`w-16 h-16 ${paymentMethod === 'cod' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-brand/10 text-brand border-blue-100'} rounded-full flex items-center justify-center border shadow-xs animate-bounce`}>
                <CheckCircle2 size={32} strokeWidth={2.5} />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xl font-display font-black text-slate-900">
                  {paymentMethod === 'cod' ? 'Order Confirmed!' : 'Payment Approved!'}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {paymentMethod === 'cod'
                    ? 'Your Cash on Delivery order has been successfully logged. Please check your email inbox (including spam) for your electronic sales receipt.'
                    : 'Your electronic payment has been safely validated. Generating warranty tracking certificates...'
                  }
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Sticky Order Summary & Cart Breakdown */}
        <div className="w-full lg:w-[420px] bg-slate-50 p-4 sm:p-8 space-y-6 shrink-0 lg:h-[calc(100vh-68px)] lg:sticky lg:top-[68px] overflow-y-auto">
          
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 font-mono">
              <ShoppingBag size={14} className="text-slate-400" />
              <span>Order Summary ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
            </h3>
          </div>

          {/* Checkout Item List */}
          <div className="divide-y divide-slate-150 max-h-[280px] lg:max-h-[380px] overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div key={item.product.id} className="py-3 flex items-center gap-3.5 first:pt-0 last:pb-0">
                
                {/* Thumbnail Image */}
                <div className="relative shrink-0 w-14 h-14 bg-white rounded-lg border border-slate-200/60 overflow-hidden shadow-2xs">
                  <img 
                    src={item.product.image} 
                    alt={item.product.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -top-1 -right-1 bg-slate-800 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono ring-2 ring-white">
                    {item.quantity}
                  </span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate" title={item.product.name}>
                    {item.product.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5 uppercase tracking-wide">
                    {item.product.category}
                  </p>
                </div>

                {/* Pricing */}
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {formatNaira(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Ledger Calculator */}
          <div className="border-t border-slate-200 pt-4 space-y-2.5 text-xs text-slate-600">
            
            {/* Subtotal */}
            <div className="flex justify-between items-center font-medium">
              <span>Subtotal</span>
              <span className="font-mono text-slate-800">{formatNaira(subtotal)}</span>
            </div>

            {/* Original Total & Discount savings */}
            {discount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg text-[11px]">
                <span>Launch Promotion Discount</span>
                <span className="font-mono">-{formatNaira(discount)}</span>
              </div>
            )}

            {/* Logistics/Delivery Fee */}
            <div className="flex justify-between items-start font-medium py-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-700 font-bold">Shipping & Delivery</span>
                <span className="text-[10px] text-slate-400 font-normal leading-normal max-w-[200px]">
                  Negotiated after order placement based on weight & location
                </span>
              </div>
              <span className="font-mono text-brand font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide">
                Billed via Call
              </span>
            </div>

            {/* Grand Total Display */}
            <div className="border-t border-slate-200 pt-3.5 flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order Grand Total</span>
                <span className="text-[9px] text-slate-400 italic">All custom clearance, logistics VAT inclusive</span>
              </div>
              <span className="text-xl sm:text-2xl font-display font-black text-brand tracking-tight font-mono leading-none">
                {formatNaira(grandTotal)}
              </span>
            </div>
          </div>

          {/* Professional Context Alerts / Promotion banners */}
          <div className="pt-4 border-t border-slate-200 space-y-3 text-[11px] text-slate-500 leading-relaxed">
            
            {/* Delivery Timeline Warning */}
            <div className="flex gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <Truck size={15} className="text-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Flexible 3rd-Party Logistics</p>
                <p className="text-[10px] text-slate-500 mt-0.5">To offer you the fairest rates, we partner with reliable logistics networks (e.g. GIG Logistics, DHL, and local haulage). Once your order is placed, our team will call you to confirm your location and negotiate the most cost-effective shipping option.</p>
              </div>
            </div>

            {/* Customer Trust support statement */}
            <a 
              href="https://wa.me/2349074444140?text=Hello%20SkyIT%20Ventures%20team,%20I've%20been%20checking%20out%20on%20your%20website%20and%20I'd%20like%20a%20technical%20consultation%20on%20solar%20solutions."
              target="_blank"
              rel="noreferrer"
              className="flex gap-2 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all p-3 rounded-xl border border-emerald-150 cursor-pointer group shadow-2xs"
            >
              <MessageSquare size={15} className="text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-emerald-800 group-hover:underline">Need Technical Consultation?</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Have questions regarding capacity sizing, load calculations, or warranty plans? Click to chat directly with our engineering support team on WhatsApp.</p>
              </div>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
