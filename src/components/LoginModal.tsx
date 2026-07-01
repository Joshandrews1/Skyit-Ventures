import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  db,
  signInWithGoogle
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any, isAdmin: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetSentEmail, setResetSentEmail] = useState('');

  // Reset errors when modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real Email & Password Login / Registration Flow
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (mode === 'forgot') {
      setIsAuthorizing(true);
      setErrorMessage('');
      setSuccessMessage('');
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setResetSentEmail(cleanEmail);
        setSuccessMessage(`A password reset link has been successfully sent to ${cleanEmail}. Please check your inbox.`);
        setPassword('');
      } catch (err: any) {
        console.error("Password reset failed:", err);
        let friendlyError = err.message;
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          friendlyError = "No registered account found with this email address.";
        } else if (err.code === 'auth/invalid-email') {
          friendlyError = "The format of the email address is invalid.";
        }
        setErrorMessage(friendlyError);
      } finally {
        setIsAuthorizing(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setErrorMessage("Please enter your name to create an account.");
      return;
    }

    setIsAuthorizing(true);
    setErrorMessage('');

    try {
      let user;
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        user = result.user;
        await updateProfile(user, { displayName: name.trim() });
      } else {
        const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
        user = result.user;
      }

      const isAdminUser = user.email === 'jeemestore@gmail.com';
      if (isAdminUser) {
        try {
          const adminRef = doc(db, 'admins', user.uid);
          await setDoc(adminRef, {
            uid: user.uid,
            email: user.email,
            role: 'admin',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.error("Admin Firestore registration notice:", dbErr);
        }
      }

      onLoginSuccess(user, isAdminUser);
      onClose();
    } catch (err: any) {
      console.error("Email authentication failed:", err);
      let friendlyError = err.message;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        friendlyError = "Invalid email or matching password credentials.";
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyError = "This email is already associated with an account.";
      } else if (err.code === 'auth/weak-password') {
        friendlyError = "Password must be at least 6 characters long.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "The format of the email address is invalid.";
      }
      setErrorMessage(friendlyError);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Real Google Sign In Flow as alternative helper
  const handleGoogleSignIn = async () => {
    setIsAuthorizing(true);
    setErrorMessage('');

    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      const isAdminUser = user.email === 'jeemestore@gmail.com';
      if (isAdminUser) {
        try {
          const adminRef = doc(db, 'admins', user.uid);
          await setDoc(adminRef, {
            uid: user.uid,
            email: user.email,
            role: 'admin',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.error("Admin Google integration register warning:", dbErr);
        }
      }

      onLoginSuccess(user, isAdminUser);
      onClose();
    } catch (err: any) {
      console.error("Google authentication failed:", err);
      setErrorMessage(err?.message || "Google Sign-In failed.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="login-modal-overlay">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl relative border border-slate-200 flex flex-col text-slate-700 animate-scale-up" id="login-modal-card">
        
        {/* Header bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
          <div className="flex items-center gap-2">
            <div className="p-0.5 rounded-lg border border-slate-100 flex items-center justify-center bg-white shadow-2xs w-7 h-7">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
                alt="SkyIT Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h3 className="font-display font-bold text-sm text-slate-900 tracking-tight ml-1">
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-450 hover:text-slate-700 transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Main Content Form */}
        <form onSubmit={handleEmailAuthSubmit} className="p-6 space-y-4" id="login-body">
          
          {/* Centered Logo block */}
          <div className="flex flex-col items-center justify-center pb-4 pt-1 border-b border-slate-100">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae" 
              alt="SkyIT Logo" 
              className="h-10 w-auto object-contain mb-1.5"
              referrerPolicy="no-referrer"
            />
            <p className="text-[9px] uppercase font-black tracking-widest text-brand font-display">Solar & Security Solutions</p>
          </div>
          

          {successMessage && !resetSentEmail && (
            <div className="text-emerald-700 text-[11px] font-semibold p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              ✅ {successMessage}
            </div>
          )}

          {mode === 'forgot' && resetSentEmail ? (
            <div className="space-y-4 py-2 animate-fadeIn text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <Mail size={22} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Reset Link Dispatched</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  We have requested Firebase to send a secure credential recovery link to:
                </p>
                <div className="bg-slate-50 py-2 px-3 border border-slate-200 rounded-lg max-w-xs mx-auto">
                  <span className="font-mono text-xs font-bold text-brand">{resetSentEmail}</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-800">
                  <span>⚠️ Password Reset Troubleshooting Checklist</span>
                </p>
                <ul className="text-[10px] space-y-1.5 list-disc pl-4 leading-normal text-slate-600">
                  <li>
                    <strong className="text-amber-800">Check Spam & Junk Folders:</strong> Automated emails from <code className="text-brand font-mono text-[9px]">noreply@...</code> are often misclassified by email providers.
                  </li>
                  <li>
                    <strong className="text-amber-800">Verify Account Email Presence:</strong> For security against hackers (Email Enumeration Protection), Firebase always returns a success status even if the email is not registered on the platform. Please verify that you signed up with this exact address.
                  </li>
                  <li>
                    <strong className="text-amber-800">Check Connected Accounts:</strong> If you registered using Google SSO ("Continue with Google"), a standard password reset link will not be applicable. Try signing in via Google.
                  </li>
                </ul>
              </div>

              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setResetSentEmail('');
                    setSuccessMessage('');
                    setErrorMessage('');
                  }}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Return to Sign In Screen
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsAuthorizing(true);
                    setErrorMessage('');
                    try {
                      await sendPasswordResetEmail(auth, resetSentEmail);
                      setSuccessMessage(`A new password reset link has been successfully sent to ${resetSentEmail}. Please check your inbox.`);
                    } catch (err: any) {
                      setErrorMessage(err.message);
                    } finally {
                      setIsAuthorizing(false);
                    }
                  }}
                  disabled={isAuthorizing}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer"
                >
                  {isAuthorizing ? "Re-sending Link..." : "Re-send Reset Link"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block font-mono" htmlFor="signup-name">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <User size={14} />
                    </span>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-medium placeholder-slate-450"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block font-mono" htmlFor="login-email">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Mail size={14} />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. you@example.com"
                    className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-medium placeholder-slate-450"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block font-mono" htmlFor="login-password">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMessage('');
                          setSuccessMessage('');
                        }}
                        className="text-[10px] text-slate-400 hover:text-brand font-bold transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white focus:outline-hidden transition-all font-mono placeholder-slate-450"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-650 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="text-rose-700 text-[11px] font-semibold p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-center leading-normal">
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthorizing}
                className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer mt-4 active:scale-98"
              >
                {isAuthorizing ? (
                  <span>Processing secure credentials...</span>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
                    <ArrowRight size={13} strokeWidth={2.5} />
                  </>
                )}
              </button>

              {/* Toggle switcher option */}
              <div className="text-center pt-1.5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'forgot') {
                      setMode('signin');
                    } else {
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                    }
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-brand hover:text-brand-hover tracking-wide font-bold hover:underline transition-colors cursor-pointer"
                >
                  {mode === 'forgot'
                    ? "Back to Sign In"
                    : mode === 'signin' 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"}
                </button>
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase font-black tracking-widest font-mono">
                  Or
                </span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* Clean Google SSO Alternate trigger */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isAuthorizing}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}

        </form>
      </div>
    </div>
  );
};
