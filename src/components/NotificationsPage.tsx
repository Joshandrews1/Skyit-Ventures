import React, { useState } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  Package, 
  Sparkles, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  Filter, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Info
} from 'lucide-react';
import { UserNotification, NotificationType } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../lib/notificationService';

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
  currentUser,
  onNavigateTab,
  onOpenLogin
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = activeFilter === 'all' || n.type === activeFilter;
    const matchesSearch = searchTerm === '' || 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'order':
        return <Package className="w-5 h-5 text-blue-400" />;
      case 'quote':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      case 'promo':
        return <AlertTriangle className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getTypeBadgeClass = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'order':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'quote':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'promo':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const handleActionClick = (notif: UserNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
    if (notif.actionUrl) {
      onNavigateTab(notif.actionUrl);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <Bell size={26} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  Notifications & Activity Center
                  {unreadCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                      {unreadCount} Unread
                    </span>
                  )}
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  {userEmail 
                    ? `Live security alerts, login detection, and activity updates for ${userEmail}` 
                    : 'Track login fraud detection alerts, order status updates, and system activities'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {!userEmail && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <ShieldAlert size={16} />
                <span>Sign In to Access Notifications</span>
              </button>
            )}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead(userEmail)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-amber-500/10 active:scale-95"
              >
                <CheckCheck size={16} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guest Sign-In Security Notice Banner */}
      {!userEmail && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={22} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-sm font-bold text-amber-200 block">🔒 Sign In Required for Account Notifications</span>
              <p className="text-xs text-amber-100/80 leading-relaxed max-w-2xl">
                Notifications, real-time security alerts, and order tracking logs are tied to your registered user account. As a guest, data is kept private and not displayed. Sign in or register to receive live updates.
              </p>
            </div>
          </div>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
            >
              Sign In / Register
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Filter size={14} className="text-amber-400" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Alerts', count: notifications.length },
            { id: 'security', label: '🔒 Fraud & Security', count: notifications.filter(n => n.type === 'security').length },
            { id: 'order', label: '📦 Orders', count: notifications.filter(n => n.type === 'order').length },
            { id: 'quote', label: '⚡ Quotes & Services', count: notifications.filter(n => n.type === 'quote').length }
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setActiveFilter(btn.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                activeFilter === btn.id
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>{btn.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeFilter === btn.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
              }`}>
                {btn.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search notification messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl mx-auto flex items-center justify-center text-slate-500">
              <Bell size={32} className="text-amber-400/60" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-white">No notifications found</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {searchTerm || activeFilter !== 'all' 
                  ? 'No notifications match your current filter criteria. Try resetting the search or filter tab.'
                  : 'You have no active security alerts or order updates. Login activity and order status changes will automatically display here.'}
              </p>
            </div>
            {(searchTerm || activeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setActiveFilter('all'); setSearchTerm(''); }}
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`group relative rounded-2xl border transition-all duration-200 p-5 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-lg ${
                !notif.read
                  ? 'bg-slate-900/95 border-amber-500/40 shadow-amber-500/5'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Left Accent Indicator */}
              {!notif.read && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-amber-400 rounded-r-full shadow-lg shadow-amber-400/50" />
              )}

              <div className="flex items-start gap-4">
                {/* Icon box */}
                <div className={`p-3 rounded-2xl border shrink-0 ${getTypeBadgeClass(notif.type)}`}>
                  {getIconForType(notif.type)}
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getTypeBadgeClass(notif.type)}`}>
                      {notif.type}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock size={12} />
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                    {!notif.read && (
                      <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        New Unread
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                    {notif.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {notif.message}
                  </p>

                  {/* Device / Location / Map Callout for Security Notifications */}
                  {notif.type === 'security' && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono text-slate-300">
                        <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-amber-300 font-semibold">
                          📍 {notif.metadata?.location || 'Lagos, Nigeria'}
                        </span>
                        {notif.metadata?.ip && (
                          <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-slate-300">
                            🌐 IP: {notif.metadata.ip}
                          </span>
                        )}
                        <span className="bg-emerald-950/60 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-sans font-bold flex items-center gap-1">
                          ✓ Security Email Sent
                        </span>
                      </div>

                      {/* Security Map Preview */}
                      <div className="rounded-xl overflow-hidden border border-slate-800/90 h-32 max-w-lg bg-slate-950 relative shadow-md">
                        <iframe
                          title={`Security Login Location Map - ${notif.id}`}
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0, filter: 'contrast(1.05) saturate(1.1)' }}
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(notif.metadata?.location || 'Lagos, Nigeria')}&z=10&output=embed`}
                          allowFullScreen
                          loading="lazy"
                        />
                        <div className="absolute bottom-1.5 left-2 bg-slate-950/90 border border-slate-800 px-2 py-0.5 rounded-md text-[9px] text-amber-300 font-mono shadow-sm">
                          📍 Login Location Map: {notif.metadata?.location || 'Lagos, Nigeria'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard Device Metadata Callout for Non-security */}
                  {notif.type !== 'security' && notif.metadata?.browser && (
                    <div className="text-[10.5px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 inline-block mt-1">
                      💻 Source: <span className="text-slate-300">{notif.metadata.browser}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Right */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 shrink-0">
                {notif.actionUrl && (
                  <button
                    type="button"
                    onClick={() => handleActionClick(notif)}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wide cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <span>View Activity</span>
                    <ExternalLink size={13} />
                  </button>
                )}

                <div className="flex items-center gap-1">
                  {!notif.read && (
                    <button
                      type="button"
                      title="Mark as read"
                      onClick={() => markNotificationAsRead(notif.id)}
                      className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete notification"
                    onClick={() => deleteNotification(notif.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fraud Detection Security Guidelines Footer Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-300">
        <div className="flex items-start gap-3">
          <Info size={22} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white block">SkyIT Automated Security & Anti-Fraud Guarantee</span>
            <p className="text-slate-400 text-[11px] leading-normal">
              Every sign-in session triggers immediate device log checks and an automated security email to your registered inbox.
              If you suspect unauthorized access to your solar order account, contact <a href="mailto:skyitventures01@gmail.com" className="text-amber-400 underline font-semibold">skyitventures01@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
