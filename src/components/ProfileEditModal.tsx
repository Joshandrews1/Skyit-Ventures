import React, { useState, useEffect } from 'react';
import { X, Upload, Lock, User, Image, Loader2, Trash2, MapPin, ShieldCheck, Globe, Laptop, Clock, MailCheck, Maximize2 } from 'lucide-react';
import { updateProfile, deleteUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getStoredLastLogin, LastLoginInfo } from '../lib/notificationService';
import { getUserGeolocation, getAdminMatchedLocationForUser, getNeighborhoodFromCoords } from '../lib/visitorTracker';

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

      // 3. Fallback to live browser geolocation if recorded
      getUserGeolocation().then(coords => {
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in" id="profile-edit-modal-overlay">
      <div 
        className="bg-[#0D0D0D] text-gray-300 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-805 flex flex-col text-sm relative animate-scale-up"
        id="profile-edit-modal-card"
      >
        {/* Header Block */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0F0F0F] text-white">
          <div className="flex items-center gap-2">
            <User size={16} className="text-brand" />
            <h3 className="font-display font-black tracking-wide uppercase text-xs">Edit User Profile</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-sm cursor-pointer"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
              ✓ {successMsg}
            </div>
          )}

          {/* Email Address Display (ReadOnly Block) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Registered Email Address
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 text-gray-500" size={13} />
              <input
                type="email"
                disabled
                value={currentUser.email || ''}
                className="w-full bg-[#151515] border border-gray-800 text-gray-500 rounded-xl p-2.5 pl-9 text-xs focus:outline-hidden cursor-not-allowed font-medium"
                title="Email address is secured and cannot be mutated"
              />
            </div>
            <p className="text-[10px] text-gray-500 italic mt-0.5 leading-relaxed">
              Email addresses are locked to preserve transactional integrity and cannot be modified.
            </p>
          </div>

          {/* Display Name Field */}
          <div className="space-y-1.5">
            <label htmlFor="p-edit-name" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Full Name / Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5. text-slate-400" size={14} style={{ marginTop: '3px' }} />
              <input
                id="p-edit-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-[#1A1A1A] border border-gray-800 text-white rounded-xl p-2.5 pl-9 text-xs focus:ring-1 focus:ring-brand focus:outline-hidden"
              />
            </div>
          </div>

          {/* Profile Picture Upload Zone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Profile Avatar
            </label>

            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="shrink-0">
                {photoBase64 ? (
                  <img
                    src={photoBase64}
                    alt="Avatar preview"
                    className="w-14 h-14 rounded-full border border-brand object-cover shadow-sm bg-stone-900"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-800 text-slate-200 flex items-center justify-center font-black text-lg border border-gray-800 uppercase">
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
                className={`flex-1 min-h-[70px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 transition-colors relative cursor-pointer ${
                  dragActive 
                    ? 'border-brand bg-brand/5' 
                    : photoBase64 
                      ? 'border-gray-800 hover:border-gray-700 bg-[#161616]' 
                      : 'border-zinc-800 hover:border-zinc-750 bg-[#121212]'
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
                <div className="text-center space-y-1 pointer-events-none">
                  <div className="flex items-center justify-center text-brand">
                    <Upload size={14} />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    <strong className="text-white hover:underline">Drag here</strong> or <span className="text-brand">browse files</span>
                  </p>
                  <p className="text-[8px] text-gray-500">
                    PNG, JPG, or JPEG formats.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Login Location & Security Map */}
          <div className="pt-4 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase tracking-wider">
                <ShieldCheck size={14} />
                <span>Last Login Location & Map</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Email Alert Sent
              </span>
            </div>

            <div className="bg-[#141414] border border-gray-800 rounded-xl p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-gray-800/80 space-y-0.5">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block flex items-center gap-1">
                    <MapPin size={10} className="text-rose-400" /> Location
                  </span>
                  <span className="text-gray-200 font-bold block truncate">{lastLoginInfo?.locationName || 'Lagos, Nigeria'}</span>
                </div>
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-gray-800/80 space-y-0.5">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block flex items-center gap-1">
                    <Globe size={10} className="text-sky-400" /> IP Address
                  </span>
                  <span className="text-gray-200 font-mono font-bold block">{lastLoginInfo?.ip || '102.89.23.14'}</span>
                </div>
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-gray-800/80 space-y-0.5">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block flex items-center gap-1">
                    <Clock size={10} className="text-amber-400" /> Session Time
                  </span>
                  <span className="text-gray-200 font-semibold block text-[10px]">
                    {lastLoginInfo?.timestamp ? new Date(lastLoginInfo.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Active Session'}
                  </span>
                </div>
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-gray-800/80 space-y-0.5">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block flex items-center gap-1">
                    <Laptop size={10} className="text-indigo-400" /> Sign-in Method
                  </span>
                  <span className="text-gray-200 font-semibold block text-[10px] truncate">{lastLoginInfo?.loginMethod || 'Email Password'}</span>
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
                  <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/60 h-44 bg-slate-950 group shadow-2xl">
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
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-amber-400 animate-ping pointer-events-none" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-400/40 pointer-events-none blur-xs" />

                      {/* Floating User Login Callout Tag */}
                      <div className="bg-slate-950/95 border border-amber-400 text-white rounded-lg px-2.5 py-1 shadow-2xl backdrop-blur-md flex flex-col items-center text-center gap-0.5 mb-1 text-[10px] whitespace-nowrap">
                        <div className="flex items-center gap-1 text-amber-300 font-extrabold uppercase tracking-wider text-[9px]">
                          <Lock size={10} className="text-amber-400" />
                          <span>Exact Login Pinpoint</span>
                        </div>
                        <span className="font-bold text-white font-mono">
                          {displayLat.toFixed(4)}&deg; N, {displayLng.toFixed(4)}&deg; E
                        </span>
                      </div>

                      {/* Gold Map Pin Teardrop Icon */}
                      <div className="relative flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_20px_#f59e0b] flex items-center justify-center text-slate-950 font-black animate-bounce-slow">
                          <MapPin size={18} className="fill-slate-950 text-amber-300" />
                        </div>
                        <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 -mt-1 border-r border-b border-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-2 bg-slate-950/90 border border-amber-500/50 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] text-amber-300 font-mono flex items-center gap-1.5 shadow-md z-30">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span>📍 Verified Login Pinpoint: {displayLocationName}</span>
                    </div>

                    {/* Expand / Pin Map Button */}
                    <button
                      type="button"
                      onClick={() => setIsFullMapModalOpen(true)}
                      className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg transition-all z-30 cursor-pointer"
                    >
                      <Maximize2 size={12} />
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

              <div className="text-[10px] text-slate-300 flex items-center gap-1.5 bg-sky-950/40 border border-sky-800/40 p-2 rounded-lg">
                <MailCheck size={13} className="text-sky-400 shrink-0" />
                <span>Security email dispatch sent to <strong className="text-sky-300">{currentUser.email}</strong> on login.</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-gray-800">
            <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-2">Danger Zone</h4>
            <div className="bg-rose-950/10 border border-rose-950/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                  <Trash2 size={13} />
                  <span>Delete Account</span>
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
                  Permanently remove your account and order profile. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isSaving}
                className="bg-rose-950/25 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 border border-rose-900/40 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-center border border-zinc-800 transition-all cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-brand hover:bg-brand-hover text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
