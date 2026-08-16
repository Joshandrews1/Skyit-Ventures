import React, { useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Check, 
  Copy, 
  Trash2, 
  Sparkles, 
  Loader2,
  Maximize2
} from 'lucide-react';

export interface FullScreenTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Optional primary action (e.g. AI generation or batch execution)
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  isPrimaryActionLoading?: boolean;
  primaryActionIcon?: React.ReactNode;
}

export const FullScreenTextEditor: React.FC<FullScreenTextEditorProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  value,
  onChange,
  placeholder,
  primaryActionLabel,
  onPrimaryAction,
  isPrimaryActionLoading,
  primaryActionIcon
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (onPrimaryAction && !isPrimaryActionLoading) {
          onPrimaryAction();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrimaryAction, isPrimaryActionLoading]);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lineCount = value ? value.split('\n').length : 0;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#070a12] text-slate-100 flex flex-col w-full h-[100dvh] overflow-hidden animate-fadeIn select-text">
      {/* Ultra-Short & Compact Mobile-First Control Bar */}
      <header className="h-12 sm:h-14 px-3 sm:px-6 bg-[#0b0f19] border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 shadow-md w-full">
        {/* Left: Quick Return Button */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0"
            title="Return to form (Esc)"
          >
            <ArrowLeft size={15} className="stroke-[2.5]" />
            <span className="text-xs">Back</span>
          </button>

          {/* Short Title on Mobile, Full Title on Desktop */}
          <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-xs md:max-w-md">
            {title.split('—')[0].trim()}
          </span>
        </div>

        {/* Center: Realtime Stats (Tablet/Desktop) */}
        <div className="hidden md:flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-lg font-mono text-xs text-slate-300 shrink-0">
          <span className="text-amber-400 font-bold">{value.length}</span>
          <span className="text-slate-500 text-[10px]">ch</span>
          <span className="text-slate-700">•</span>
          <span className="text-emerald-400 font-bold">{wordCount}</span>
          <span className="text-slate-500 text-[10px]">words</span>
        </div>

        {/* Right: Quick Actions (Guaranteed Never Clipped) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                title="Copy text"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>

              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-rose-950/70 border border-slate-800 text-slate-400 hover:text-rose-300 transition-all cursor-pointer shrink-0"
                title="Clear text"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all cursor-pointer shrink-0 shadow-xs"
          >
            Done
          </button>

          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={isPrimaryActionLoading || !value.trim()}
              className="hidden sm:inline-flex bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-1.5 rounded-lg shadow-md transition-all items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title="Execute action (Ctrl+Enter)"
            >
              {isPrimaryActionLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-slate-950" />
                  <span className="hidden md:inline">Processing...</span>
                </>
              ) : (
                <>
                  {primaryActionIcon || <Sparkles size={13} className="fill-slate-950" />}
                  <span>{primaryActionLabel}</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Full Blank Page Content Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-3.5 sm:p-6 md:p-10 lg:p-12 flex flex-col overflow-hidden">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Start typing or paste your content here..."}
          className="w-full h-full flex-1 bg-transparent text-slate-100 placeholder-slate-600 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed focus:outline-hidden resize-none font-sans font-normal selection:bg-amber-500/30 selection:text-amber-100"
          spellCheck="false"
        />
      </main>

      {/* Mobile-Only Bottom Sticky Action Bar (When primaryAction exists) */}
      {primaryActionLabel && onPrimaryAction && (
        <div className="sm:hidden p-3 bg-[#0b0f19] border-t border-slate-800/90 flex items-center gap-2 shrink-0">
          <div className="text-[11px] font-mono text-slate-400 shrink-0">
            <span className="font-bold text-amber-400">{wordCount}</span> words
          </div>
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isPrimaryActionLoading || !value.trim()}
            className="flex-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {isPrimaryActionLoading ? (
              <>
                <Loader2 size={15} className="animate-spin text-slate-950" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {primaryActionIcon || <Sparkles size={15} className="fill-slate-950" />}
                <span className="truncate">{primaryActionLabel}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Clean Bottom Subtle Status Bar for Tablets/Desktops */}
      <footer className="h-8 sm:h-9 px-4 sm:px-8 bg-[#090d16] border-t border-slate-900 hidden sm:flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span>Press <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">Esc</kbd> or click Back to exit</span>
          {primaryActionLabel && (
            <span className="hidden md:inline">• <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">Ctrl+Enter</kbd> to run action</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>Distraction-Free Canvas Mode</span>
        </div>
      </footer>
    </div>
  );
};

// Lightweight Wrapper Component for any regular Textarea with integrated Expand button
export interface ExpandableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  modalTitle: string;
  modalSubtitle?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  isPrimaryActionLoading?: boolean;
  primaryActionIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
  label,
  modalTitle,
  modalSubtitle,
  primaryActionLabel,
  onPrimaryAction,
  isPrimaryActionLoading,
  primaryActionIcon,
  wrapperClassName = '',
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
  ...rest
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const stringValue = typeof value === 'string' ? value : String(value || '');

  const handleValueChange = (newVal: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: newVal },
        currentTarget: { value: newVal }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative group">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={`w-full pr-10 ${className}`}
          {...rest}
        />

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-slate-400 border border-slate-700/80 transition-all cursor-pointer shadow-xs"
          title="Expand to Full Blank Page"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      <FullScreenTextEditor
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={modalTitle}
        subtitle={modalSubtitle}
        value={stringValue}
        onChange={handleValueChange}
        placeholder={placeholder}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        isPrimaryActionLoading={isPrimaryActionLoading}
        primaryActionIcon={primaryActionIcon}
      />
    </div>
  );
};
