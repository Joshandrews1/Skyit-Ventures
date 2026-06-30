import React, { useState, useRef, useEffect } from 'react';
import { Product, ChatMessage, CartItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Sparkles, MessageSquare, ShoppingCart, Loader2, Trash2, 
  Plus, SquarePen, Settings, History, ChevronDown, ChevronLeft, Check, Lightbulb, Compass, FileText, Menu, X, Zap, ShoppingBag, Mic, MicOff,
  Store, Truck, Lock
} from 'lucide-react';
import { mockProducts } from '../data/products';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface AiAssistantProps {
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onViewProduct: (product: Product) => void;
  currentUser?: any;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isAdmin?: boolean;
  isEditor?: boolean;
  onOpenCart?: () => void;
  products?: Product[];
  cart?: CartItem[];
  onOpenProfile?: () => void;
  onOpenLogin?: () => void;
}

const DEFAULT_GREETING: ChatMessage = {
  sender: 'assistant',
  text: "Hello! I am your **SkyIT Ventures Advisor**. 🌟\n\nWe engineer custom clean energy and smart CCTV security solutions for homes, offices, and commercial sites. How can we support your power or security needs today? Tell me a bit about what you're looking to achieve!",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export const AiAssistant: React.FC<AiAssistantProps> = ({ 
  onAddToCart, 
  onViewProduct, 
  currentUser,
  activeTab,
  setActiveTab,
  isAdmin,
  isEditor,
  onOpenCart,
  products = [],
  cart = [],
  onOpenProfile,
  onOpenLogin
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'Flash' | 'Pro'>('Flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [attachedImages, setAttachedImages] = useState<{ id: string, name: string, base64: string, mimeType: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showMicHelp, setShowMicHelp] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as content increases
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [inputText]);

  // Handle Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInputText((prev) => (prev ? prev + ' ' : '') + transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setSpeechError("Microphone permission was denied. Try sharing permissions, or open this application in a new window/tab to grant microphone access.");
        } else {
          setSpeechError(`Voice input error (${event.error}). Please check your connection or device settings.`);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try another modern browser like Chrome.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setSpeechError(null);
      setShowMicHelp(false);
      try {
        // Explicitly check and request microphone access first
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop all tracks immediately to release the microphone so the speech recognizer can use it
          stream.getTracks().forEach(track => track.stop());
        }
        
        recognitionRef.current.start();
      } catch (err: any) {
        console.error("Failed to start speech recognition / get permission:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setSpeechError("Microphone access is blocked by your browser settings.");
        } else {
          setSpeechError("Could not access microphone. Please ensure access is allowed in your browser.");
        }
      }
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeProducts = products.length > 0 ? products : mockProducts;
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // If layout is mobile, close sidebar by default so chat area is full screen
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Persistent threads and context states
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [currentThreadSummary, setCurrentThreadSummary] = useState<string>('');
  const hasRestoredRef = useRef<boolean>(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Hook to subscribe to user's chat history threads real-time
  useEffect(() => {
    if (!currentUser) {
      setThreads([]);
      setActiveThreadId(null);
      setCurrentThreadSummary('');
      setMessages([]);
      hasRestoredRef.current = false;
      return;
    }

    // Query without orderBy to avoid needing a composite index in Firestore
    const q = query(
      collection(db, 'chat_threads'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedThreads: any[] = [];
      snapshot.forEach((doc) => {
        loadedThreads.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort client-side by updatedAt desc to keep order pristine
      loadedThreads.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });

      setThreads(loadedThreads);

      // Keep active list messages selected and in-sync if thread exists
      if (activeThreadId) {
        const active = loadedThreads.find(t => t.id === activeThreadId);
        if (active) {
          setMessages(active.messages);
          setCurrentThreadSummary(active.summary || '');
        }
      } else if (!hasRestoredRef.current) {
        // Start on clean new chat interface when mounting (navigating into the AI advisor)
        // This allows users to check past chats manually from the sidebar list instead of forcing auto-load.
        hasRestoredRef.current = true;
      }
    }, (err) => {
      console.warn("[Firestore] Sync chat threads failed, falling back gracefully:", err);
    });

    return () => unsubscribe();
  }, [currentUser, activeThreadId]);

  const suggestPrompts = [
    { text: "Compare Tubular & Lithium Cells", icon: <Compass size={14} className="text-[#adc6ff]" /> },
    { text: "Best security kits for 4-bedroom flat", icon: <Lightbulb size={14} className="text-[#dab9ff]" /> },
    { text: "Size a 5KVA Home Inverter Package", icon: <FileText size={14} className="text-emerald-400" /> }
  ];

  const resizeImage = (base64Str: string, mimeType: string): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        // High compression smallest practical size
        const maxDim = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to jpeg with low quality (0.4) for maximum file size reduction
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
          resolve({
            base64: compressedDataUrl,
            mimeType: 'image/jpeg'
          });
        } else {
          resolve({ base64: base64Str, mimeType });
        }
      };
      img.onerror = () => {
        resolve({ base64: base64Str, mimeType });
      };
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resizeImage(event.target.result as string, file.type).then(({ base64, mimeType }) => {
                setAttachedImages(prev => [
                  ...prev,
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    name: file.name || 'Pasted Image',
                    base64: base64,
                    mimeType: mimeType
                  }
                ]);
              });
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resizeImage(event.target.result as string, file.type).then(({ base64, mimeType }) => {
              setAttachedImages(prev => [
                ...prev,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  name: file.name,
                  base64: base64,
                  mimeType: mimeType
                }
              ]);
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset file input value so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartNewChat = () => {
    setActiveThreadId(null);
    setMessages([]);
    setCurrentThreadSummary('');
    if (currentUser) {
      localStorage.removeItem(`skyit_active_thread_${currentUser.uid}`);
    }
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreadToDelete(threadId);
  };

  const confirmDeleteThread = async () => {
    if (!threadToDelete) return;
    try {
      if (activeThreadId === threadToDelete) {
        setActiveThreadId(null);
        setMessages([]);
        setCurrentThreadSummary('');
        if (currentUser) {
          localStorage.removeItem(`skyit_active_thread_${currentUser.uid}`);
        }
      }
      await deleteDoc(doc(db, 'chat_threads', threadToDelete));
    } catch (err) {
      console.error("[Firestore] Thread deletion failed:", err);
    } finally {
      setThreadToDelete(null);
    }
  };

  const handleSend = async (text: string) => {
    if ((!text.trim() && attachedImages.length === 0) || isLoading) return;

    const messageText = text.trim() || "[Attached Image Reference]";

    const userMsg: ChatMessage = {
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      images: attachedImages.length > 0 ? attachedImages.map(img => img.base64) : undefined
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    const currentImages = [...attachedImages];
    setAttachedImages([]);
    setIsLoading(true);

    // Track active thread ID or assign instant new one to maintain persistence state
    let currentId = activeThreadId;
    if (currentUser && !currentId) {
      const newThreadRef = doc(collection(db, 'chat_threads'));
      currentId = newThreadRef.id;
      setActiveThreadId(currentId);
      localStorage.setItem(`skyit_active_thread_${currentUser.uid}`, currentId);
    }

    // Helper to serialize messages safely without writing undefined properties to Firestore
    const cleanMessagesForFirestore = (msgs: ChatMessage[]) => {
      return msgs.map(m => {
        const cleaned: any = {
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp
        };
        if (m.suggestedProducts !== undefined) {
          cleaned.suggestedProducts = m.suggestedProducts;
        }
        if (m.images !== undefined) {
          cleaned.images = m.images;
        }
        return cleaned;
      });
    };

    // Instant optimistic first save (saves user message immediately, protecting against page exit)
    if (currentUser && currentId) {
      try {
        const titleText = updatedMessages[0]?.text 
          ? (updatedMessages[0].text.length > 35 ? updatedMessages[0].text.substring(0, 35) + '...' : updatedMessages[0].text) 
          : "Saved Chat";

        await setDoc(doc(db, 'chat_threads', currentId), {
          id: currentId,
          userId: currentUser.uid,
          title: titleText,
          messages: cleanMessagesForFirestore(updatedMessages),
          summary: currentThreadSummary || '',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("[Firestore] Instant chat thread persistence failed:", dbErr);
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages.map(m => ({ sender: m.sender, text: m.text })),
          images: currentImages.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
          summary: currentThreadSummary,
          products: activeProducts,
          userName: getUserFirstName()
        })
      });

      if (!response.ok) throw new Error("Connection failed.");

      const data = await response.json();
      
      const recommended: Product[] = [];
      if (data.recommendedProductIds && Array.isArray(data.recommendedProductIds)) {
        data.recommendedProductIds.forEach((id: string) => {
          const matched = activeProducts.find(p => p.id === id);
          if (matched) recommended.push(matched);
        });
      }

      const assistantMsg: ChatMessage = {
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedProducts: recommended.length > 0 ? recommended : undefined
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      setCurrentThreadSummary(data.summary || '');

      // final persistence update with AI reply
      if (currentUser && currentId) {
        try {
          await setDoc(doc(db, 'chat_threads', currentId), {
            id: currentId,
            userId: currentUser.uid,
            title: finalMessages[0]?.text ? (finalMessages[0].text.length > 35 ? finalMessages[0].text.substring(0, 35) + '...' : finalMessages[0].text) : "Saved Chat",
            messages: cleanMessagesForFirestore(finalMessages),
            summary: data.summary || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          localStorage.setItem(`skyit_active_thread_${currentUser.uid}`, currentId);
        } catch (dbErr) {
          console.warn("[Firestore] Chat thread persistence update failed:", dbErr);
        }
      }
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        sender: 'assistant',
        text: "Apologies, I encountered a brief connection lag. I have recommended some relevant sample products from our catalog below for you to explore!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedProducts: activeProducts.length > 0 ? activeProducts.slice(0, 2) : undefined
      };
      
      const errorMessages = [...updatedMessages, errorMsg];
      setMessages(errorMessages);

      if (currentUser && currentId) {
        try {
          await setDoc(doc(db, 'chat_threads', currentId), {
            id: currentId,
            userId: currentUser.uid,
            title: errorMessages[0]?.text ? (errorMessages[0].text.length > 35 ? errorMessages[0].text.substring(0, 35) + '...' : errorMessages[0].text) : "Saved Chat",
            messages: cleanMessagesForFirestore(errorMessages),
            summary: currentThreadSummary || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.warn("[Firestore] Save error fallback fail:", dbErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatNaira = (val: number) => {
    return "₦" + Math.floor(val).toLocaleString();
  };

  const formatReplyText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let isBullet = false;
      let displayLine = line;
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        isBullet = true;
        displayLine = line.trim().substring(2);
      }

      const parts = displayLine.split('**');
      const inlineRendered = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <span key={pIdx} className="font-bold text-[#adc6ff]">{part}</span>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="list-disc ml-5 pl-1 my-1.5 leading-relaxed text-xs text-slate-300">
            {inlineRendered}
          </li>
        );
      }

      return (
        <p key={idx} className="my-2 leading-relaxed text-xs text-slate-200">
          {inlineRendered}
        </p>
      );
    });
  };

  // Extract human-friendly name from currentUser details for greeting
  const getUserFirstName = () => {
    if (!currentUser) return 'Guest'; // default fallback for demonstration
    const name = currentUser.displayName || currentUser.email || 'Guest';
    return name.split(' ')[0].split('@')[0];
  };

  // Determine if it is a fresh session (no messages in session)
  const isFreshSession = messages.length === 0;

  return (
    <div className="bg-[#0e0e10] flex flex-col md:flex-row h-screen h-[100dvh] min-h-0 w-full text-slate-300 relative transition-all duration-300">
      
      {/* Sidebar - Left Section */}
      <aside 
        onMouseEnter={() => {
          if (!sidebarOpen) {
            setSidebarOpen(true);
          }
        }}
        className={`bg-[#131315] flex flex-col justify-between overflow-y-auto shrink-0 min-h-0 border-r border-white/5 transition-all duration-300 ease-in-out group
        ${sidebarOpen 
          ? 'w-full md:w-[280px] p-4 opacity-100 gap-2' 
          : 'w-0 p-0 opacity-0 pointer-events-none md:pointer-events-auto md:w-[72px] md:p-3 md:opacity-100 md:gap-2 overflow-hidden border-r-0 md:border-r'
        }
        ${sidebarOpen 
          ? 'fixed inset-0 z-50 md:relative' 
          : 'fixed -translate-x-full md:translate-x-0 md:relative'
        }
      `}>
        
        <div className="flex flex-col min-h-0 flex-1 overflow-x-hidden">
          {/* Brand Header */}
          <div className={`flex items-center ${sidebarOpen ? 'justify-between px-2' : 'justify-center'} py-3 mb-2`}>
            <div 
              onClick={() => {
                setActiveTab?.('shop');
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 min-w-0"
            >
              <div className="p-0.5 rounded-lg border border-slate-700/50 flex items-center justify-center bg-white shadow-xs overflow-hidden w-8 h-8 shrink-0">
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                  alt="SkyIT Logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              {sidebarOpen && (
                <h1 className="font-display font-medium text-base text-white tracking-tight truncate">
                  SkyIT <span className="text-blue-400 font-bold">Ventures</span>
                </h1>
              )}
            </div>
            {sidebarOpen && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setSidebarOpen(false)} 
                  className="p-1.5 hover:bg-white/5 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-white"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden flex-1 pr-1 custom-scrollbar">
            {/* New Chat pill */}
            <div 
              onClick={() => {
                handleStartNewChat();
                if (window.innerWidth < 768) setSidebarOpen(false);
              }} 
              className={`rounded-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center mx-auto w-10'} py-2.5 cursor-pointer transition-all duration-200 shrink-0 ${
                isFreshSession && !activeThreadId
                  ? 'bg-white/10 text-[#e5e1e4] font-semibold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-[#e5e1e4]'
              }`}
              title="New Chat"
            >
              <SquarePen size={14} className="shrink-0" />
              {sidebarOpen && <span className="text-xs truncate">New chat</span>}
            </div>

            {/* Shop Catalog Switcher */}
            {setActiveTab && (
              <div 
                onClick={() => {
                  setActiveTab('shop');
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`text-slate-400 hover:bg-white/5 rounded-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center mx-auto w-10'} py-2.5 cursor-pointer transition-all duration-200 hover:text-[#e5e1e4] shrink-0`}
                title="Shop Catalog"
              >
                <Store size={14} className="text-[#adc6ff] shrink-0" />
                {sidebarOpen && <span className="text-xs truncate">Shop Catalog</span>}
              </div>
            )}

            {/* Track My Orders Switcher */}
            {setActiveTab && (
              <div 
                onClick={() => {
                  setActiveTab('tracker');
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`text-slate-400 hover:bg-white/5 rounded-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center mx-auto w-10'} py-2.5 cursor-pointer transition-all duration-200 hover:text-[#e5e1e4] shrink-0`}
                title="Track My Orders"
              >
                <Truck size={14} className="text-[#dab9ff] shrink-0" />
                {sidebarOpen && <span className="text-xs truncate">Track My Orders</span>}
              </div>
            )}

            {/* Contact Support Switcher */}
            {setActiveTab && (
              <div 
                onClick={() => {
                  setActiveTab('contact');
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`text-slate-400 hover:bg-white/5 rounded-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center mx-auto w-10'} py-2.5 cursor-pointer transition-all duration-200 hover:text-[#e5e1e4] shrink-0`}
                title="Support Desk"
              >
                <MessageSquare size={14} className="text-emerald-400 shrink-0" />
                {sidebarOpen && <span className="text-xs truncate">Support Desk</span>}
              </div>
            )}

            {/* Staff Desk Switcher */}
            {setActiveTab && (isAdmin || isEditor) && (
              <div 
                onClick={() => {
                  setActiveTab('admin');
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`text-rose-400 hover:bg-rose-500/10 rounded-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center mx-auto w-10'} py-2.5 cursor-pointer transition-all duration-200 font-bold shrink-0`}
                title={isAdmin ? 'Admin Desk' : 'Staff Desk'}
              >
                <Settings size={14} className="text-rose-450 shrink-0" />
                {sidebarOpen && <span className="text-xs truncate">{isAdmin ? 'Admin' : 'Staff'} Desk</span>}
              </div>
            )}

            {/* Save Chat Prompt Context Banner */}
            {!currentUser && sidebarOpen && (
              <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/10 p-3 rounded-xl text-[11px] leading-relaxed text-indigo-200 space-y-1.5 my-3 shrink-0 mx-2">
                <span className="font-bold flex items-center gap-1.5 text-[#adc6ff]">
                  <Sparkles size={11} fill="currentColor" />
                  PERSIST CHATS
                </span>
                <p className="text-slate-400">
                  Sign in using the button below to preserve your chats and quote audits across reloads!
                </p>
              </div>
            )}

            {/* Saved Chat History Section */}
            {currentUser && (
              <div className={`mt-4 ${!sidebarOpen && 'hidden md:block'}`}>
                {sidebarOpen ? (
                  <>
                    <div className="px-4 mb-2 shrink-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recents</p>
                    </div>
                    
                    <div className="space-y-1">
                      {threads.length === 0 ? (
                        <p className="px-4 text-[11px] text-slate-500 italic py-1 shrink-0">
                          No saved threads.
                        </p>
                      ) : (
                        threads.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setActiveThreadId(t.id);
                              setMessages(t.messages);
                              setCurrentThreadSummary(t.summary || '');
                              localStorage.setItem(`skyit_active_thread_${currentUser.uid}`, t.id);
                              if (window.innerWidth < 768) setSidebarOpen(false);
                            }}
                            title={t.title}
                            className={`group flex items-center justify-between px-3 py-2 rounded-full transition-all cursor-pointer shrink-0 ${
                              activeThreadId === t.id
                                ? 'bg-white/10 text-white font-semibold'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-1">
                              <MessageSquare size={12} className={`shrink-0 ${activeThreadId === t.id ? 'text-[#adc6ff]' : 'text-slate-500'}`} />
                              <span className="truncate text-xs">{t.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteThread(t.id, e)}
                              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-[#ff4d4f] transition-all shrink-0 cursor-pointer"
                              title="Delete thread"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => setSidebarOpen(true)}
                    className="text-slate-400 hover:bg-white/5 rounded-full flex items-center justify-center mx-auto w-10 py-2.5 cursor-pointer transition-all duration-200 hover:text-[#e5e1e4] shrink-0"
                    title="Recent Chats"
                  >
                    <History size={14} className="shrink-0" />
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Footer Profile Segment */}
        <div className={`pt-3 border-t border-white/5 shrink-0 ${!sidebarOpen && 'flex justify-center'}`}>
          {currentUser ? (
            <div 
              onClick={onOpenProfile}
              className={`flex items-center ${sidebarOpen ? 'justify-between px-2' : 'justify-center w-10'} py-1.5 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group`}
              title="Edit user profile"
            >
              <div className={`flex items-center gap-2.5 ${sidebarOpen ? 'min-w-0' : ''}`}>
                {currentUser.photoURL ? (
                  <img 
                    className="w-7 h-7 rounded-full bg-[#1C1A2E] object-cover border border-white/10 shrink-0" 
                    src={currentUser.photoURL} 
                    alt="Profile avatar" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs border border-white/10 uppercase shrink-0">
                    {(currentUser.displayName || currentUser.email || "?").charAt(0)}
                  </div>
                )}
                {sidebarOpen && (
                  <span className="text-[11.5px] font-medium text-[#e5e1e4] truncate">
                    {currentUser.displayName || currentUser.email}
                  </span>
                )}
              </div>
              {sidebarOpen && (
                <div className="flex items-center gap-1 shrink-0">
                  <Settings size={13} className="text-slate-400 group-hover:text-white" />
                  <div className="w-1.5 h-1.5 bg-[#4285F4] rounded-full"></div>
                </div>
              )}
            </div>
          ) : (
            sidebarOpen ? (
              <button
                onClick={onOpenLogin}
                className="w-full bg-[#1C1A2E] hover:bg-brand text-white border border-white/10 hover:border-brand py-2.5 px-3 rounded-xl text-center text-[10.5px] uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                Sign In / Sign Up
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="w-9 h-9 bg-[#1C1A2E] hover:bg-brand text-white border border-white/10 hover:border-brand rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Sign In / Sign Up"
              >
                <Lock size={14} />
              </button>
            )
          )}
        </div>
      </aside>

      {/* Main Content & Chat Container */}
      <main 
        className="flex-grow flex flex-col justify-between h-full bg-[#0E0E10] relative overflow-hidden min-w-0"
        style={{ 
          background: isFocused 
            ? 'radial-gradient(circle at center, #1C1A2E 0%, #0E0E10 80%)' 
            : 'radial-gradient(circle at center, #151420 0%, #0E0E10 70%)',
          transition: 'background 0.4s ease'
        }}
      >
        
        {/* Top Floating App Bar */}
        <header className="flex justify-between items-center px-4 sm:px-6 py-3 bg-transparent z-40 border-b border-white/[0.03] md:border-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-350 shrink-0 md:hidden"
                title="Open Navigation"
              >
                <Menu size={15} />
              </button>
            )}
            <div 
              className="flex md:hidden items-center gap-2 min-w-0 cursor-pointer"
              onClick={() => setActiveTab?.('shop')}
            >
              <div className="p-0.5 rounded-md border border-slate-700/50 flex items-center justify-center bg-white overflow-hidden w-6 h-6 shrink-0">
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                  alt="SkyIT Logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-display font-black text-xs sm:text-sm text-white tracking-tight leading-none truncate whitespace-nowrap">
                SkyIT <span className="text-blue-400">Ventures</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!currentUser && (
              <button
                type="button"
                id="ai-nav-signin-btn"
                onClick={onOpenLogin}
                className="bg-brand hover:bg-brand-hover text-white transition-all font-bold text-[10.5px] items-center uppercase tracking-wider py-1.5 px-3 rounded-lg flex gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <Lock size={12} strokeWidth={2.5} className="shrink-0" />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={onOpenCart}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all font-bold text-[10.5px] items-center uppercase tracking-wider py-1.5 px-3 rounded-lg flex gap-1.5 shadow-xs shrink-0 cursor-pointer relative group"
              title="Open Shopping Cart"
            >
              <ShoppingBag size={12} className="text-brand group-hover:scale-110 transition-transform shrink-0" />
              <span>Cart</span>
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand text-white text-[8px] sm:text-[9px] font-bold w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center ring-1 sm:ring-2 ring-white animate-scale-up">
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Viewport for messages or fresh greeting template */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          
          {isFreshSession ? (
            /* Fresh empty stage matching user's Gemini style */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-10 py-10 antialiased animate-fadeIn">
              
              <div className="max-w-xl">
                <h2 className="font-display font-medium text-3xl md:text-5xl text-[#e5e1e4] tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#adc6ff] to-[#dab9ff]">
                  {currentUser ? `The mic is yours, ${getUserFirstName()}` : 'The mic is yours'}
                </h2>
                <p className="text-slate-400 text-xs mt-3 max-w-md mx-auto leading-relaxed">
                  Provide your building specs, specify inverter targets, CCTV security solutions, or select an engineering guide shortcut below to query the technical catalog.
                </p>
              </div>

              {/* Suggester templates grids */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-container_max_width">
                {suggestPrompts.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSend(p.text)}
                    className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-medium text-slate-300 hover:text-white hover:border-white/15 cursor-pointer transition-all flex flex-col justify-between text-left group min-h-[90px]"
                  >
                    <span className="leading-snug">{p.text}</span>
                    <div className="flex items-center justify-between mt-4">
                      {p.icon}
                      <span className="material-symbols-outlined text-[10px] text-slate-500 group-hover:text-white transition-colors">➔</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            /* Live conversation content window */
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex flex-col w-full ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <span className="text-[9.5px] text-slate-500 mb-1 font-semibold tracking-wide px-1">
                    {msg.sender === 'user' ? 'You' : 'SkyIT Advisory Desk'} · {msg.timestamp}
                  </span>
                  
                  <div className={`p-4 rounded-2xl border ${
                    msg.sender === 'user' 
                      ? 'bg-white/10 text-white border-white/5 rounded-tr-none max-w-[85%] shadow-md' 
                      : 'bg-white/[0.04] text-slate-200 border-white/[0.03] rounded-tl-none max-w-[90%] shadow-lg'
                  }`}>
                    {msg.sender === 'user' ? (
                      <div>
                        <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {msg.images.map((imgBase64, imgIdx) => (
                              <img 
                                key={imgIdx} 
                                src={imgBase64} 
                                alt="Attachment reference" 
                                className="max-w-[180px] max-h-[140px] object-contain rounded-lg border border-white/10 bg-black/25"
                                referrerPolicy="no-referrer"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                         {formatReplyText(msg.text)}
                      </div>
                    )}
                  </div>

                  {/* Products injection logic inside dark glass containers */}
                  {msg.suggestedProducts && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-3.5">
                      {msg.suggestedProducts.map((p) => (
                        <div 
                          key={p.id}
                          className="bg-white/[0.03] border border-white/5 hover:border-white/15 rounded-xl p-3 shadow-md flex gap-3 transition-colors duration-200"
                        >
                          <img 
                            src={p.image} 
                            alt="" 
                            className="w-12 h-12 object-cover rounded-lg bg-[#131315] border border-white/10 shrink-0 cursor-pointer hover:brightness-110 transition-all"
                            onClick={() => onViewProduct(p)}
                          />
                          <div className="min-w-0 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 
                                onClick={() => onViewProduct(p)}
                                className="text-xs font-display text-white font-bold truncate leading-tight hover:text-[#adc6ff] cursor-pointer"
                              >
                                {p.name}
                              </h4>
                              <span className="text-[11px] font-bold font-mono text-[#dab9ff] block mt-0.5">{formatNaira(p.price)}</span>
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-2">
                              <button
                                onClick={(e) => {
                                  onAddToCart(p, e);
                                  onOpenCart?.();
                                }}
                                className="bg-white/10 hover:bg-white/20 text-[#adc6ff] hover:text-white text-[9.5px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 transition-all leading-none active:scale-95"
                              >
                                <ShoppingCart size={10} strokeWidth={2.5} />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ))}

              {/* Live generating state placeholder */}
              {isLoading && (
                <div className="flex items-center gap-2.5 text-slate-350 text-xs bg-white/[0.02] border border-white/5 p-3 px-4 rounded-xl w-fit">
                  <Loader2 className="animate-spin text-[#adc6ff]" size={14} />
                  <span className="font-sans">SkyIT backend model calculations in progress...</span>
                </div>
              )}
              
              <div ref={scrollRef} />
            </div>
          )}

        </div>

        {/* Dynamic Glowing Pill - Input Form Submission segment */}
        <div className="p-4 border-t border-white/[0.03] bg-transparent">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="max-w-3xl mx-auto w-full relative"
          >
            {speechError && (
              <div id="speech-error-banner" className="mb-3 max-w-3xl mx-auto bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-xl text-[11px] font-sans shadow-lg relative z-10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="leading-relaxed">{speechError}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowMicHelp(!showMicHelp)}
                      className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 transition-colors font-medium text-[10px] cursor-pointer"
                    >
                      {showMicHelp ? "Hide guide" : "How to allow ↗"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSpeechError(null);
                        setShowMicHelp(false);
                      }}
                      className="text-rose-400 hover:text-white transition-colors p-1 cursor-pointer"
                      title="Dismiss error notice"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                {showMicHelp && (
                  <div className="mt-2.5 pt-2.5 border-t border-rose-500/15 text-[10.5px] leading-relaxed text-slate-300 space-y-1.5">
                    <p className="font-semibold text-rose-200">Browsers lock microphone access once blocked. To allow it again easily: </p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Click the <strong className="text-white">settings / lock icon (🔒 or 🎛️)</strong> immediately to the left of the URL in your browser address bar.</li>
                      <li>Locate <strong className="text-white">Microphone</strong> in the popup menu.</li>
                      <li>Change the status to <strong className="text-emerald-400">Allow</strong> (or turn the toggle on).</li>
                      <li>Refresh this page and try again!</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#1c1b1f] border border-white/10 rounded-2xl md:rounded-3xl flex flex-col p-3 px-4 md:px-5 gap-2.5 shadow-2xl focus-within:ring-2 focus-within:ring-[#adc6ff]/20 focus-within:border-[#adc6ff]/30 transition-all duration-300">
              
              {/* Attached Images Row */}
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
                  {attachedImages.map((img) => (
                    <div key={img.id} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-white/10 bg-slate-900 shrink-0">
                      <img src={img.base64} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachedImages(prev => prev.filter(x => x.id !== img.id))}
                        className="absolute top-0.5 right-0.5 bg-black/75 text-white rounded-full p-0.5 hover:bg-black transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Area Row */}
              <div className="flex items-end gap-3.5 w-full">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-400 hover:text-white transition-colors shrink-0 mb-1 cursor-pointer"
                  title="Upload image / reference"
                >
                  <Plus size={16} />
                </button>

                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <textarea 
                  ref={textareaRef}
                  rows={1}
                  disabled={isLoading}
                  placeholder="Ask technical sizing advisor..."
                  value={inputText}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChange={(e) => setInputText(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((inputText.trim() || attachedImages.length > 0) && !isLoading) {
                        handleSend(inputText);
                      }
                    }
                  }}
                  className="flex-grow bg-transparent border-none outline-none ring-0 focus:ring-0 text-[#e5e1e4] placeholder:text-slate-500 text-[16px] md:text-xs resize-none max-h-32 min-h-[22px] py-1 scrollbar-none"
                />

                <div className="flex items-center gap-2 mb-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-2 rounded-full transition-all flex items-center justify-center border cursor-pointer ${
                      isRecording 
                        ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' 
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#adc6ff] border-white/5'
                    }`}
                    title={isRecording ? "Stop voice listening" : "Mic voice typing for quick text"}
                  >
                    {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || (!inputText.trim() && attachedImages.length === 0)}
                    className="bg-[#adc6ff] text-[#002e69] hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 p-2 rounded-full transition-colors flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Send size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

            </div>
          </form>

          {/* Sizing context disclaimer */}
          <div className="text-center mt-2.5 text-[10px] text-slate-500 leading-normal">
            Pricing indexes reflect the latest national customs tarrifs and hardware distributor indices.
          </div>
        </div>

        {/* Soft bottom decorative radial blur element matching layout mockups */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-[#adc6ff]/5 blur-[120px] rounded-full pointer-events-none"></div>

      </main>

      {/* Custom beautiful confirmation dialog for thread deletion */}
      <AnimatePresence>
        {threadToDelete && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setThreadToDelete(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0d1527] border border-white/10 p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200"
            >
              {/* Top Accent Warning Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />

              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20 shrink-0">
                  <Trash2 size={24} className="animate-pulse" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-white text-lg">Delete Chat History?</h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    Are you sure you want to permanently delete this chat session? This action cannot be undone and you will lose all conversations in this session.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setThreadToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-all cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteThread}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all shadow-md shadow-red-900/20 hover:shadow-lg cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Trash2 size={15} />
                  <span>Delete Chat</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
