import React, { useState, useEffect } from 'react';
import { X, Upload, Lock, User, Image, Loader2, Trash2 } from 'lucide-react';
import { updateProfile, deleteUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

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

  // Initialize values when modal opens
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setPhotoBase64(currentUser.photoURL || null);
      setErrorMsg('');
      setSuccessMsg('');
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
