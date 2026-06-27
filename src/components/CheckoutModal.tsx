import { trackEvent } from '../lib/analytics';
import React, { useState } from 'react';
import { CartItem, CustomerDetails, Order } from '../types';
import { X, Lock, CreditCard, User, Landmark, ShieldCheck, Mail, Phone, MapPin, Loader2, ArrowRight, Truck } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState<'flutterwave' | 'skyit_pay' | 'cod'>('flutterwave');
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

  const [card, setCard] = useState({
    number: "4000 1234 5678 9010",
    holder: "JOHN DOE",
    expiry: "12/28",
    cvv: "321"
  });

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalOriginal = cartItems.reduce((acc, item) => acc + (item.product.originalPrice * item.quantity), 0);
  const discount = totalOriginal - subtotal;
  const deliveryFee = subtotal > 500000 ? 0 : 15000;
  const grandTotal = subtotal + deliveryFee;

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

    if (paymentMethod === 'skyit_pay') {
      setStep('payment');
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
          await setDoc(orderDocRef, completeOrder);
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
          paymentMethod: "SkyIT Pay Direct Transfer"
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#0D0D0D] w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl max-w-lg overflow-hidden shadow-2xl relative sm:border border-gray-805 flex flex-col text-gray-300">
        
        {/* Header toolbar */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0F0F0F] text-white shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="text-blue-400" size={15} />
            <span className="font-serif italic font-medium text-sm">Secure Payment Gateway Checkout</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info panel */}
        <div className="p-3 bg-[#141414] text-blue-400 px-4 flex items-center justify-between text-xs font-semibold border-b border-gray-800 font-mono shrink-0">
          <span>Order Grand Total:</span>
          <span>{formatNaira(grandTotal)}</span>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* STEP 1: CUSTOMER DETAILS */}
          {step === 'details' && !allowGuestCheckout && !auth.currentUser ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center border border-rose-500/20 shadow-lg">
                <Lock size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-serif italic text-white font-medium">Guest Checkout is Deactivated</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  To secure your warranty tracking, customized design metrics, and receipt delivery, our administration requires guests to have an authenticated account before making purchases.
                </p>
              </div>

              <div className="pt-2 w-full max-w-xs mx-auto space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenLogin) onOpenLogin();
                  }}
                  className="w-full bg-brand hover:bg-brand/95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In or Register Now</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#161616] hover:bg-[#1C1C1C] text-gray-400 hover:text-white font-bold py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider border border-gray-800 transition-all"
                >
                  Cancel & Return to Cart
                </button>
              </div>
            </div>
          ) : step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <h3 className="text-sm font-serif italic text-white font-medium tracking-wide mb-2">
                1. Delivery & Contact Details
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input 
                      type="text" 
                      required
                      value={customer.name}
                      onChange={(e) => setCustomer({...customer, name: e.target.value})}
                      className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 pl-10 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input 
                      type="email" 
                      required
                      value={customer.email}
                      onChange={(e) => setCustomer({...customer, email: e.target.value})}
                      className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 pl-10 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                      placeholder="e.g. validuser@mail.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 text-gray-500" size={16} />
                      <input 
                        type="text" 
                        required
                        value={customer.phone}
                        onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                        className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 pl-10 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                        placeholder="e.g. +234 803 123"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Delivery City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 text-gray-500" size={16} />
                      <select 
                        required
                        value={customer.city}
                        onChange={(e) => setCustomer({...customer, city: e.target.value})}
                        className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 pl-11 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                      >
                        <option value="">Select City...</option>
                        <option value="Lagos">Lagos</option>
                        <option value="Abuja">Abuja</option>
                        <option value="Port Harcourt">Port Harcourt</option>
                        <option value="Ibadan">Ibadan</option>
                        <option value="Kano">Kano</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Detailed Physical Address</label>
                  <input 
                    type="text" 
                    required
                    value={customer.address}
                    onChange={(e) => setCustomer({...customer, address: e.target.value})}
                    className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-3 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                    placeholder="Street name, Building No, Apartment No..."
                  />
                </div>
              </div>
              {/* CHOOSE PAYMENT GATEWAY CHANNEL */}
              <div className="pt-4 border-t border-gray-800/60 mt-4 space-y-2.5">
                <label className="text-[11px] font-bold text-gray-400 block tracking-wider uppercase">Select Secure Checkout Method</label>
                
                {/* Visual warning message if COD is not allowed for some items */}
                {(() => {
                  const isCodAvailable = cartItems.every(item => item.product.allowCOD !== false);
                  return (
                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('flutterwave')}
                          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            paymentMethod === 'flutterwave'
                              ? 'border-blue-500 bg-blue-950/15 text-white shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                              : 'border-gray-805 bg-[#111] text-gray-400 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                            <ShieldCheck size={14} className={paymentMethod === 'flutterwave' ? 'text-blue-400' : 'text-gray-500'} />
                            <span>Flutterwave Pay</span>
                          </div>
                          <span className="text-[9px] text-gray-500 mt-1.5 leading-tight">Secure production-ready checkout with cards, transfers, and USSD</span>
                        </button>

                        <button
                          type="button"
                          disabled={!isCodAvailable}
                          onClick={() => {
                            if (isCodAvailable) setPaymentMethod('cod');
                          }}
                          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                            !isCodAvailable 
                              ? 'opacity-40 cursor-not-allowed border-gray-900 bg-[#070707]' 
                              : 'cursor-pointer'
                          } ${
                            paymentMethod === 'cod' && isCodAvailable
                              ? 'border-blue-500 bg-blue-950/15 text-white shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                              : 'border-gray-805 bg-[#111] text-gray-400 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                            <Truck size={14} className={paymentMethod === 'cod' && isCodAvailable ? 'text-blue-400' : 'text-gray-500'} />
                            <span>Cash On Delivery</span>
                          </div>
                          <span className="text-[9px] text-gray-500 mt-1.5 leading-tight">
                            {!isCodAvailable 
                              ? "Unavailable for specialized items in your cart" 
                              : "Pay securely in Cash or Local Bank Transfer upon receiving equipment"
                            }
                          </span>
                        </button>
                      </div>

                      {!isCodAvailable && (
                        <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 text-[10px] text-amber-300 leading-snug flex gap-2.5 mt-1">
                          <span className="text-amber-500 font-bold shrink-0">⚠️ Notice:</span>
                          <span>
                            Cash on Delivery (COD) is disabled. Your cart contains premium enterprise hardware (e.g., Heavy-Duty Inverters or Performance Lithium batteries) requiring secure prepayments.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover active:scale-98 transition-all text-white font-black uppercase tracking-widest py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md cursor-pointer"
                >
                  <span>
                    {paymentMethod === 'flutterwave' 
                      ? 'Proceed to Flutterwave Gateway' 
                      : 'Place Cash on Delivery Order'
                    }
                  </span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CREDIT CARD GATEWAY DETAILS */}
          {step === 'payment' && (
            <form onSubmit={handleChargeCard} className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-serif italic text-white font-medium tracking-wide">
                  2. Cards & Secure Gateway
                </h3>
                <span className="text-[10px] text-blue-400 uppercase font-bold bg-[#141414] px-2 py-0.5 rounded-sm flex items-center gap-1 border border-gray-800">
                  <ShieldCheck size={12} />
                  <span>SkyIT Pay Secure</span>
                </span>
              </div>

              {/* Graphical Credit Card */}
              <div className="bg-gradient-to-br from-[#003764]/20 via-[#0F0F0F] to-[#0A0A0A] p-5 rounded-2xl text-white shadow-lg space-y-6 relative overflow-hidden aspect-video max-w-[340px] mx-auto border border-gray-800">
                {/* Visual grid effects */}
                <div className="absolute inset-0 bg-radial from-transparent to-black/30 pointer-events-none" />
                
                <div className="flex justify-between items-center relative">
                  <span className="text-[10px] tracking-widest font-mono text-blue-400">SkyIT Pay Direct</span>
                  <div className="w-8 h-5 bg-[#003764]/30 rounded-sm border border-[#003764]/50" /> {/* Card metallic chip */}
                </div>

                <div className="text-base text-center tracking-[0.2em] font-mono leading-none relative my-3">
                  {card.number || '•••• •••• •••• ••••'}
                </div>

                <div className="flex justify-between items-end relative">
                  <div>
                    <span className="text-[8px] text-gray-500 font-medium block uppercase tracking-wider">Card Holder</span>
                    <span className="text-xs font-serif font-semibold text-gray-300 uppercase truncate max-w-[170px] inline-block">{card.holder || 'YOUR NAME'}</span>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[8px] text-gray-500 font-medium block uppercase tracking-wider">Expires</span>
                      <span className="text-xs font-bold font-mono text-gray-300 text-center">{card.expiry || 'MM/YY'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-500 font-medium block uppercase tracking-wider">CVV</span>
                      <span className="text-xs font-bold font-mono text-gray-300 text-center">{card.cvv || '•••'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form entries */}
              <div className="space-y-3 pt-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input 
                      type="text" 
                      required
                      value={card.number}
                      onChange={(e) => setCard({...card, number: e.target.value})}
                      className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 pl-10 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden font-mono"
                      placeholder="e.g. 4000 1234 5678 9010"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Cardholder Name</label>
                  <input 
                    type="text" 
                    required
                    value={card.holder}
                    onChange={(e) => setCard({...card, holder: e.target.value.toUpperCase()})}
                    className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
                    placeholder="e.g. JOHN DOE"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Expiration Date</label>
                    <input 
                      type="text" 
                      required
                      value={card.expiry}
                      onChange={(e) => setCard({...card, expiry: e.target.value})}
                      className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden font-mono text-center"
                      placeholder="MM/YY"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">CVV Code</label>
                    <input 
                      type="password" 
                      required
                      maxLength={3}
                      value={card.cvv}
                      onChange={(e) => setCard({...card, cvv: e.target.value})}
                      className="w-full bg-[#161616] text-white border border-gray-800 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden font-mono text-center"
                      placeholder="3 digits"
                    />
                  </div>
                </div>
              </div>

              {/* Security info */}
              <div className="bg-[#141414] p-3 text-[10px] text-gray-400 flex items-start gap-2 border border-gray-800/80 rounded-lg">
                <Lock className="text-blue-400 shrink-0 mt-0.5" size={13} />
                <span>Protected by AES-256 bank-level encryption. Your routing is secured by Verified by Visa & Mastercard Identity Check.</span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="bg-[#1A1A1A] hover:bg-[#282828] transition-colors border border-gray-800 text-gray-300 py-3 rounded-xl font-bold text-xs"
                >
                  Back to Delivery
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover transition-colors active:scale-98 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs"
                >
                  Authorize Payment - {formatNaira(grandTotal)}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: MOCK BANK SECURE AUTHORIZATION PIPELINE (LOADING HANDSHAKE) */}
          {step === 'authenticating' && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
              <Loader2 className="animate-spin text-[#3B82F6]" size={40} />
              <h4 className="text-base font-serif italic text-white">Payment Gateway Pipeline</h4>
              <p className="text-xs text-gray-400 font-mono max-w-sm mt-1 bg-[#141414] p-3 rounded-lg border border-gray-800">
                {authStage}
              </p>
            </div>
          )}

          {/* STEP 4: INTERACTIVE 3D SECURE INTERFACE (BANK COMPLIANT OTP POPUP) */}
          {step === 'otp' && (
            <div className="p-4 border border-gray-800 rounded-xl bg-[#0F0F0F] shadow-sm relative space-y-4 animate-scale-up text-gray-300">
              
              {/* Fake bank header branding */}
              <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-[#3B82F6] font-bold text-xs font-mono">
                  <Landmark size={14} />
                  <span>SkyIT Pay (Direct Transfer 3D Secure)</span>
                </div>
                <span className="text-[10px] text-gray-500 font-sans">Issuer Code: SKY-LGS-77</span>
              </div>

              <div className="text-xs text-gray-400 leading-relaxed text-center space-y-3">
                <p>To authorize this transaction of <strong className="text-white">{formatNaira(grandTotal)}</strong>, please enter the temporary 6-digit verification code sent to your mobile device.</p>
                
                {/* Visual aid hint */}
                <div className="mt-3 inline-block bg-blue-950/40 text-blue-300 border border-blue-800/60 text-[10px] font-semibold px-3 py-1.5 rounded-md leading-relaxed">
                  🛡️ Simulated OTP Test Trigger: Use code <strong className="text-xs text-[#3B82F6] bg-[#161616] px-1.5 py-0.5 rounded border border-gray-800 font-mono font-black">482103</strong> to authorize successfully.
                </div>
              </div>

              {/* OTP Form entry */}
              <div className="space-y-2 mt-4 max-w-[240px] mx-auto text-center">
                <input 
                  type="text"
                  maxLength={6}
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full tracking-widest text-lg font-bold font-mono text-center p-2.5 bg-[#161616] text-white border border-gray-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#3B82F6]"
                />

                {otpError && (
                  <p className="text-[10px] text-red-500 font-semibold block">{otpError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={isSubmitting}
                    className="w-full bg-[#3B82F6] hover:bg-[#60A5FA] text-black font-black uppercase tracking-widest py-2.5 rounded-lg text-xs leading-none transition-colors"
                  >
                    Authorize Card
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 text-center border-t border-gray-800 pt-3 leading-relaxed">
                Need assistance? Click cancel to change details. SkyIT services Lagos/Abuja/PH.
              </div>
            </div>
          )}

          {/* STEP 5: COGNITIVE SUCCESS FEEDBACK */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4" id="checkout-success-screen">
              <div className={`w-14 h-14 ${paymentMethod === 'cod' ? 'bg-emerald-500' : 'bg-[#3B82F6]'} text-black rounded-full flex items-center justify-center shadow-lg animate-bounce`}>
                <ShieldCheck size={36} strokeWidth={2.5} />
              </div>
              <h4 className="text-lg font-serif italic text-white">
                {paymentMethod === 'cod' ? 'Order Confirmed!' : 'Authentication Approved!'}
              </h4>
              <p className="text-xs text-gray-400">
                {paymentMethod === 'cod'
                  ? 'Your Cash on Delivery order has been successfully placed. Please check your email inbox/spam folder for your receipt and order details!'
                  : 'Payment secured and verified successfully. Generating order timeline tracking data...'
                }
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
