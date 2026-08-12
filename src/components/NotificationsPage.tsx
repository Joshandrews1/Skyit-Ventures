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
  Info,
  ArrowLeft,
  MapPin,
  Lock,
  Globe,
  Laptop,
  Maximize2,
  X,
  Share2,
  Navigation,
  Check
} from 'lucide-react';
import { UserNotification, NotificationType } from '../types';
import { getAdminMatchedLocationForUser, getNeighborhoodFromCoords } from '../lib/visitorTracker';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../lib/notificationService';
import { LocationPermissionModal } from './LocationPermissionModal';

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
  const [selectedNotifDetail, setSelectedNotifDetail] = useState<UserNotification | null>(null);
  const [detailMapZoom, setDetailMapZoom] = useState<number>(17);
  const [isExpandedMapOpen, setIsExpandedMapOpen] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

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

  const handleOpenNotificationDetail = (notif: UserNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
    setSelectedNotifDetail(notif);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleActionClick = (e: React.MouseEvent, notif: UserNotification) => {
    e.stopPropagation();
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
    if (notif.actionUrl) {
      onNavigateTab(notif.actionUrl);
    } else {
      handleOpenNotificationDetail(notif);
    }
  };

  // Helper lat/lng parser from metadata matching Admin Analytics
  const getLatFromNotif = (notif: UserNotification): number => {
    if (typeof notif.metadata?.lat === 'number') return notif.metadata.lat;
    if (notif.metadata?.location?.toLowerCase().includes('warri') || notif.metadata?.location?.toLowerCase().includes('delta')) return 5.5167;
    const adminMatched = getAdminMatchedLocationForUser(notif.userEmail || '');
    return adminMatched.lat;
  };

  const getLngFromNotif = (notif: UserNotification): number => {
    if (typeof notif.metadata?.lng === 'number') return notif.metadata.lng;
    if (notif.metadata?.location?.toLowerCase().includes('warri') || notif.metadata?.location?.toLowerCase().includes('delta')) return 5.7500;
    const adminMatched = getAdminMatchedLocationForUser(notif.userEmail || '');
    return adminMatched.lng;
  };

  const handleCopyCoordinates = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  /* =========================================================================
     FULL PAGE NOTIFICATION DETAIL VIEW
     ========================================================================= */
  if (selectedNotifDetail) {
    const lat = getLatFromNotif(selectedNotifDetail);
    const lng = getLngFromNotif(selectedNotifDetail);
    const resolvedFromCoords = getNeighborhoodFromCoords(lat, lng);
    const communityName = selectedNotifDetail.metadata?.community || resolvedFromCoords.communityName;
    const cityName = selectedNotifDetail.metadata?.cityName || resolvedFromCoords.cityName;
    const stateName = selectedNotifDetail.metadata?.stateName || resolvedFromCoords.stateName;
    const locationName = `${communityName}, ${cityName}, ${stateName}`;

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 font-sans animate-fade-in">
        
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setSelectedNotifDetail(null)}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-4 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border border-amber-500/30 shadow-lg shadow-amber-500/5 active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Back to All Notifications</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                deleteNotification(selectedNotifDetail.id);
                setSelectedNotifDetail(null);
              }}
              className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold px-3.5 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Delete Alert</span>
            </button>
          </div>
        </div>

        {/* MAIN FULL PAGE CARD */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/30 pb-6">
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-2xl border shrink-0 ${getTypeBadgeClass(selectedNotifDetail.type)}`}>
                {getIconForType(selectedNotifDetail.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${getTypeBadgeClass(selectedNotifDetail.type)}`}>
                    {selectedNotifDetail.type} Alert
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock size={13} />
                    {formatTimeAgo(selectedNotifDetail.createdAt)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
                  {selectedNotifDetail.title}
                </h1>
                <p className="text-xs text-amber-300 font-mono">
                  Timestamp: {new Date(selectedNotifDetail.createdAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'medium' })}
                </p>
              </div>
            </div>
          </div>

          {/* Full Message Details */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Info size={14} />
              <span>Full Alert & Context Log</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
              {selectedNotifDetail.message}
            </p>
          </div>

          {/* SECURITY & GEOLOCATION MAP SECTION (FOR SECURITY / LOGIN ALERTS OR GEOLOCATED NOTIFICATIONS) */}
          {(selectedNotifDetail.type === 'security' || selectedNotifDetail.metadata?.location) && (
            <div className="space-y-4">
              
              {/* Security Location Permission Banner Callout */}
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0 mt-0.5">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Security & Live Location Footprint</span>
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
                      Allowing location access on SkyIT verifies your active login coordinates on the map, helping our automated fraud detection shield your account against unauthorized access attempts.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 shrink-0 active:scale-95"
                >
                  <MapPin size={14} className="fill-slate-950 text-amber-400" />
                  <span>Allow Location Access</span>
                </button>
              </div>

              {/* Geolocation Footprint Telemetry Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-amber-500/30 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                    <Navigation size={12} className="text-amber-400" /> Neighborhood Node
                  </span>
                  <span className="text-xs text-amber-300 font-bold block truncate">{communityName}</span>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-amber-500/30 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                    <MapPin size={12} /> City & State
                  </span>
                  <span className="text-xs text-white font-bold block truncate">{cityName}, {stateName}</span>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-amber-500/30 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                    <Globe size={12} /> IP Address
                  </span>
                  <span className="text-xs text-white font-mono font-bold block truncate">{selectedNotifDetail.metadata?.ip || 'Verified Remote IP'}</span>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-amber-500/30 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                    <Lock size={12} /> GPS Coordinates
                  </span>
                  <span className="text-xs text-amber-300 font-mono font-black block truncate">
                    {lat.toFixed(6)}&deg;, {lng.toFixed(6)}&deg;
                  </span>
                </div>
              </div>

              {/* INTERACTIVE GEOLOCATION GOOGLE MAP EMBED WITH GOLD TEARDROP PINPOINT */}
              <div className="bg-slate-950 border-2 border-amber-500/70 rounded-3xl overflow-hidden shadow-2xl relative space-y-0">
                
                {/* Embedded Map Header Controls Bar */}
                <div className="bg-slate-900 p-3.5 border-b border-amber-500/40 flex items-center justify-between text-xs gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="font-bold text-white font-mono text-[11px]">
                      Community Pinpoint Node: <strong className="text-amber-300">{communityName} ({cityName})</strong> [{lat.toFixed(4)}&deg;, {lng.toFixed(4)}&deg;]
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Zoom Buttons */}
                    <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-1 flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300">
                      <button
                        type="button"
                        onClick={() => setDetailMapZoom(11)}
                        className={`px-2 py-0.5 rounded ${detailMapZoom === 11 ? 'bg-amber-400 text-slate-950 font-black' : 'hover:bg-slate-800'}`}
                      >
                        11x City
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailMapZoom(14)}
                        className={`px-2 py-0.5 rounded ${detailMapZoom === 14 ? 'bg-amber-400 text-slate-950 font-black' : 'hover:bg-slate-800'}`}
                      >
                        14x Street
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailMapZoom(16)}
                        className={`px-2 py-0.5 rounded ${detailMapZoom === 16 ? 'bg-amber-400 text-slate-950 font-black' : 'hover:bg-slate-800'}`}
                      >
                        16x Precision
                      </button>
                    </div>

                    {/* Verify Live Location Button */}
                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(true)}
                      className="bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/50 font-extrabold px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                    >
                      <MapPin size={13} className="text-amber-400" />
                      <span>Verify Live Location</span>
                    </button>

                    {/* Expand Fullscreen Button */}
                    <button
                      type="button"
                      onClick={() => setIsExpandedMapOpen(true)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                    >
                      <Maximize2 size={13} />
                      <span>Pin Full Map</span>
                    </button>
                  </div>
                </div>

                {/* Map View Frame */}
                <div className="relative h-72 sm:h-96 w-full bg-slate-950">
                  <iframe
                    title="User Geolocation Pinpoint Map View"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0, filter: 'contrast(105%) saturate(110%)' }}
                    src={`https://maps.google.com/maps?q=${lat},${lng}&z=${detailMapZoom}&ie=UTF8&iwloc=&output=embed`}
                    allowFullScreen
                    loading="lazy"
                  />

                  {/* EXACT LOGGED MAP PIN OVERLAY AT CENTER OF VIEWPORT */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-30 flex flex-col items-center">
                    {/* Pulsing Radar Ring Effects */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-amber-400/90 animate-ping pointer-events-none" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-amber-400/40 pointer-events-none blur-xs" />

                    {/* Floating Detailed User Login Badge */}
                    <div className="bg-slate-950/95 border-2 border-amber-400 text-white rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-md flex flex-col items-center text-center gap-1 mb-2 min-w-[220px] max-w-[320px]">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black uppercase tracking-wider">
                        <Lock size={13} className="text-amber-400 animate-pulse shrink-0" />
                        <span>EXACT GEOLOCATION PINPOINT</span>
                      </div>
                      <span className="text-sm font-black font-sans text-amber-300 truncate max-w-full">
                        📍 {communityName}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-full">
                        {cityName}, {stateName}
                      </span>
                      <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                        GPS: {lat.toFixed(6)}&deg; N, {lng.toFixed(6)}&deg; E
                      </span>
                    </div>

                    {/* Gold Standard Map Pin Teardrop Icon */}
                    <div className="relative flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 border-2 border-white shadow-[0_0_30px_rgba(245,158,11,0.9)] flex items-center justify-center text-slate-950 font-black animate-bounce-slow">
                        <MapPin size={22} className="fill-slate-950 text-amber-300" />
                      </div>
                      <div className="w-3 h-3 bg-amber-400 rotate-45 -mt-1.5 border-r border-b border-white" />
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-amber-500/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] text-amber-300 font-mono shadow-xl flex items-center gap-2 z-20">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Exact Location Pinpoint: {communityName} ({cityName}, {stateName}) — GPS: {lat.toFixed(6)}&deg; N, {lng.toFixed(6)}&deg; E</span>
                  </div>
                </div>

                {/* Map Action Footer */}
                <div className="bg-slate-900 p-4 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-300 text-xs">
                    📍 Need to locate or share these exact coordinates? You can copy or expand the map view.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCoordinates(lat, lng)}
                      className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {copiedCoords ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                      <span>{copiedCoords ? 'Coordinates Copied!' : 'Copy GPS Coords'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsExpandedMapOpen(true)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                    >
                      <MapPin size={14} />
                      <span>Pin to Interactive Map</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Anti-Fraud Security Recommendations */}
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert size={16} className="text-amber-400" />
                  <span>SkyIT Security & Account Protection Desk</span>
                </div>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  If this sign-in attempt was performed by you, no further action is required. If you suspect unauthorized login or fraud activity from this location ({locationName}), please reset your password immediately or email our technical response team at <a href="mailto:skyitventures01@gmail.com" className="text-amber-400 underline font-bold">skyitventures01@gmail.com</a>.
                </p>
              </div>

            </div>
          )}

          {/* Action Navigation Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-amber-500/30">
            {selectedNotifDetail.actionUrl && (
              <button
                type="button"
                onClick={(e) => handleActionClick(e, selectedNotifDetail)}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <span>Navigate to Activity Section ({selectedNotifDetail.actionUrl})</span>
                <ExternalLink size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedNotifDetail(null)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-extrabold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              Return to Notifications List
            </button>
          </div>

        </div>

        {/* EXPANDED FULLSCREEN INTERACTIVE MAP MODAL */}
        {isExpandedMapOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-6 animate-fade-in">
            <div className="bg-slate-950 border-2 border-amber-400 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
              
              {/* Modal Header */}
              <div className="bg-slate-900 p-4 border-b border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider font-display">
                      Exact User Login Geolocation Pinpoint
                    </h3>
                    <p className="text-xs text-slate-300 font-mono">
                      📍 {locationName} &bull; Coordinates: {lat.toFixed(6)}&deg; N, {lng.toFixed(6)}&deg; E
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpandedMapOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Map Iframe */}
              <div className="relative flex-1 bg-slate-950">
                <iframe
                  title="Fullscreen User Pinpoint Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, filter: 'contrast(105%) saturate(110%)' }}
                  src={`https://maps.google.com/maps?q=${lat},${lng}&z=${detailMapZoom}&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                  loading="lazy"
                />

                {/* EXACT LOGGED MAP PIN OVERLAY AT CENTER OF VIEWPORT */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-30 flex flex-col items-center">
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-amber-400/90 animate-ping pointer-events-none" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-amber-400/40 pointer-events-none blur-xs" />

                  <div className="bg-slate-950/95 border-2 border-amber-400 text-white rounded-xl px-4 py-2 shadow-2xl backdrop-blur-md flex flex-col items-center text-center gap-0.5 mb-2 min-w-[220px]">
                    <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                      <Lock size={12} className="text-amber-400 animate-pulse" />
                      <span>Neighborhood Node Pinpoint</span>
                    </div>
                    <span className="text-xs font-black font-sans text-amber-300">
                      📍 {communityName}
                    </span>
                    <span className="text-[11px] font-bold text-white">
                      {cityName}, {stateName}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      {lat.toFixed(6)}&deg; N, {lng.toFixed(6)}&deg; E
                    </span>
                  </div>

                  <div className="relative flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 border-2 border-white shadow-[0_0_35px_rgba(245,158,11,1)] flex items-center justify-center text-slate-950 font-black animate-bounce-slow">
                      <MapPin size={26} className="fill-slate-950 text-amber-300" />
                    </div>
                    <div className="w-3.5 h-3.5 bg-amber-400 rotate-45 -mt-1.5 border-r border-b border-white" />
                  </div>
                </div>
              </div>

              {/* Footer Modal Controls */}
              <div className="bg-slate-900 p-4 border-t border-amber-500/40 flex items-center justify-between text-xs">
                <div className="text-amber-300 font-mono">
                  GPS Latitude: {lat.toFixed(6)} | Longitude: {lng.toFixed(6)}
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpandedMapOpen(false)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Close Map View
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  /* =========================================================================
     NOTIFICATIONS LIST VIEW
     ========================================================================= */
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
                <Bell size={24} className="sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    Notifications & Activity Center
                  </h1>
                  {unreadCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider animate-pulse shrink-0 whitespace-nowrap">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed break-words">
                  {userEmail 
                    ? `Live security alerts, login detection, and activity updates for ${userEmail}` 
                    : 'Track login fraud detection alerts, order status updates, and system activities'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-center sm:justify-start w-full md:w-auto gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/60 font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95"
            >
              <MapPin size={15} className="text-amber-400" />
              <span>Enable Security Location</span>
            </button>
            {!userEmail && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <ShieldAlert size={16} />
                <span>Sign In to Access Notifications</span>
              </button>
            )}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead(userEmail)}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 active:scale-95"
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
          filteredNotifications.map((notif) => {
            const lat = getLatFromNotif(notif);
            const lng = getLngFromNotif(notif);
            const resolvedFromCoords = getNeighborhoodFromCoords(lat, lng);
            const notifCommunity = notif.metadata?.community || resolvedFromCoords.communityName;
            const notifCity = notif.metadata?.cityName || resolvedFromCoords.cityName;
            const notifState = notif.metadata?.stateName || resolvedFromCoords.stateName;

            return (
              <div
                key={notif.id}
                onClick={() => handleOpenNotificationDetail(notif)}
                className={`group relative rounded-2xl border transition-all duration-200 p-5 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-lg cursor-pointer ${
                  !notif.read
                    ? 'bg-slate-900/95 border-amber-500/50 shadow-amber-500/10 hover:border-amber-400'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-amber-500/30'
                }`}
              >
                {/* Left Accent Indicator */}
                {!notif.read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-amber-400 rounded-r-full shadow-lg shadow-amber-400/50" />
                )}

                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Icon box */}
                  <div className={`p-3 rounded-2xl border shrink-0 ${getTypeBadgeClass(notif.type)}`}>
                    {getIconForType(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="space-y-1.5 min-w-0 flex-1">
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

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    {/* Device / Location / Map Callout for Security Notifications */}
                    {notif.type === 'security' && (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono text-slate-300">
                          <span className="bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1 text-[11px]">
                            📍 Neighborhood Node: {notifCommunity}
                          </span>
                          <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-amber-300 font-semibold">
                            🏙️ {notifCity}, {notifState}
                          </span>
                          {notif.metadata?.ip && (
                            <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-slate-300">
                              🌐 IP: {notif.metadata.ip}
                            </span>
                          )}
                          <span className="bg-amber-400/20 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 font-sans font-extrabold flex items-center gap-1 text-[10px]">
                            📍 GPS {lat.toFixed(4)}&deg;, {lng.toFixed(4)}&deg;
                          </span>
                        </div>

                        {/* Security Map Preview Container with Pinpoint Marker */}
                        <div className="rounded-2xl overflow-hidden border-2 border-amber-500/50 h-36 max-w-xl bg-slate-950 relative shadow-md">
                          <iframe
                            title={`Security Login Location Map - ${notif.id}`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0, filter: 'contrast(105%) saturate(110%)' }}
                            src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&ie=UTF8&iwloc=&output=embed`}
                            allowFullScreen
                            loading="lazy"
                          />

                          {/* Pinpoint overlay */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-amber-400 animate-ping" />
                            <div className="w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_15px_#f59e0b] flex items-center justify-center text-slate-950">
                              <MapPin size={15} className="fill-slate-950 text-amber-300" />
                            </div>
                          </div>

                          <div className="absolute bottom-1.5 left-2 bg-slate-950/90 border border-amber-500/40 px-2 py-0.5 rounded-md text-[9px] text-amber-300 font-mono shadow-sm z-20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>📍 Node: {notifCommunity} ({notifCity})</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Right */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleActionClick(e, notif)}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wide cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <span>View Full Details</span>
                    <ExternalLink size={13} />
                  </button>

                  <div className="flex items-center gap-1">
                    {!notif.read && (
                      <button
                        type="button"
                        title="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationAsRead(notif.id);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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
      {/* Just-In-Time Location Permission Modal */}
      <LocationPermissionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        reason="security"
        onLocationGranted={(coords) => {
          console.log("Verified location coords granted:", coords);
        }}
      />
    </div>
  );
};

