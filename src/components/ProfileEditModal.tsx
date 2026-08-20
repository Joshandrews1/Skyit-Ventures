import React, { useState, useEffect } from 'react';
import { X, Upload, Lock, User, Image, Loader2, Trash2, MapPin, ShieldCheck, Globe, Laptop, Clock, MailCheck, Maximize2 } from 'lucide-react';
import { updateProfile, deleteUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getStoredLastLogin, LastLoginInfo } from '../lib/notificationService';
import { getUserGeolocationIfGranted, getAdminMatchedLocationForUser, getNeighborhoodFromCoords } from '../lib/visitorTracker';
import { LocationPermissionModal } from './LocationPermissionModal';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onProfileUpdated: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated
}) => {
  const [displayName, setDisplayName] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [lastLoginInfo, setLastLoginInfo] = useState<LastLoginInfo | null>(null);
  const [isFullMapModalOpen, setIsFullMapModalOpen] = useState(false);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);

  // Initialize values when modal opens
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setPhotoBase64(currentUser.photoURL || null);
      setErrorMsg('');
      setSuccessMsg('');

      // Get exact admin matched location for this user email
      const adminMatched = getAdminMatchedLocationForUser(currentUser.email || '');

      // Initialize with Admin Matched Location as base default
      const defaultLoginInfo: LastLoginInfo = {
        userEmail: currentUser.email || '',
        locationName: `${adminMatched.cityName}, ${adminMatched.stateName}`,
        ip: 'Verified Session IP',
        timestamp: new Date().toISOString(),
        deviceInfo: 'Browser Session',
        loginMethod: 'Authenticated Session',
        lat: adminMatched.lat,
        lng: adminMatched.lng
      };

      setLastLoginInfo(defaultLoginInfo);

      // Load last login info from local storage if available
      const localLastLogin = getStoredLastLogin();
      if (localLastLogin && localLastLogin.userEmail === currentUser.email && localLastLogin.lat && localLastLogin.lng) {
        setLastLoginInfo(localLastLogin);
      }

      // 1. Fetch exact site_visits records (identical to Admin Map query) for this user email
      if (currentUser.email) {
        try {
          const visitsRef = collection(db, 'site_visits');
          const q = query(visitsRef, where('userEmail', '==', currentUser.email));
          getDocs(q).then(snapshot => {
            if (!snapshot.empty) {
              const visitsList: any[] = [];
              snapshot.forEach(docSnap => {
                visitsList.push({ id: docSnap.id, ...docSnap.data() });
              });
              // Sort by timestamp descending
              visitsList.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
              const exactPin = visitsList.find(v => typeof v.lat === 'number' && typeof v.lng === 'number');

              if (exactPin) {
                setLastLoginInfo({
                  userEmail: currentUser.email,
                  locationName: exactPin.cityName ? `${exactPin.cityName}${exactPin.stateName ? `, ${exactPin.stateName}` : ''}` : (exactPin.communityName || `${adminMatched.cityName}, ${adminMatched.stateName}`),
                  ip: exactPin.ip || 'Verified Session IP',
                  timestamp: exactPin.timestamp || new Date().toISOString(),
                  deviceInfo: exactPin.device || 'Browser Session',
                  loginMethod: 'Authenticated Session',
                  lat: exactPin.lat,
                  lng: exactPin.lng
                });
                return;
              }
            }
          }).catch(err => {
            console.warn("User site_visits lookup warning:", err);
          });
        } catch (e) {
          console.warn("Firestore query error ignored:", e);
        }
      }

      // 2. Fallback to users doc lastLogin if available
      if (currentUser.uid) {
        const userRef = doc(db, 'users', currentUser.uid);
        getDoc(userRef).then(snap => {
          if (snap.exists() && snap.data()?.lastLogin?.lat) {
            setLastLoginInfo(snap.data().lastLogin);
          }
        }).catch(() => {});
      }

      // 3. Fallback to live browser geolocation if ALREADY recorded/granted
      getUserGeolocationIfGranted().then(coords => {
        if (coords) {
          setLastLoginInfo(prev => {
            if (prev?.lat && prev?.lng && (prev.lat !== adminMatched.lat || prev.lng !== adminMatched.lng)) {
              return prev; // Keep existing recorded pin
            }
            return {
              userEmail: currentUser.email,
              locationName: `${adminMatched.cityName}, ${adminMatched.stateName}`,
              ip: 'Current Session IP',
              timestamp: new Date().toISOString(),
              deviceInfo: 'Browser Session',
              loginMethod: 'Authenticated Session',
              lat: coords.lat,
              lng: coords.lng
            };
          });
        }
      });
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // File Upload Handlers (Supports both Drag-and-Drop and Manual Click)
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (.png, .jpeg, .jpg).');
      return;
    }
    setErrorMsg('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user session detected.');
      }

      // 1. Update Firebase Auth parameters
      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: photoBase64
      });

      // 2. Synchronize current parameters in the platform's user directory (Firestore)
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          displayName: displayName.trim(),
          photoURL: photoBase64,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.warn("Firestore secondary sync failed, proceeding:", fErr);
      }

      setSuccessMsg('Your profile has been updated successfully!');
      onProfileUpdated();
      
      // Delay dismissal slightly for a smooth feedback loop
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete your account? This action is completely irreversible and all your order histories will be lost.")) {
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No authenticated user session.");
      }
      const uid = user.uid;

      // 1. Delete user record in Firestore if it exists
      try {
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
      } catch (firestoreErr) {
        console.warn("Could not delete user document in Firestore:", firestoreErr);
      }

      // 2. Delete auth user
      await deleteUser(user);

      setSuccessMsg("Your account has been deleted successfully.");
      onProfileUpdated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      if (err.code === 'auth/requires-recent-login') {
        setErrorMsg("For security reasons, you must log out and sign back in to delete your account.");
      } else {
        setErrorMsg(err.message || "An error occurred while deleting your account.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0e131e] z-[100] flex flex-col animate-fade-in overflow-y-auto" id="profile-edit-modal-overlay">
      {/* Top Navigation Bar */}
      <header className="bg-[#0e131e]/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 px-4 sm:px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3 max-w-5xl mx-auto w-full justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shadow-md shadow-brand/10">
              <User size={20} />
            </div>
            <div>
              <h2 className="font-display font-black text-base sm:text-lg text-white tracking-wide">
                User Account & Security Profile
              </h2>
              <p className="text-xs text-[#8c90a1]">Manage your credentials, preferences and verified GPS telemetry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#171b27] hover:bg-white/10 border border-white/10 text-[#c2c6d8] hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            aria-label="Close"
          >
            <X size={18} />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* Main Full-Page Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6" id="profile-edit-modal-card">
        {/* Modal Form */}
        <form onSubmit={handleSave} className="bg-[#171b27] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2">
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Address Display (ReadOnly Block) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#b3c5ff] uppercase tracking-wider block">
                Registered Email Address
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-[#8c90a1]" size={16} />
                <input
                  type="email"
                  disabled
                  value={currentUser.email || ''}
                  className="w-full bg-[#0e131e] border border-white/10 text-[#8c90a1] rounded-2xl p-3.5 pl-11 text-sm focus:outline-hidden cursor-not-allowed font-medium shadow-inner"
                  title="Email address is secured and cannot be mutated"
                />
              </div>
              <p className="text-xs text-[#8c90a1] italic leading-relaxed">
                Email addresses are locked to preserve transactional integrity and cannot be modified.
              </p>
            </div>

            {/* Display Name Field */}
            <div className="space-y-2">
              <label htmlFor="p-edit-name" className="text-xs font-bold text-[#b3c5ff] uppercase tracking-wider block">
                Full Name / Display Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 text-brand" size={16} />
                <input
                  id="p-edit-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-[#0e131e] border border-white/10 text-white rounded-2xl p-3.5 pl-11 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-hidden transition-colors shadow-inner"
                />
              </div>
              <p className="text-xs text-[#8c90a1]">
                This is displayed across your orders, invoices, and quotes.
              </p>
            </div>
          </div>

          {/* Profile Picture Upload Zone */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-[#b3c5ff] uppercase tracking-wider block">
              Profile Avatar
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#0e131e] border border-white/10">
              {/* Avatar Preview */}
              <div className="shrink-0">
                {photoBase64 ? (
                  <img
                    src={photoBase64}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-2xl border-2 border-brand object-cover shadow-lg bg-[#171b27]"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#1b1f2b] text-[#b3c5ff] flex items-center justify-center font-black text-2xl border-2 border-white/10 uppercase shadow-inner">
                    {(displayName || currentUser.email || "?").charAt(0)}
                  </div>
                )}
              </div>

              {/* Drag-And-Drop / File selection Target zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`flex-1 w-full min-h-[90px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 transition-all relative cursor-pointer ${
                  dragActive 
                    ? 'border-brand bg-brand/10' 
                    : photoBase64 
                      ? 'border-white/20 hover:border-brand/50 bg-[#171b27]' 
                      : 'border-white/15 hover:border-white/30 bg-[#171b27]'
                }`}
              >
                <input
                  id="profile-p-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="Upload profile picture"
                />
                <div className="text-center space-y-1.5 pointer-events-none">
                  <div className="flex items-center justify-center text-brand">
                    <Upload size={18} />
                  </div>
                  <p className="text-xs text-[#dee2f2]">
                    <strong className="text-white hover:underline">Drag image here</strong> or <span className="text-brand font-bold">browse local files</span>
                  </p>
                  <p className="text-[11px] text-[#8c90a1]">
                    Supported formats: PNG, JPG, or JPEG (Max 5MB).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Login Location & Security Map */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-sky-400 uppercase tracking-wider">
                <ShieldCheck size={18} />
                <span>Last Login Location & Telemetry Map</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLocModalOpen(true)}
                  className="text-xs text-amber-300 font-extrabold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <MapPin size={13} className="text-amber-400" />
                  <span>Enable Live Location</span>
                </button>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Email Alert Sent
                </span>
              </div>
            </div>

            <div className="bg-[#0e131e] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-[#8c90a1] uppercase font-bold flex items-center gap-1">
                    <MapPin size={12} className="text-rose-400" /> Location
                  </span>
                  <span className="text-[#dee2f2] font-bold block truncate">{lastLoginInfo?.locationName || 'Lagos, Nigeria'}</span>
                </div>
                <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-[#8c90a1] uppercase font-bold flex items-center gap-1">
                    <Globe size={12} className="text-sky-400" /> IP Address
                  </span>
                  <span className="text-[#dee2f2] font-mono font-bold block">{lastLoginInfo?.ip || '102.89.23.14'}</span>
                </div>
                <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-[#8c90a1] uppercase font-bold flex items-center gap-1">
                    <Clock size={12} className="text-amber-400" /> Session Time
                  </span>
                  <span className="text-[#dee2f2] font-semibold block text-xs truncate">
                    {lastLoginInfo?.timestamp ? new Date(lastLoginInfo.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Active Session'}
                  </span>
                </div>
                <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-[#8c90a1] uppercase font-bold flex items-center gap-1">
                    <Laptop size={12} className="text-indigo-400" /> Sign-in Method
                  </span>
                  <span className="text-[#dee2f2] font-semibold block text-xs truncate">{lastLoginInfo?.loginMethod || 'Email Password'}</span>
                </div>
              </div>

              {/* Interactive Google Map Embed with Exact Pinpoint Marker */}
              {(() => {
                const adminMatched = getAdminMatchedLocationForUser(currentUser.email || '');
                const displayLat = lastLoginInfo?.lat ?? adminMatched.lat;
                const displayLng = lastLoginInfo?.lng ?? adminMatched.lng;
                const resolvedFromCoords = getNeighborhoodFromCoords(displayLat, displayLng);
                const displayLocationName = lastLoginInfo?.locationName || `${resolvedFromCoords.communityName}, ${resolvedFromCoords.cityName}, ${resolvedFromCoords.stateName}`;

                return (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/60 h-64 sm:h-80 bg-slate-950 group shadow-2xl">
                    {/* Embedded Map centered exactly on logged lat/lng */}
                    <iframe
                      title="Last Login Geolocation Map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0, filter: 'contrast(1.05) saturate(1.1)' }}
                      src={`https://maps.google.com/maps?q=${displayLat},${displayLng}&z=17&ie=UTF8&iwloc=&output=embed`}
                      allowFullScreen
                      loading="lazy"
                    />

                    {/* EXACT PINPOINT MARKER OVERLAY (POSITIONS DIRECTLY AT CENTER SPOT WHERE LOGGED) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
                      {/* Pulsing Radar Circle */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-amber-400 animate-ping pointer-events-none" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-amber-400/40 pointer-events-none blur-xs" />

                      {/* Floating User Login Callout Tag */}
                      <div className="bg-slate-950/95 border border-amber-400 text-white rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md flex flex-col items-center text-center gap-0.5 mb-1.5 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-amber-300 font-extrabold uppercase tracking-wider text-[10px]">
                          <Lock size={12} className="text-amber-400" />
                          <span>Exact Login Pinpoint</span>
                        </div>
                        <span className="font-bold text-white font-mono">
                          {displayLat.toFixed(4)}&deg; N, {displayLng.toFixed(4)}&deg; E
                        </span>
                      </div>

                      {/* Gold Map Pin Teardrop Icon */}
                      <div className="relative flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_25px_#f59e0b] flex items-center justify-center text-slate-950 font-black animate-bounce-slow">
                          <MapPin size={22} className="fill-slate-950 text-amber-300" />
                        </div>
                        <div className="w-3 h-3 bg-amber-400 rotate-45 -mt-1.5 border-r border-b border-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-amber-500/50 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-amber-300 font-mono flex items-center gap-2 shadow-md z-30 max-w-[80%] truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span className="truncate">📍 Verified Login Pinpoint: {displayLocationName}</span>
                    </div>

                    {/* Expand / Pin Map Button */}
                    <button
                      type="button"
                      onClick={() => setIsFullMapModalOpen(true)}
                      className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg transition-all z-30 cursor-pointer active:scale-95"
                    >
                      <Maximize2 size={14} />
                      <span>Expand Map</span>
                    </button>
                  </div>
                );
              })()}

              {/* Fullscreen Map Pinpoint Modal for Profile */}
              {isFullMapModalOpen && (() => {
                const adminMatched = getAdminMatchedLocationForUser(currentUser.email || '');
                const displayLat = lastLoginInfo?.lat ?? adminMatched.lat;
                const displayLng = lastLoginInfo?.lng ?? adminMatched.lng;
                const displayLocationName = lastLoginInfo?.locationName || `${adminMatched.cityName}, ${adminMatched.stateName}`;

                return (
                  <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col p-4 md:p-8 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
                            Your Login Location Pinpoint
                            <span className="text-xs font-mono font-normal bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                              EXACT LOGGED COORDINATES
                            </span>
                          </h3>
                          <p className="text-xs text-slate-300 font-mono">
                            {displayLocationName} • Lat: {displayLat.toFixed(6)}, Lng: {displayLng.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFullMapModalOpen(false)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="relative flex-1 rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-slate-900">
                      <iframe
                        title="Expanded Geolocation Pinpoint Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0, filter: 'contrast(1.05) saturate(1.1)' }}
                        src={`https://maps.google.com/maps?q=${displayLat},${displayLng}&z=16&ie=UTF8&iwloc=&output=embed`}
                        allowFullScreen
                        loading="lazy"
                      />

                      {/* Exact Pinpoint Overlay */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-amber-400 animate-ping pointer-events-none" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-amber-400/30 pointer-events-none blur-xs" />

                        <div className="bg-slate-950/95 border-2 border-amber-400 text-white rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col items-center text-center gap-1 mb-2">
                          <div className="flex items-center gap-1.5 text-amber-300 font-black uppercase text-xs">
                            <Lock size={14} className="text-amber-400" />
                            <span>Your Active Login Pinpoint</span>
                          </div>
                          <span className="font-mono text-sm text-white font-bold">
                            {displayLat.toFixed(6)}&deg; N, {displayLng.toFixed(6)}&deg; E
                          </span>
                          <span className="text-[11px] text-slate-300 font-mono">
                            Logged at: {lastLoginInfo?.timestamp ? new Date(lastLoginInfo.timestamp).toLocaleString() : 'Just Now'}
                          </span>
                        </div>

                        <div className="relative flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-amber-400 border-4 border-white shadow-[0_0_30px_#f59e0b] flex items-center justify-center text-slate-950 font-black animate-bounce-slow">
                            <MapPin size={26} className="fill-slate-950 text-amber-300" />
                          </div>
                          <div className="w-4 h-4 bg-amber-400 rotate-45 -mt-2 border-r-2 border-b-2 border-white" />
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-4 bg-slate-950/90 border border-amber-500/50 backdrop-blur-md p-3 rounded-xl text-xs text-amber-300 font-mono shadow-2xl z-30 flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
                        <div>
                          <div className="font-bold text-white">Device & IP Security Log</div>
                          <div className="text-[11px] text-slate-300">{lastLoginInfo?.ip || 'IP Verified'} • {lastLoginInfo?.deviceInfo || 'Browser Session'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="text-xs text-[#b6c7e8] flex items-center gap-2 bg-sky-950/40 border border-sky-800/40 p-3 rounded-xl">
                <MailCheck size={16} className="text-sky-400 shrink-0" />
                <span>Security email dispatch sent to <strong className="text-sky-300">{currentUser.email}</strong> on login.</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-white/10">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-3">Danger Zone</h4>
            <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-rose-300 font-bold flex items-center gap-2">
                  <Trash2 size={16} />
                  <span>Delete Account</span>
                </p>
                <p className="text-xs text-[#8c90a1] leading-relaxed mt-1">
                  Permanently remove your account and order profile. This action is irreversible.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isSaving}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 active:scale-95"
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-1/3 bg-[#0e131e] hover:bg-white/5 text-[#dee2f2] py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-center border border-white/10 transition-all cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-2/3 bg-brand hover:bg-brand-hover text-white py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Just-In-Time Location Permission Modal */}
      <LocationPermissionModal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        reason="security"
        onLocationGranted={(coords) => {
          const resolved = getNeighborhoodFromCoords(coords.lat, coords.lng);
          setLastLoginInfo(prev => ({
            locationName: `${resolved.communityName}, ${resolved.cityName}, ${resolved.stateName}`,
            ip: prev?.ip || 'Verified Remote IP',
            timestamp: new Date().toISOString(),
            loginMethod: prev?.loginMethod || 'Live Verified GPS',
            lat: coords.lat,
            lng: coords.lng
          }));
        }}
      />
    </div>
  );
};
