import React from 'react';
import { Home, ChevronRight, Store, Sparkles, Truck, Phone, Settings, ShieldAlert, Info, Package, BookOpen, UserCheck } from 'lucide-react';
import { Product } from '../types';

interface BreadcrumbsProps {
  activeTab: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner';
  selectedProduct: Product | null;
  selectedCategory: string;
  onNavigate: (tab: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner') => void;
  onClearProduct: () => void;
  onSelectCategory: (category: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeTab,
  selectedProduct,
  selectedCategory,
  onNavigate,
  onClearProduct,
  onSelectCategory,
}) => {
  // Hide breadcrumbs on Home tab when no product is selected
  if (activeTab === 'home' && !selectedProduct) {
    return null;
  }

  // Map active tab to reader-friendly label and icon
  const getTabInfo = () => {
    switch (activeTab) {
      case 'home':
        return { label: 'Home', icon: <Home size={12} className="text-brand" /> };
      case 'shop':
        return { label: 'Shop Catalog', icon: <Store size={12} className="text-brand" /> };
      case 'ai':
        return { label: 'AI Solar Advisor', icon: <Sparkles size={12} className="text-amber-500" /> };
      case 'tracker':
        return { label: 'Track My Orders', icon: <Truck size={12} className="text-sky-500" /> };
      case 'quote':
        return { label: 'Solar Packages', icon: <Package size={12} className="text-brand" /> };
      case 'contact':
        return { label: 'Contact Support', icon: <Phone size={12} className="text-emerald-500" /> };
      case 'admin':
        return { label: 'Control Deck', icon: <Settings size={12} className="text-rose-500" /> };
      case 'about':
        return { label: 'About SkyIT', icon: <Info size={12} className="text-indigo-500" /> };
      case 'blog':
        return { label: 'Engineering Blog', icon: <BookOpen size={12} className="text-amber-600" /> };
      case 'owner':
        return { label: 'Managing Director', icon: <UserCheck size={12} className="text-sky-600" /> };
      default:
        return { label: 'Home', icon: <Home size={12} /> };
    }
  };

  const tabInfo = getTabInfo();

  return (
    <nav 
      id="app-breadcrumbs" 
      aria-label="Breadcrumb"
      className="w-full py-2.5 px-3 sm:px-4 mb-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs flex items-center flex-wrap gap-1.5 text-[11px] font-medium text-slate-500 animate-fade-in"
    >
      {/* Home Link */}
      <button
        onClick={() => {
          onClearProduct();
          onSelectCategory('All');
          onNavigate('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="flex items-center gap-1 hover:text-brand transition-colors cursor-pointer text-slate-400 hover:scale-102 duration-200 focus:outline-hidden"
      >
        <Home size={12.5} />
        <span className="sr-only sm:not-sr-only">Home</span>
      </button>

      <ChevronRight size={11} className="text-slate-300" />

      {/* Tab Link */}
      {selectedProduct ? (
        <>
          {activeTab !== 'home' && (
            <>
              <button
                onClick={() => {
                  onClearProduct();
                  onNavigate(activeTab);
                  if (activeTab === 'shop') {
                    setTimeout(() => {
                      const el = document.getElementById('catalog-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }}
                className="flex items-center gap-1 hover:text-brand transition-colors cursor-pointer text-slate-500 hover:scale-102 duration-200 focus:outline-hidden"
              >
                {tabInfo.icon}
                <span>{tabInfo.label}</span>
              </button>
              
              <ChevronRight size={11} className="text-slate-300" />
            </>
          )}
          
          {/* Product Category Link */}
          <button
            onClick={() => {
              onClearProduct();
              onSelectCategory(selectedProduct.category);
              onNavigate('shop');
              setTimeout(() => {
                const el = document.getElementById('catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className="text-slate-500 hover:text-brand transition-colors cursor-pointer hover:scale-102 duration-200 focus:outline-hidden hidden sm:inline"
          >
            {selectedProduct.category}
          </button>
          <ChevronRight size={11} className="text-slate-300 hidden sm:inline" />

          {/* Product Name (Active) */}
          <span className="text-slate-900 font-bold truncate max-w-[150px] sm:max-w-xs bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
            {selectedProduct.name}
          </span>
        </>
      ) : activeTab === 'shop' && selectedCategory && selectedCategory !== 'All' ? (
        <>
          <button
            onClick={() => {
              onSelectCategory('All');
              onNavigate('shop');
              setTimeout(() => {
                const el = document.getElementById('catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className="flex items-center gap-1 hover:text-brand transition-colors cursor-pointer text-slate-500 hover:scale-102 duration-200 focus:outline-hidden"
          >
            {tabInfo.icon}
            <span>{tabInfo.label}</span>
          </button>

          <ChevronRight size={11} className="text-slate-300" />

          {/* Category (Active) */}
          <span className="text-slate-950 font-bold flex items-center gap-1 bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-150/60 shadow-3xs animate-fade-in">
            {selectedCategory}
          </span>
        </>
      ) : (
        // Active Tab (no sub-item)
        <span className="text-slate-950 font-bold flex items-center gap-1 bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-150/60 shadow-3xs">
          {tabInfo.icon}
          <span>{tabInfo.label}</span>
        </span>
      )}
    </nav>
  );
};
