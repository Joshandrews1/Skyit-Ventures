import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  Package, 
  Sparkles, 
  CheckCheck, 
  Trash2, 
  ArrowLeft, 
  MapPin, 
  Clock, 
  ExternalLink,
  Info,
  Check,
  Copy,
  MoreVertical
} from 'lucide-react';
import { UserNotification, NotificationType } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearAllNotifications } from '../lib/notificationService';

interface NotificationsPageProps {
  notifications: UserNotification[];
  userEmail?: string;
  currentUser?: any;
  onNavigateTab: (tab: any) => void;
  onOpenOrderTracker?: (orderId: string) => void;
  onOpenLogin?: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  userEmail,
  onNavigateTab
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedNotif, setSelectedNotif] = useState<UserNotification | null>(null);
  const [itemsList, setItemsList] = useState<UserNotification[]>(notifications);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isDetailMenuOpen, setIsDetailMenuOpen] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Sync prop changes with internal state
  useEffect(() => {
    setItemsList(notifications);
  }, [notifications]);

  // Mark all as read when entering the page
  useEffect(() => {
    const hasUnread = notifications.some(n => !n.read);
    if (hasUnread) {
      markAllNotificationsAsRead(userEmail);
    }
  }, [notifications, userEmail]);

  const handleSelectNotification = (notif: UserNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id, true);
    }
    setSelectedNotif({ ...notif, read: true });
  };

  const handleToggleReadStatus = (e: React.MouseEvent, notif: UserNotification) => {
    e.stopPropagation();
    const newRead = !notif.read;
    markNotificationAsRead(notif.id, newRead);
    setItemsList(prev => prev.map(n => n.id === notif.id ? { ...n, read: newRead } : n));
    if (selectedNotif?.id === notif.id) {
      setSelectedNotif(prev => prev ? { ...prev, read: newRead } : null);
    }
    setOpenMenuId(null);
    setIsDetailMenuOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(userEmail);
    setItemsList(prev => prev.map(n => ({ ...n, read: true })));
    if (selectedNotif) {
      setSelectedNotif(prev => prev ? { ...prev, read: true } : null);
    }
  };

  const handleClearAll = () => {
    clearAllNotifications(userEmail);
    setItemsList([]);
    setSelectedNotif(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
    setItemsList(prev => prev.filter(n => n.id !== id));
    if (selectedNotif?.id === id) {
      setSelectedNotif(null);
    }
    setOpenMenuId(null);
    setIsDetailMenuOpen(false);
  };

  const filteredNotifications = itemsList.filter(item => {
    if (activeFilter === 'unread') return !item.read;
    if (activeFilter === 'orders') return item.type === 'order' || item.type === 'quote';
    if (activeFilter === 'security') return item.type === 'security' || item.type === 'system';
    return true;
  });

  const getCategoryIcon = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return <ShieldAlert size={18} className="text-amber-400" />;
      case 'order':
        return <Package size={18} className="text-[#0066ff]" />;
      case 'quote':
        return <Sparkles size={18} className="text-purple-400" />;
      default:
        return <Info size={18} className="text-blue-400" />;
    }
  };

  const formatTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return 'Just now';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(timestamp);
    }
  };

  // FULL-PAGE DETAIL VIEW
  if (selectedNotif) {
    return (
      <div className="min-h-[80vh] bg-[#0d111a] text-white py-10 px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setSelectedNotif(null)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#b3c5ff] text-sm font-semibold transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>Back to Notifications</span>
        </button>

        {/* Full Notification Detail Card */}
        <div className="rounded-3xl p-5 sm:p-10 border border-white/10 bg-[#171b27] shadow-xl space-y-6">
          <div className="border-b border-white/10 pb-5 space-y-4">
            {/* Top Bar: Icon, Badge & Delete Action */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
                  {getCategoryIcon(selectedNotif.type)}
                </div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#0066ff] bg-[#0066ff]/10 border border-[#0066ff]/20 px-2.5 py-1 rounded-md shrink-0">
                  {selectedNotif.type}
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailMenuOpen(prev => !prev);
                  }}
                  className="p-2 text-[#8c90a0] hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0 cursor-pointer"
                  title="Options"
                >
                  <MoreVertical size={18} />
                </button>

                {isDetailMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0d111a] border border-white/15 shadow-2xl z-50 py-1.5 overflow-hidden backdrop-blur-xl">
                    {!selectedNotif.read && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleReadStatus(e, selectedNotif)}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <CheckCheck size={14} className="text-[#0066ff]" />
                        <span>Mark as Read</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, selectedNotif.id)}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Title: Full width below top bar so text is never squeezed */}
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white leading-snug break-words">
              {selectedNotif.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8c90a0]">
            <Clock size={14} className="text-[#0066ff]" />
            <span>{formatTime(selectedNotif.createdAt)}</span>
          </div>

          <div className="p-6 rounded-2xl bg-[#0d111a] border border-white/5 text-[#dee2f2] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {selectedNotif.message}
          </div>

          {/* Security Alert Location & Interactive Map Pinpoint */}
          {(selectedNotif.type === 'security' || 
            selectedNotif.title.toLowerCase().includes('security') || 
            selectedNotif.title.toLowerCase().includes('login') || 
            selectedNotif.message.toLowerCase().includes('login') || 
            selectedNotif.details) && (() => {
            const loc = selectedNotif.details?.location || 
              (selectedNotif.message.match(/at\s+([^from]+?)\s+from\s+IP/i)?.[1]?.trim()) || 
              'Ojodu Berger, Lagos State';
            const ip = selectedNotif.details?.ip || 
              (selectedNotif.message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0]) || 
              '154.118.70.111';
            const device = selectedNotif.details?.device || 
              (selectedNotif.message.includes('Google OAuth') ? 'Google OAuth 2.0 Sign-In' : 'Web Browser');

            return (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <MapPin size={18} className="text-amber-400 shrink-0" />
                    <span>Location Pinpoint & Security Map</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-md shrink-0">
                    Live Geo-Trace
                  </span>
                </div>

                {/* Embedded Interactive Map Container */}
                <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-[#0a0d14] shadow-2xl h-64 sm:h-80">
                  <iframe
                    title="Security Location Map Pinpoint"
                    className="w-full h-full border-0 filter grayscale contrast-125 brightness-90 hover:opacity-100 transition-all"
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(loc)}&t=m&z=12&output=embed&iwloc=near`}
                  />

                  {/* Top Floating Badge Overlay */}
                  <div className="absolute top-3 left-3 bg-[#0d111a]/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-white font-medium flex items-center gap-2 shadow-xl max-w-[85%] truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="truncate">Detected Location: <strong className="text-amber-400">{loc}</strong></span>
                  </div>

                  {/* Bottom Right Copy IP Action */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(ip);
                        setCopiedCoords(true);
                        setTimeout(() => setCopiedCoords(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0d111a]/90 hover:bg-[#171b27] border border-white/20 text-xs text-white font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all cursor-pointer"
                    >
                      {copiedCoords ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedCoords ? 'Copied IP' : `Copy IP (${ip})`}</span>
                    </button>
                  </div>
                </div>

                {/* Diagnostics Grid */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-[#c2c6d8]">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-2.5 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[#8c90a0] text-xs">IP Address</span>
                    <span className="font-mono text-white font-bold">{ip}</span>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-2.5 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[#8c90a0] text-xs">Location</span>
                    <span className="text-amber-400 font-bold truncate max-w-full">{loc}</span>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-2.5 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[#8c90a0] text-xs">Authentication Method</span>
                    <span className="text-white font-medium truncate max-w-full">{device}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action Navigation Link */}
          {selectedNotif.link && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedNotif.link) {
                    const tab = selectedNotif.link.replace('#', '');
                    onNavigateTab(tab);
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white font-bold text-sm shadow-lg shadow-[#0066ff]/20 transition-all cursor-pointer active:scale-95"
              >
                <span>Take Action</span>
                <ExternalLink size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="min-h-[80vh] bg-[#0d111a] text-white py-10 px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white flex items-center gap-3">
            <span>Notifications</span>
            {itemsList.filter(n => !n.read).length > 0 && (
              <span className="text-xs bg-[#0066ff] text-white px-2.5 py-0.5 rounded-full font-bold">
                {itemsList.filter(n => !n.read).length} new
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#8c90a0] mt-1">
            Stay updated with your orders, security alerts, and system activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          {itemsList.length > 0 && itemsList.some(n => !n.read) && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#b3c5ff] transition-all cursor-pointer active:scale-95"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
          {itemsList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-rose-400 transition-all cursor-pointer active:scale-95"
            >
              <Trash2 size={14} />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread' },
          { id: 'orders', label: 'Orders & Quotes' },
          { id: 'security', label: 'Security & System' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === tab.id
                ? 'bg-[#0066ff] text-white shadow-md'
                : 'bg-white/5 text-[#8c90a0] hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Row List */}
      {filteredNotifications.length === 0 ? (
        <div className="rounded-3xl p-12 text-center border border-white/10 bg-[#171b27]/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#8c90a0]">
            <Bell size={22} />
          </div>
          <h3 className="text-base font-bold text-white">No notifications</h3>
          <p className="text-xs text-[#8c90a0]">You have no notifications matching this filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-[#171b27]/60 shadow-xl">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectNotification(item)}
              className={`relative flex items-center justify-between gap-4 p-4 sm:p-5 transition-all cursor-pointer hover:bg-white/5 ${
                !item.read ? 'bg-[#0066ff]/5' : ''
              } ${openMenuId === item.id ? 'z-30 bg-white/5' : 'z-10'}`}
            >
              {/* Left Icon & Indicator */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {getCategoryIcon(item.type)}
                  </div>
                  {!item.read && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#0066ff] ring-2 ring-[#0d111a]" />
                  )}
                </div>

                {/* Title & Preview */}
                <div className="min-w-0 space-y-0.5">
                  <h4 className={`text-sm font-bold truncate ${item.read ? 'text-[#c2c6d8]' : 'text-white'}`}>
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#8c90a0] truncate max-w-md sm:max-w-lg">
                    {item.message}
                  </p>
                </div>
              </div>

              {/* Right Side: Date & Arrow */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-[#8c90a0] hidden sm:inline-block">
                  {formatTime(item.createdAt)}
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                    }}
                    className="p-1.5 text-[#8c90a0] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    title="Options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openMenuId === item.id && (
                    <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0d111a] border border-white/15 shadow-2xl z-50 py-1.5 overflow-hidden backdrop-blur-xl">
                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleReadStatus(e, item)}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <CheckCheck size={14} className="text-[#0066ff]" />
                          <span>Mark as Read</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item.id)}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#171b27] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 size={28} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Clear All Notifications?</h3>
              <p className="text-sm text-[#8c90a0]">
                Are you sure you want to delete all notifications? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClearAll();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
