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
        <span className="bg-[#0066ff]/20 text-[#3898ff] border border-[#0066ff]/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
          DIRECT ACCESS PASS
        </span>
        <h2 className="text-3xl font-display font-black text-white tracking-tight">
          Connect With SkyIT Engineers
        </h2>
        <p className="text-xs text-[#a0a8c2] leading-relaxed">
          Need a personalized energy capacity assessment, hardware telemetry questions, or private smart microgrid quotes? Contact our command deck directly.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Contact Desk Ledger cards */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Head Office Depot */}
          <div className="bg-[#171b27] p-5 rounded-3xl border border-white/10 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-white">
                Head Office Depot
              </h3>
            </div>
            <p className="text-xs text-[#c2c6d8] leading-relaxed flex gap-2">
              <MapPin size={16} className="text-[#3898ff] shrink-0 mt-0.5" />
              <span>KM 1 DSC Expressway beside Jesus Temple Church, Ebrumede, Effurun-Warri, Delta State</span>
            </p>
          </div>

          {/* Branch Office Depot */}
          <div className="bg-[#171b27] p-5 rounded-3xl border border-white/10 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-white">
                Lagos Branch Office
              </h3>
            </div>
            <p className="text-xs text-[#c2c6d8] leading-relaxed flex gap-2">
              <MapPin size={16} className="text-[#3898ff] shrink-0 mt-0.5" />
              <span>Manjo Plaza, NNPC Service Station, Ikota, Second Gate, K.M 22, Lekki-Epe Expressway, Lekki, Lagos</span>
            </p>
          </div>

          {/* Direct Communication Channels */}
          <div className="bg-[#131722] text-slate-300 p-5 rounded-3xl border border-white/10 space-y-4 shadow-sm">
            <h3 className="font-display font-black text-xs uppercase tracking-wider text-white border-b border-white/10 pb-2">
              Connect Channels
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Phone size={15} className="text-sky-400 mt-1 shrink-0" />
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Official Lines</span>
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

              <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
                <Mail size={15} className="text-sky-400 shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email & Official Portal</span>
                  <a 
                    href="mailto:skyitventures01@gmail.com" 
                    className="text-xs text-slate-200 font-mono font-semibold hover:text-sky-300 hover:underline block"
                  >
                    skyitventures01@gmail.com
                  </a>
                  <a 
                    href="https://www.skyitonline.org" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-400 font-mono font-bold hover:underline block"
                  >
                    www.skyitonline.org
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
        <div className="md:col-span-7 bg-[#171b27] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-sm space-y-4">
          <div>
            <h3 className="font-display font-black text-sm text-white">
              Submit Direct Site Inquiry
            </h3>
            <p className="text-[11px] text-[#a0a8c2]">
              Complete this ledger form and a regional technical supervisor will respond with complete project plans.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 bg-emerald-950/40 rounded-2xl border border-emerald-500/30 text-center space-y-3 animate-scale-up">
              <span className="text-3xl text-emerald-400 block">✓</span>
              <h4 className="text-sm font-semibold text-emerald-300">Telemetry Request Sent</h4>
              <p className="text-xs text-emerald-200 max-w-sm mx-auto leading-relaxed">
                Thank you for reaching out! Your hardware specification inquiry has been successfully locked on our supervisor board. We will reach back within 2 business hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-[#3898ff] font-black hover:underline uppercase tracking-wide cursor-pointer"
              >
                File another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 text-red-300 text-xs p-3 rounded-xl flex items-center gap-2 border border-red-500/20">
                  <AlertCircle size={14} className="shrink-0 text-red-400" />
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
                    className="w-full bg-[#0d111a] border border-white/10 rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-[#0066ff] text-white font-medium placeholder:text-slate-600"
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
                    className="w-full bg-[#0d111a] border border-white/10 rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-[#0066ff] text-white placeholder:text-slate-600"
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
                    className="w-full bg-[#0d111a] border border-white/10 rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-[#0066ff] text-white font-mono placeholder:text-slate-600"
                    placeholder="e.g. +234..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Topic Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#0d111a] border border-white/10 rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-[#0066ff] text-white font-semibold"
                  >
                    <option value="Consultation Inquiry" className="bg-[#171b27] text-white">Residential Solar Setup (Inquiry)</option>
                    <option value="Commercial Microgrids" className="bg-[#171b27] text-white">Commercial Sizing Microgrid</option>
                    <option value="CCTV Security Support" className="bg-[#171b27] text-white">CCTV Security & Alarms Network</option>
                    <option value="Billing & Pricing Feedback" className="bg-[#171b27] text-white">Quotation Billing Feedback</option>
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
                  className="w-full bg-[#0d111a] border border-white/10 rounded-xl p-3 text-xs focus:outline-hidden focus:border-[#0066ff] text-white font-sans resize-none placeholder:text-slate-600"
                  placeholder="Tell us about your home appliances array, peak power load conditions, or setup schedules..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0066ff] hover:bg-[#0052cc] text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md cursor-pointer"
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
