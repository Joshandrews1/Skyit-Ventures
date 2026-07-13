import React from 'react';
import { ShieldCheck, Zap, Heart, Users, MapPin, BadgeCheck, Sparkles, Building2, PhoneCall, Award } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <div id="about-skyit-section" className="space-y-12 animate-fade-in text-slate-700">
      
      {/* 1. Stunning Minimalist Hero */}
      <section className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-12 shadow-sm text-center">
        {/* Subtle decorative background spots */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-brand-light text-brand px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Sparkles size={11} className="animate-spin-slow text-brand" />
            <span>The SkyIT Standard</span>
          </div>
          
          <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            Pioneering Nigeria's <br className="hidden sm:inline" />
            <span className="text-brand">Solar Energy</span> &amp; <span className="text-slate-900">Smart Security</span> Frontier
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl mx-auto">
            SkyIT Ventures is an indigenous engineering powerhouse committed to eradicating energy deficits and building resilient security networks. We architect, install, and commission hybrid solar microgrids, starlight CCTV networks, and advanced lithium battery storage systems across Nigeria.
          </p>

          {/* Core high-level badges */}
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-[10.5px] font-semibold text-slate-600">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Certified Tier-1 Components</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-[10.5px] font-semibold text-slate-600">
              <Zap size={13} className="text-brand animate-pulse" />
              <span>Pure Sine Wave Topology</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-[10.5px] font-semibold text-slate-600">
              <Award size={13} className="text-indigo-500" />
              <span>Commissioning Engineering SLA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Widescreen Hero Installation Showcase */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 shadow-xs group">
        <img 
          src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&h=675&q=80"
          alt="SkyIT Premium Solar Microgrid Installation"
          className="w-full aspect-[16/9] object-cover group-hover:scale-102 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent flex items-end p-6 sm:p-8">
          <div className="space-y-1 sm:space-y-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand bg-slate-900/65 px-2.5 py-1 rounded-md border border-slate-700/30 backdrop-blur-xs">
              Live Field Deployment
            </span>
            <p className="text-white font-display font-bold text-xs sm:text-lg">
              Commercial hybrid microgrid designed and commissioned by SkyIT Engineers.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Key Performance Metrics (The "Bento Stats" Grid) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { value: '1.2MW+', label: 'Solar Capacity Deployed', desc: 'Powering residential clusters & commercial microgrids.' },
          { value: '500+', label: 'Active System Kits', desc: 'Hybrid pure sine wave solar kits commissioned & live.' },
          { value: '24/7', label: 'Technical Support SLA', desc: 'Dedicated engineering hotlines & proactive maintenance.' },
          { value: '100%', label: 'Lagos/Warri Coverage', desc: 'Robust supply chains, field inspections & lightning services.' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-350 transition-all duration-300 group hover:-translate-y-0.5">
            <div>
              <span className="block font-display font-black text-2xl sm:text-3xl text-brand tracking-tight group-hover:scale-105 transition-transform duration-300 origin-left">
                {stat.value}
              </span>
              <span className="block font-bold text-slate-850 text-xs mt-1">
                {stat.label}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-2.5 leading-relaxed">
              {stat.desc}
            </p>
          </div>
        ))}
      </section>

      {/* 3. Core Corporate Objectives & Engineering Protocols */}
      <section className="grid md:grid-cols-2 gap-8">
        
        {/* Left Card: Core Philosophy */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-3xs space-y-5">
          <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand">
            <Heart size={18} fill="currentColor" className="text-brand" />
          </div>
          
          <h2 className="font-display font-black text-lg sm:text-xl text-slate-900 tracking-tight">
            Our Mission &amp; Purpose
          </h2>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            In Nigeria, grid inconsistencies and electrical fluctuations place tremendous strain on families and businesses. SkyIT was founded to provide a solid bridge of reliability. We believe that clean electricity is not just a convenience—it is the foundation for productivity, commerce, and personal safety.
          </p>

          <div className="rounded-xl overflow-hidden h-36 relative border border-slate-200">
            <img 
              src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&h=250&q=80"
              alt="SkyIT Quality Assurance Inspection"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-slate-900/5" />
          </div>

          <div className="space-y-3 pt-2">
            {[
              { title: 'Absolute Integrity', text: 'We never deploy cloned, sub-standard solar cells, or refurbished batteries. Every cell is tested and logged.' },
              { title: 'Zero Outage Design', text: 'We customize load calculations using high-entropy sizing matrices so your critical hardware runs uninterrupted.' },
              { title: 'Safety Engineering First', text: 'Automatic dual DC/AC circuit isolation breakers, grounding protection, and rapid cooling ventilation enclosures.' }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-2.5 items-start">
                <BadgeCheck size={14} className="text-brand mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-slate-800 leading-tight">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Deployed Technologies */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white">
              <Zap size={18} fill="currentColor" className="text-white" />
            </div>
            
            <h2 className="font-display font-black text-lg sm:text-xl text-white tracking-tight">
              Hardware &amp; Technology Stack
            </h2>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              We leverage class-leading engineering specifications to offer resilient infrastructures that thrive in harsh thermal and electrical climates:
            </p>

            <div className="rounded-xl overflow-hidden h-36 relative border border-slate-800">
              <img 
                src="https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=600&h=250&q=80"
                alt="SkyIT Smart Lithium Battery Diagnostics"
                className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-950/35" />
            </div>

            <div className="space-y-3.5 pt-1.5">
              {[
                { title: 'Smart Energy Microgrids', desc: 'Monocrystalline double-glass half-cell arrays optimized for extreme sunlight harvesting and low-light ambient yields.' },
                { title: 'Lithium Iron Phosphate (LFP)', desc: 'Smart LiFePO4 cells with active cell-balancing BMS, supporting up to 6,000 charge cycles for a lifetime of 15+ years.' },
                { title: 'Hybrid Pure Sine Inverters', desc: 'Dual MPPT controllers matching lightning-fast 10ms UPS grid transfer switching to safeguard delicate electronics.' },
                { title: 'Starlight Security Arrays', desc: 'Super-starlight CCTV systems with thermal intrusion triggers, deep tracking AI human sensors, and 4G failovers.' },
              ].map((tech, idx) => (
                <div key={idx} className="border-l-2 border-brand/50 pl-3">
                  <h4 className="font-bold text-xs text-slate-100 leading-none">{tech.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">{tech.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>SPECIFICATION CODE: SKYIT_V4_E26</span>
            <span className="text-brand">● CALIBRATED</span>
          </div>
        </div>
      </section>

      {/* 4. Map & Geographical Footprint */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1">
              <MapPin size={10} className="text-slate-500" />
              <span>Nationwide Operations</span>
            </div>
            <h2 className="font-display font-black text-lg sm:text-xl text-slate-900 tracking-tight">
              Our Geographical Footprint
            </h2>
          </div>
          
          <div className="text-[11px] text-slate-400 max-w-sm">
            Our branches host fully loaded inventory reservoirs, high-capacity test rigs, and rapid deployment engineering vehicles.
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Delta HQ card */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl overflow-hidden shadow-2xs group flex flex-col">
            <div className="h-40 overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&h=300&q=80"
                alt="SkyIT Delta HQ"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <span className="absolute bottom-3 left-4 text-[9px] font-black uppercase tracking-widest text-brand bg-slate-900/70 px-2 py-0.5 rounded border border-slate-700/40 backdrop-blur-xs">
                Corporate HQ
              </span>
            </div>
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-black text-sm text-slate-900">
                  Ebrumede-Effurun, Warri
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  KM 1 DSC Expressway beside Jesus Temple Church, Ebrumede, Effurun-Warri, Delta State.
                </p>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 pt-1 flex items-center gap-1.5 border-t border-slate-150/60 mt-2">
                <span>📞 Engineering Dispatch: +234-9074444140</span>
              </div>
            </div>
          </div>

          {/* Lagos card */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl overflow-hidden shadow-2xs group flex flex-col">
            <div className="h-40 overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=600&h=300&q=80"
                alt="SkyIT Lagos Regional Hub"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <span className="absolute bottom-3 left-4 text-[9px] font-black uppercase tracking-widest text-brand bg-slate-900/70 px-2 py-0.5 rounded border border-slate-700/40 backdrop-blur-xs">
                Regional Logistics Center
              </span>
            </div>
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-black text-sm text-slate-900">
                  Lekki Peninsula, Lagos
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Manjo Plaza, NNPC Service Station, Ikota, Second Gate, K.M 22, Lekki-Epe Expressway, Lekki, Lagos.
                </p>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 pt-1 flex items-center gap-1.5 border-t border-slate-150/60 mt-2">
                <span>📞 Logistics Center: +234-9135396292</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Direct Interactive CTA Sizing Inquiry Banner */}
      <section className="bg-brand text-white p-6 sm:p-10 rounded-3xl relative overflow-hidden shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-28 -mt-28"></div>
        
        <div className="space-y-2 relative max-w-xl">
          <h3 className="font-display font-black text-lg sm:text-xl tracking-tight leading-none text-white">
            Need custom solar or starlight CCTV sizing?
          </h3>
          <p className="text-xs text-brand-light/90 leading-relaxed">
            Our sizing algorithms and commissioning engineers will calculate your total load (Wh), choose the right hybrid MPPT inverter capacity, and select optimal backup batteries with extreme precision.
          </p>
        </div>

        <a 
          href="https://wa.me/2349074444140?text=Hello%20SkyIT%20Ventures%20team,%20I'd%2520like%2520to%2520get%2520a%2520custom%2520solar%2520and%252520security%2520load%2520sizing."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-slate-900 hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shrink-0 flex items-center gap-2 cursor-pointer border border-transparent hover:-translate-y-0.5 duration-300"
        >
          <PhoneCall size={14} className="text-brand shrink-0" />
          <span>Consult with Lead Engineer</span>
        </a>
      </section>

    </div>
  );
};
