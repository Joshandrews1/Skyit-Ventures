import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Zap, 
  Cpu, 
  Building2, 
  CheckCircle2, 
  Globe, 
  Lightbulb, 
  ArrowRight,
  PhoneCall,
  MapPin,
  Quote,
  MessageSquare
} from 'lucide-react';

interface OwnerSectionProps {
  onNavigate?: (tab: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner') => void;
  onNavigateToContact?: () => void;
  onNavigateToQuote?: () => void;
  onNavigateToBlog?: () => void;
}

export const OwnerSection: React.FC<OwnerSectionProps> = ({
  onNavigate,
  onNavigateToContact,
  onNavigateToQuote,
  onNavigateToBlog
}) => {
  const handleContact = () => {
    if (onNavigate) {
      onNavigate('contact');
    } else if (onNavigateToContact) {
      onNavigateToContact();
    }
  };

  const handleQuote = () => {
    if (onNavigate) {
      onNavigate('quote');
    } else if (onNavigateToQuote) {
      onNavigateToQuote();
    }
  };

  const handleBlog = () => {
    if (onNavigate) {
      onNavigate('blog');
    } else if (onNavigateToBlog) {
      onNavigateToBlog();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-12 text-slate-700"
    >
      
      {/* 1. Executive Hero Section */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-12 shadow-xl border border-slate-800"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-32 -mb-32"></div>

        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          
          {/* Executive Portrait & Status Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-brand to-amber-400 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-56 h-64 sm:w-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800 shadow-2xl">
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FIMG-20260723-WA0001.jpg?alt=media&token=30e9afa5-8d9c-4334-b742-386e47910f2f" 
                  alt="Daniel Eweh - Managing Director, SkyIT Ventures" 
                  className="w-full h-full object-cover object-top hover:scale-105 transition duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <span className="inline-block bg-brand/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-brand-light/30">
                    Managing Director &amp; MD
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Title Card below image */}
            <div className="mt-4 text-center">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display">Daniel Eweh</h2>
              <p className="text-xs text-slate-100 font-semibold">Managing Director, SkyIT Ventures</p>
              <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-sky-200 font-semibold">
                <MapPin size={12} className="text-sky-400" />
                <span>Lagos &amp; Warri, Nigeria</span>
              </div>
            </div>
          </div>

          {/* Executive Overview & Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-sky-900/60 border border-sky-400/50 px-3 py-1 rounded-full text-[11px] font-bold text-sky-200">
              <Sparkles size={13} className="text-amber-400 animate-spin-slow" />
              <span>Executive Leadership Profile</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white font-display tracking-tight leading-tight">
              Championing Digital Innovation &amp; <span className="text-sky-400">Sustainable Energy</span> Across Africa
            </h1>

            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
              Daniel Eweh is an accomplished technology entrepreneur, renewable energy advocate, and business leader serving as the Managing Director of SkyIT Ventures. With over two decades of experience spanning information technology, engineering solutions, and sustainable energy, he has built a reputation for delivering innovative solutions that drive business growth and improve lives.
            </p>

            {/* 3 Core Pillar Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl text-left space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <Award size={14} />
                  <span>20+ Years</span>
                </div>
                <p className="text-[10px] text-slate-200 font-medium">Industry Leadership Experience</p>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl text-left space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
                  <Zap size={14} />
                  <span>Clean Energy</span>
                </div>
                <p className="text-[10px] text-slate-200 font-medium">Solar Microgrid Pioneer</p>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl text-left space-y-1 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <Cpu size={14} />
                  <span>IT Solutions</span>
                </div>
                <p className="text-[10px] text-slate-200 font-medium">Digital Transformation Expert</p>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleQuote}
                className="bg-brand hover:bg-brand-dark text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Request Executive Consultation</span>
                <ArrowRight size={14} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleContact}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <PhoneCall size={14} />
                <span>Get in Touch</span>
              </motion.button>
            </div>

          </div>
        </div>
      </motion.section>

      {/* 2. Full Leadership Biography Card */}
      <motion.section 
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand bg-brand-light px-2.5 py-0.5 rounded-md">
              Detailed Biography
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              About Daniel Eweh
            </h2>
          </div>
          <Building2 size={28} className="text-slate-300 hidden sm:block" />
        </div>

        {/* Bio Paragraphs */}
        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-5">
          <p>
            Under his leadership, <strong className="text-slate-900">SkyIT Ventures</strong> has evolved into a trusted provider of integrated technology services, specializing in software development, web and mobile application development, network infrastructure, cybersecurity, CCTV surveillance systems, cloud solutions, IT consulting, and digital transformation services.
          </p>

          <p>
            Beyond information technology, Daniel has established himself as a respected professional in the solar energy industry. He has led the design, installation, and deployment of residential, commercial, and industrial solar power systems, helping organizations and households transition to reliable, cost-effective, and environmentally sustainable energy solutions. His expertise includes solar power system design, inverter and battery storage solutions, hybrid energy systems, energy efficiency planning, and renewable energy consulting.
          </p>

          {/* Featured Quote Callout */}
          <div className="bg-slate-50 border-l-4 border-brand p-5 rounded-r-2xl my-6 space-y-2">
            <Quote size={20} className="text-brand opacity-60" />
            <p className="italic font-display text-slate-800 text-xs sm:text-base font-semibold leading-relaxed">
              "Daniel is passionate about leveraging technology and clean energy to solve real-world challenges. He believes that digital innovation and renewable energy are powerful tools for accelerating economic development, improving productivity, and expanding access to reliable infrastructure across Africa."
            </p>
          </div>

          <p>
            Known for his strategic vision, integrity, and commitment to excellence, Daniel has successfully led multidisciplinary teams in delivering projects across government, education, healthcare, finance, telecommunications, and the private sector. His leadership philosophy centers on innovation, continuous learning, customer satisfaction, and building long-term partnerships.
          </p>

          <p>
            As the Managing Director of SkyIT Ventures, Daniel Eweh continues to champion digital transformation and sustainable energy solutions, empowering businesses and communities with technologies that create lasting impact and support a smarter, greener future.
          </p>
        </div>
      </motion.section>

      {/* 3. Core Competencies & Expertise Grid */}
      <motion.section 
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand bg-brand-light px-2.5 py-0.5 rounded-md">
            Areas of Expertise
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
            Strategic Technical &amp; Executive Capabilities
          </h2>
          <p className="text-xs text-slate-500">
            A comprehensive spectrum of leadership across clean technology, software, and critical infrastructure.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Capability 1 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3 border-t-4 border-t-amber-500">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm font-display">Solar &amp; Renewable Microgrids</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Residential, commercial, and industrial hybrid solar power system design, lithium battery storage integration, and energy audit consulting.
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Pure Sine Wave Inverters</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> LiFePO4 Storage Engineering</li>
            </ul>
          </div>

          {/* Capability 2 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3 border-t-4 border-t-brand">
            <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand">
              <Cpu size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm font-display">Software &amp; Web Engineering</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              End-to-end web and mobile application development, cloud architectures, enterprise software, and automated business workflows.
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Cloud &amp; Web Applications</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Digital Transformation</li>
            </ul>
          </div>

          {/* Capability 3 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3 border-t-4 border-t-indigo-500">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm font-display">Cybersecurity &amp; CCTV Systems</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              4K Starlight ColorVu CCTV deployments, remote monitoring networks, perimeter security AI, and network firewall configuration.
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Starlight Optical CCTV</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Enterprise Network Cabling</li>
            </ul>
          </div>

          {/* Capability 4 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3 border-t-4 border-t-emerald-500">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Building2 size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm font-display">Multi-Sector Project Execution</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Proven track record managing multidisciplinary engineering teams across government, healthcare, finance, education, and telecommunications.
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Corporate &amp; Public Sector</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> SLA &amp; Quality Management</li>
            </ul>
          </div>

          {/* Capability 5 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3 border-t-4 border-t-sky-500">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Globe size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm font-display">Africa Sustainable Energy Vision</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Advocating clean energy access to accelerate economic development, expand infrastructure, and enhance industrial productivity across Africa.
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Sustainable Growth</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Clean Tech Policy</li>
            </ul>
          </div>

          {/* Capability 6 - Blog CTA */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-300">
                <Lightbulb size={20} />
              </div>
              <h3 className="font-bold text-white text-sm font-display">Insights &amp; Publications</h3>
              <p className="text-xs text-slate-100 leading-relaxed font-normal">
                Explore articles and industry insights written by Daniel Eweh and the SkyIT engineering team.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBlog}
              className="w-full bg-brand hover:bg-brand-dark text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Read SkyIT Blog</span>
              <ArrowRight size={13} />
            </motion.button>
          </div>

        </div>
      </motion.section>

      {/* 4. Leadership Philosophy Summary Banner */}
      <motion.section 
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
        className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden"
      >
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="space-y-2 text-center sm:text-left max-w-xl relative z-10">
          <h3 className="text-lg sm:text-xl font-bold font-display text-white">
            Partner with SkyIT Ventures Today
          </h3>
          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            Ready to empower your facility with sustainable solar microgrids, advanced CCTV security, or custom software solutions? Connect with our engineering team directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0 relative z-10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleContact}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer border border-emerald-400/30"
          >
            <PhoneCall size={14} />
            <span>Contact Us Now</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleQuote}
            className="bg-brand hover:bg-brand-dark text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer border border-brand-light/20"
          >
            <MessageSquare size={14} />
            <span>Get Solar Quote</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>
      </motion.section>

    </motion.div>
  );
};

