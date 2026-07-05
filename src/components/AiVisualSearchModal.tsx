import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, AlertCircle, ArrowRight, RefreshCw, Eye, Tag, Cpu, Layers } from 'lucide-react';
import { Product } from '../types';

interface AiVisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSearching: boolean;
  result: {
    matchFound: boolean;
    matchedProductId: string | null;
    confidence: number;
    explanation: string;
    imagePreviewUrl?: string;
  } | null;
  error: string | null;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onRetry: () => void;
  imagePreviewUrl?: string | null;
}

export const AiVisualSearchModal: React.FC<AiVisualSearchModalProps> = ({
  isOpen,
  onClose,
  isSearching,
  result,
  error,
  products,
  onSelectProduct,
  onRetry,
  imagePreviewUrl,
}) => {
  const [scanStep, setScanStep] = useState(0);

  // Cycle scanning feedback messages for a premium high-tech feeling
  useEffect(() => {
    if (!isSearching) {
      setScanStep(0);
      return;
    }
    const interval = setInterval(() => {
      setScanStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1300);
    return () => clearInterval(interval);
  }, [isSearching]);

  if (!isOpen) return null;

  const matchedProduct = result?.matchedProductId 
    ? products.find(p => p.id === result.matchedProductId) 
    : null;

  const formatCurrency = (val: number) => {
    return "₦" + val.toLocaleString();
  };

  const scanningMessages = [
    { title: "Initializing SkyIT vision telemetry pipeline...", detail: "Connecting to secure hardware index nodes" },
    { title: "Analyzing raster specs, extracting technical profiles...", detail: "Parsing pixels to determine visual contours" },
    { title: "Cross-referencing panels, batteries & inverters database...", detail: "Comparing with catalog listings" },
    { title: "Retrieving smart model recommendations...", detail: "Structuring JSON specs report & insights" }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 overflow-y-auto">
        
        {/* CASE A: IS ACTIVE SCANNING */}
        {isSearching ? (
          <motion.div
            key="searching-container"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-slate-950 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800/80 flex flex-col relative overflow-hidden"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-900 pb-3 z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                <span className="text-[10px] tracking-widest font-black uppercase text-orange-400">
                  SkyIT Telemetry Scanning
                </span>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Immersive Image Scanning Viewport */}
            <div className="relative w-full aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner z-10 group">
              {(imagePreviewUrl || result?.imagePreviewUrl) ? (
                <img 
                  src={imagePreviewUrl || result?.imagePreviewUrl} 
                  alt="Analyzing item" 
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-slate-600 flex flex-col items-center justify-center p-6 text-center">
                  <Cpu className="text-orange-500 mb-2 animate-spin-slow" size={28} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Analyzing Image...</span>
                </div>
              )}

              {/* Digital Grid Mesh Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:16px_16px]" />

              {/* High-Tech Reticle Brackets */}
              <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-orange-500 rounded-tl-sm shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-orange-500 rounded-tr-sm shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-orange-500 rounded-bl-sm shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-orange-500 rounded-br-sm shadow-[0_0_8px_rgba(249,115,22,0.5)]" />

              {/* Laser Scanning Line Anim (Sweeping from top to bottom) */}
              <motion.div
                className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_15px_rgba(249,115,22,0.9),0_0_3px_#ffedd5] z-20"
                animate={{ top: ['4%', '96%', '4%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Pulse scanning backdrop */}
              <div className="absolute inset-0 bg-orange-500/5 animate-pulse pointer-events-none" />
            </div>

            {/* Simulated Live Diagnostic Stream */}
            <div className="mt-5 space-y-4 z-10">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3.5 items-start">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
                  <Layers size={15} className="animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block">SYSTEM STATUS</span>
                  <h4 className="text-xs font-bold text-slate-200 mt-0.5 transition-all">
                    {scanningMessages[scanStep]?.title || "Calculating visual match..."}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    {scanningMessages[scanStep]?.detail || "Running model classification indices"}
                  </p>
                </div>
              </div>

              {/* Loader Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles size={10} className="text-orange-400 animate-spin" />
                    Calculating matching confidence...
                  </span>
                  <span className="font-mono text-orange-400">{Math.min(25 + scanStep * 25, 95)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <motion.div 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full"
                    initial={{ width: "5%" }}
                    animate={{ width: "95%" }}
                    transition={{ duration: 6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* CASE B: RESULTS DISPLAY PAGE */
          <motion.div
            key="results-container"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col md:flex-row text-slate-700 max-h-[90vh] md:max-h-[80vh]"
          >
            {/* Left Side: Uploaded Image Preview */}
            <div className="w-full md:w-1/2 bg-slate-950 flex flex-col justify-center items-center relative p-6 border-b md:border-b-0 md:border-r border-slate-200 min-h-[220px] md:min-h-[380px]">
              <div className="absolute inset-0 bg-slate-950 opacity-90" />
              
              <div className="relative w-full h-full max-h-[280px] flex items-center justify-center rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner z-10">
                {result?.imagePreviewUrl ? (
                  <img 
                    src={result.imagePreviewUrl} 
                    alt="Scanned product" 
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-slate-500 flex flex-col items-center justify-center p-4">
                    <Sparkles size={32} className="text-slate-600 mb-2 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider font-bold">Waiting for Image</span>
                  </div>
                )}
              </div>

              <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-2.5 py-1 rounded-full shadow-sm text-white">
                <Sparkles size={11} className="text-orange-500 animate-pulse" />
                <span className="text-[9px] uppercase tracking-wider font-black font-sans">SkyIT AI Vision Search</span>
              </div>
            </div>

            {/* Right Side: recommendations & details */}
            <div className="w-full md:w-1/2 flex flex-col p-6 overflow-y-auto max-h-[50vh] md:max-h-[80vh]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="text-orange-500" size={16} />
                  <h3 className="font-sans font-black text-slate-900 text-sm uppercase tracking-wider">AI Analysis Result</h3>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X size={14} />
                </button>
              </div>

              {/* Error Handling */}
              {error && (
                <div className="flex-1 flex flex-col justify-center py-4 text-center space-y-4">
                  <AlertCircle size={20} className="text-rose-500 mx-auto" />
                  <p className="text-[10px] text-rose-600/90 px-4">{error}</p>
                  <button onClick={onRetry} className="bg-orange-500 text-white text-[10px] py-2 px-4 rounded-xl mx-auto flex items-center gap-1.5 cursor-pointer hover:bg-orange-600 transition-colors">
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              )}

              {/* Success Details Panel */}
              {!error && result && (
                <div className="flex-1 flex flex-col space-y-4">
                  {result.matchFound && result.confidence > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Confidence Match</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: `${result.confidence * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-orange-500">{Math.round(result.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">AI Insights</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium mt-1">{result.explanation}</p>
                  </div>

                  {matchedProduct ? (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Recommended Product</span>
                      
                      <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 shadow-sm">
                        <img src={matchedProduct.image} className="w-16 h-16 rounded-lg object-cover bg-slate-50 border" alt={matchedProduct.name} referrerPolicy="no-referrer" />
                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] uppercase tracking-widest font-black text-orange-500 block">{matchedProduct.category}</span>
                            <h4 className="font-bold text-slate-900 text-xs truncate">{matchedProduct.name}</h4>
                          </div>
                          <span className="text-[11px] font-black text-slate-950 font-mono">{formatCurrency(matchedProduct.price)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => { onSelectProduct(matchedProduct); onClose(); }}
                        className="w-full bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Eye size={12} /> View Full Specifications <ArrowRight size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 text-center">
                      <Tag className="text-slate-400 mx-auto mb-1.5" size={16} />
                      <span className="text-[10px] font-bold text-slate-500 block">No Inventory Match</span>
                      <p className="text-[9px] text-slate-400 mt-1">Try uploading a clearer, well-lit photo of the label or barcode.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
