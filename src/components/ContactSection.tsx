import React, { useState } from 'react';
import { MapPin, Phone, Mail, Send, MessageSquare, Check, Sparkles, AlertCircle } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Consultation Inquiry',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMsg('Please populate all necessary fields (Name, Email, and Message).');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!resp.ok) {
        const errObj = await resp.json().catch(() => ({}));
        throw new Error(errObj.error || 'Server rejected inquiry dispatch.');
      }

      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: 'Consultation Inquiry', message: '' });
    } catch (err: any) {
      console.error("Inquiry delivery error:", err);
      setErrorMsg(err.message || 'Inquiry transmission pipeline failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const phoneNumbers = [
    { display: "+234 913 539 6292", raw: "+2349135396292" },
    { display: "+234 907 444 4140", raw: "+2349074444140" },
    { display: "+234 901 777 7773", raw: "+2349017777773" },
    { display: "+234 901 777 7774", raw: "+2349017777774" }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" id="contact-page-container">
      {/* Editorial Greetings */}
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
        <span className="bg-brand/10 text-brand text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
          DIRECT ACCESS PASS
        </span>
        <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">
          Connect With SkyIT Engineers
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Need a personalized energy capacity assessment, hardware telemetry questions, or private smart microgrid quotes? Contact our command deck directly.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Contact Desk Ledger cards */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Head Office Depot */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-900">
                Head Office Depot
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed flex gap-2">
              <MapPin size={16} className="text-brand shrink-0 mt-0.5" />
              <span>KM 1 DSC Expressway beside Jesus Temple Church, Ebrumede, Effurun-Warri, Delta State</span>
            </p>
          </div>

          {/* Branch Office Depot */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-900">
                Lagos Branch Office
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed flex gap-2">
              <MapPin size={16} className="text-brand shrink-0 mt-0.5" />
              <span>Manjo Plaza, NNPC Service Station, Ikota, Second Gate, K.M 22, Lekki-Epe Expressway, Lekki, Lagos</span>
            </p>
          </div>

          {/* Direct Communication Channels */}
          <div className="bg-slate-900 text-slate-300 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-display font-black text-xs uppercase tracking-wider text-white border-b border-slate-800 pb-2">
              Connect Channels
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Phone size={15} className="text-sky-400 mt-1 shrink-0" />
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Official Lines</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {phoneNumbers.map((num, i) => (
                      <a 
                        key={i} 
                        href={`tel:${num.raw}`} 
                        className="text-xs hover:text-sky-300 transition-colors font-mono font-semibold text-slate-200 hover:underline"
                      >
                        {num.display}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/60">
                <Mail size={15} className="text-sky-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Email Support</span>
                  <a 
                    href="mailto:skyitventures01@gmail.com" 
                    className="text-xs text-slate-200 font-mono font-semibold hover:text-sky-300 hover:underline"
                  >
                    skyitventures01@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Micro WhatsApp Bridge buttons for user-friendly flow */}
            <div className="pt-2">
              <a 
                href={`https://wa.me/2349074444140?text=Hello%20SkyIT%20Ventures%20team,%20I'd%20like%20to%20inquire%2520about%20your%20solar%20solutions.`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all shadow-2xs"
              >
                <MessageSquare size={14} className="fill-white" />
                <span>Quick WhatsApp chat</span>
              </a>
            </div>

          </div>

        </div>

        {/* Right Side: Inquiry desk form */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-3xs space-y-4">
          <div>
            <h3 className="font-display font-black text-sm text-slate-900">
              Submit Direct Site Inquiry
            </h3>
            <p className="text-[11px] text-slate-400">
              Complete this ledger form and a regional technical supervisor will respond with complete project plans.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-150 text-center space-y-3 animate-scale-up">
              <span className="text-3xl text-emerald-500 block">✓</span>
              <h4 className="text-sm font-semibold text-emerald-800">Telemetry Request Sent</h4>
              <p className="text-xs text-emerald-600 max-w-sm mx-auto leading-relaxed">
                Thank you for reaching out! Your hardware specification inquiry has been successfully locked on our supervisor board. We will reach back within 2 business hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-brand font-black hover:underline uppercase tracking-wide"
              >
                File another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Connection (WhatsApp optional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-mono"
                    placeholder="e.g. +234..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Topic Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-semibold"
                  >
                    <option value="Consultation Inquiry">Residential Solar Setup (Inquiry)</option>
                    <option value="Commercial Microgrids">Commercial Sizing Microgrid</option>
                    <option value="CCTV Security Support">CCTV Security & Alarms Network</option>
                    <option value="Billing & Pricing Feedback">Quotation Billing Feedback</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Message Details *</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand text-slate-800 font-sans resize-none"
                  placeholder="Tell us about your home appliances array, peak power load conditions, or setup schedules..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-[#1a1a1a] text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Placing specification line...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Dispatch Message To Desk</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
