import React, { useState, useEffect } from 'react';
import { db, logAuditEvent } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Mail, 
  Key, 
  UserCheck, 
  Loader2, 
  CheckCircle, 
  CircleAlert, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Activity, 
  Users, 
  Clock, 
  FileCheck,
  Smartphone,
  Eye,
  AlertTriangle,
  Settings
} from 'lucide-react';

interface RoleUser {
  id: string; // Document ID (which is the uid)
  uid: string;
  email: string;
  role: 'admin' | 'editor';
  createdAt: string;
}

interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  details: string;
  targetId: string;
  targetType: 'order' | 'product' | 'role' | 'quote' | 'user' | 'system';
  timestamp: string;
}

interface PlatformUser {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastLoginAt: string;
}

interface RoleManagerProps {
  currentUserUid?: string;
  isUserAdmin?: boolean;
  isUserEditor?: boolean;
}

export const RoleManager: React.FC<RoleManagerProps> = ({ 
  currentUserUid,
  isUserAdmin = false,
  isUserEditor = false
}) => {
  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'audit' | 'users' | 'settings'>('roles');

  // Common Search and Feedback States
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  // System Settings States
  const [allowGuestCheckout, setAllowGuestCheckout] = useState<boolean>(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(true);

  // 1. Staff Privileges Collection States
  const [rolesUsers, setRolesUsers] = useState<RoleUser[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(true);
  const [targetUid, setTargetUid] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetRole, setTargetRole] = useState<'admin' | 'editor'>('editor');
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // 2. Immutable Audit Logs States
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('All');

  // 3. Platform Users States
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  // Copy UID notification helper
  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedId(uid);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // SUBSCRIPTION 1: Real-time Staff Roles Registry
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'admins'),
      (snapshot) => {
        const list: RoleUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            uid: data.uid || doc.id,
            email: data.email || '',
            role: data.role || 'editor',
            createdAt: data.createdAt || new Date().toISOString()
          });
        });
        // Sort: Admins first, then Editors
        list.sort((a, b) => {
          if (a.role === b.role) {
            return a.email.localeCompare(b.email);
          }
          return a.role === 'admin' ? -1 : 1;
        });
        setRolesUsers(list);
        setIsRolesLoading(false);
      },
      (err) => {
        console.error("Firestore error loading roles list:", err);
        setIsRolesLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // SUBSCRIPTION 2: Real-time Immutable Audit Logs
  useEffect(() => {
    if (activeSubTab !== 'audit') return;
    setIsAuditLoading(true);

    const unsub = onSnapshot(
      collection(db, 'audit_logs'),
      (snapshot) => {
        const list: AuditLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            actorUid: data.actorUid || 'unknown',
            actorEmail: data.actorEmail || 'unidentified-staff@skyit.com',
            action: data.action || 'GENERIC_ACTION',
            details: data.details || '',
            targetId: data.targetId || '',
            targetType: data.targetType || 'system',
            timestamp: data.timestamp || new Date().toISOString()
          });
        });

        // Hard sort latest timestamp first (newest entries first)
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(list);
        setIsAuditLoading(false);
      },
      (err) => {
        console.error("Firestore access error on audit_logs ledger:", err);
        setIsAuditLoading(false);
      }
    );
    return () => unsub();
  }, [activeSubTab]);

  // SUBSCRIPTION 3: Real-time Platform Registered Users Directory
  useEffect(() => {
    if (activeSubTab !== 'users') return;
    setIsUsersLoading(true);

    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: PlatformUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            uid: data.uid || doc.id,
            email: data.email || '',
            displayName: data.displayName || '',
            createdAt: data.createdAt || new Date().toISOString(),
            lastLoginAt: data.lastLoginAt || new Date().toISOString()
          });
        });

        // Sort latest active user connection first
        list.sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
        setPlatformUsers(list);
        setIsUsersLoading(false);
      },
      (err) => {
        console.error("Firestore user list loading bypassed:", err);
        setIsUsersLoading(false);
      }
    );
    return () => unsub();
  }, [activeSubTab]);

  // SUBSCRIPTION 4: Real-time System Settings (e.g., Guest Checkout switch)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'checkout'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.allowGuestCheckout === 'boolean') {
            setAllowGuestCheckout(data.allowGuestCheckout);
          }
        }
        setIsSettingsLoading(false);
      },
      (err) => {
        console.warn("Failed to subscribe to system settings doc:", err);
        setIsSettingsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleToggleGuestCheckout = async () => {
    try {
      const newValue = !allowGuestCheckout;
      await setDoc(doc(db, 'settings', 'checkout'), {
        allowGuestCheckout: newValue,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserUid || 'admin'
      }, { merge: true });

      await logAuditEvent(
        'TOGGLE_GUEST_CHECKOUT',
        'checkout',
        'system',
        `Guest checkout has been ${newValue ? 'ENABLED' : 'DISABLED'} by admin`
      );

      setFeedback({
        type: 'success',
        message: `Guest checkout access has been successfully ${newValue ? 'ENABLED' : 'DISABLED'}.`
      });
      setTimeout(() => setFeedback({ type: null, message: '' }), 4000);
    } catch (err: any) {
      console.error("Failed to update system settings:", err);
      setFeedback({
        type: 'error',
        message: `Failed to update settings: ${err.message}`
      });
    }
  };

  // Handle staff privileges commit (Granting / Editing)
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: null, message: '' });

    const cleanUid = targetUid.trim();
    const cleanEmail = targetEmail.trim().toLowerCase();

    if (!cleanUid || !cleanEmail) {
      setFeedback({ type: 'error', message: 'Both User UID and Email fields are required.' });
      return;
    }

    if (cleanUid.length < 5) {
      setFeedback({ type: 'error', message: 'User UID must be at least 5 characters long.' });
      return;
    }

    setIsFormSubmitting(true);
    try {
      const adminRef = doc(db, 'admins', cleanUid);
      await setDoc(adminRef, {
        uid: cleanUid,
        email: cleanEmail,
        role: targetRole,
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Write untamperable global audit trail event
      await logAuditEvent(
        'GRANT_STAFF_ROLE',
        cleanUid,
        'role',
        `Assigned/Updated privilege of ${cleanEmail} to ${targetRole.toUpperCase()}`
      );

      setFeedback({
        type: 'success',
        message: `Successfully granted ${targetRole.toUpperCase()} privilege level to ${cleanEmail}.`
      });

      setTargetUid('');
      setTargetEmail('');
      setTargetRole('editor');
    } catch (err: any) {
      console.error("Failed to write roles configuration:", err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Access authorization refused. Verify database security mappings.'
      });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Handle staff privileges revocation
  const handleRevokeAccess = async (uid: string, email: string) => {
    if (uid === currentUserUid) {
      setFeedback({
        type: 'error',
        message: 'Declassification Prevented: You cannot revoke your own administrator status.'
      });
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to revoke staff access privileges and delete access rights for: ${email}?`)) {
      return;
    }

    setFeedback({ type: null, message: '' });
    try {
      await deleteDoc(doc(db, 'admins', uid));

      // Append immutable audit log trail
      await logAuditEvent(
        'REVOKE_STAFF_ROLE',
        uid,
        'role',
        `Revoked staff login privileges completely from ${email}`
      );

      setFeedback({
        type: 'success',
        message: `Revoked access successfully for ${email}.`
      });
    } catch (err: any) {
      console.error("Revocation transaction failed:", err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Access revocation was refused by the database.'
      });
    }
  };

  // Action badge color mapper
  const getActionBadgeColor = (action: string) => {
    if (action.includes('GRANT_STAFF_ROLE')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (action.includes('REVOKE_STAFF_ROLE')) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (action.includes('DELETE')) return 'bg-red-50 text-red-600 border-red-200';
    if (action.includes('CREATE')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (action.includes('UPDATE')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Target type color mapper
  const getTargetTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'order': return 'bg-amber-100/70 text-amber-850';
      case 'product': return 'bg-sky-100/70 text-sky-850';
      case 'role': return 'bg-violet-100/70 text-violet-850';
      default: return 'bg-slate-100/70 text-slate-850';
    }
  };

  // Filtering Lists based on Queries
  const filteredRoles = rolesUsers.filter((u) => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      log.actorEmail.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.targetId.toLowerCase().includes(q);
    
    if (actionFilter === 'All') return matchesSearch;
    if (actionFilter === 'STAFF_ROLE') return matchesSearch && (log.action.includes('ROLE'));
    if (actionFilter === 'ORDER') return matchesSearch && (log.action.includes('ORDER'));
    if (actionFilter === 'PRODUCT') return matchesSearch && (log.action.includes('PRODUCT'));
    return matchesSearch;
  });

  const filteredPlatformUsers = platformUsers.filter((u) => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper Security Headers & Operations Dock Tabs */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="text-rose-500 fill-rose-500/10 animate-pulse" size={20} />
            <h2 className="text-base font-black tracking-wider uppercase">Forensic Command Hub</h2>
          </div>
          <p className="text-xs text-slate-300 leading-normal max-w-xl">
            Immutable operation ledger mapping, user directory tracking, and instant role-assignment parameters. Action logs are legally locked and irreversible.
          </p>
        </div>

        {/* Dynamic subtabs selectors */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-850 p-1 rounded-2xl border border-slate-800 max-w-fit">
          <button
            onClick={() => { setActiveSubTab('roles'); setSearchQuery(''); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'roles'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Shield size={12} />
            <span>Staff Privileges</span>
          </button>
          
          <button
            onClick={() => { setActiveSubTab('audit'); setSearchQuery(''); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'audit'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Activity size={12} />
            <span>Audit Logs Ledger</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('users'); setSearchQuery(''); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'users'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users size={12} />
            <span>Platform Users</span>
          </button>

          {isUserAdmin && (
            <button
              onClick={() => { setActiveSubTab('settings'); setSearchQuery(''); }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
                activeSubTab === 'settings'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings size={12} />
              <span>System Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Area */}
      {feedback.type && (
        <div className={`p-4 rounded-3xl border flex items-start gap-3 transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 animate-fadeIn' 
            : 'bg-rose-50 border-rose-200 text-rose-800 animate-fadeIn'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="shrink-0 text-emerald-650 mt-0.5" size={16} />
          ) : (
            <CircleAlert className="shrink-0 text-rose-650 mt-0.5" size={16} />
          )}
          <div className="text-xs font-bold leading-normal">
            <p>{feedback.message}</p>
          </div>
        </div>
      )}

      {/* TAB 1: STAFF ROLES MANAGER */}
      {activeSubTab === 'roles' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Role Configuration Creator */}
          <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-205 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="bg-brand/10 p-2 rounded-xl text-brand">
                <Shield size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Assign Access Rules</h3>
                <p className="text-[10px] text-slate-400 leading-tight">Elevate or override team log authorizations.</p>
              </div>
            </div>

            <form onSubmit={handleGrantAccess} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1">
                  <Key size={10} />
                  <span>Auth User UID *</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Paste their Auth UID"
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 font-mono text-[11px] rounded-xl p-2.5 focus:ring-1 focus:ring-brand focus:outline-hidden"
                />
                <span className="text-[9px] text-slate-400 leading-tight block">
                  Find the exact User UID below or on the <strong>Platform Users</strong> directory tab.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1">
                  <Mail size={10} />
                  <span>Licensed Email *</span>
                </label>
                <input 
                  type="email"
                  required
                  placeholder="e.g., administrator@skyit.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-xs rounded-xl p-2.5 focus:ring-1 focus:ring-brand focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1">
                  <Shield size={10} />
                  <span>Licensed Role Level *</span>
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as 'admin' | 'editor')}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wide rounded-xl p-2.5 focus:ring-1 focus:ring-brand focus:outline-hidden"
                >
                  <option value="editor">Editor (Delivery, Catalog & Proposals)</option>
                  <option value="admin">Administrator (Full Systems Override & Privilege Control)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isFormSubmitting}
                className="w-full bg-slate-900 hover:bg-[#1C1C1C] text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
              >
                {isFormSubmitting ? (
                  <Loader2 size={13} className="animate-spin text-white" />
                ) : (
                  <Plus size={13} />
                )}
                <span>Authorize Staff Privilege</span>
              </button>

            </form>

            <div className="bg-slate-50 p-3.5 border border-slate-150 rounded-2xl text-[10px] leading-relaxed text-slate-450 space-y-1.5 font-sans">
              <p className="font-bold uppercase text-slate-500">🛡️ SECURE CONFIGURATION NOTE:</p>
              <p>
                Database reads and updates are restricted under real-time custom <strong>Firestore Security Rules</strong>. No passwords or secret parameters are exposed to the browser.
              </p>
              <p>
                <strong>Editors:</strong> Have write access to update status, track updates, and manage catalog prices.
              </p>
              <p>
                <strong>Admins:</strong> Standard operations plus delete authorizations, logs auditing, and privilege revoke control.
              </p>
            </div>
          </div>

          {/* Right: Active Privilege List Container */}
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-205 shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Licensed Staff Registry</h3>
                <p className="text-[10px] text-slate-400 leading-tight">Currently, there are {rolesUsers.length} staff logs active.</p>
              </div>
              
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-3 text-slate-400" size={12} />
                <input 
                  type="text" 
                  placeholder="Search by Email/UID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-9 text-[11px] focus:ring-1 focus:ring-brand focus:outline-hidden text-slate-850"
                />
              </div>
            </div>

            {isRolesLoading ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw className="animate-spin text-rose-600 mx-auto" size={24} />
                <p className="text-xs text-slate-400 font-mono">Loading dynamic staff catalog...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-1 bg-slate-50 rounded-2xl border border-slate-150">
                <UserCheck size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No matching staff roles</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredRoles.map((user) => {
                  const isSelf = user.uid === currentUserUid;
                  return (
                    <div 
                      key={user.id}
                      className="p-4 rounded-2xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800">{user.email}</span>
                          {isSelf && (
                            <span className="bg-rose-100 text-rose-700 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                              You
                            </span>
                          )}
                          <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-sm tracking-wider leading-none text-white ${
                            user.role === 'admin' ? 'bg-rose-600' : 'bg-blue-600'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-150 max-w-fit truncate">
                          <span className="font-bold text-slate-400">UID:</span>
                          <span className="truncate max-w-[120px]">{user.uid}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyUid(user.uid)}
                            className="text-slate-400 hover:text-brand transition-colors"
                            title="Copy UID"
                          >
                            {copiedId === user.uid ? (
                              <Check size={10} className="text-emerald-500" />
                            ) : (
                              <Copy size={10} />
                            )}
                          </button>
                        </div>

                        <p className="text-[8.5px] text-slate-400">
                          Licensed on: {new Date(user.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleRevokeAccess(user.uid, user.email)}
                          className="text-[10px] text-slate-400 hover:text-red-600 font-bold uppercase tracking-wider border border-slate-250 hover:border-red-200 hover:bg-red-50 p-2 px-3 rounded-xl transition-all"
                        >
                          Revoke Access
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FORENSIC AUDIT LOGS LEDGER */}
      {activeSubTab === 'audit' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-205 shadow-3xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="text-rose-600" size={14} />
                <span>Tamper-Proof Audit Trail Ledger</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">
                Showing all actions performed by staff. These logs cannot be edited, deleted, or altered by anyone.
              </p>
            </div>

            {/* Controls Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-[10px] text-slate-400 font-black uppercase">Category</span>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none p-1 text-[11px]"
                >
                  <option value="All">All Operations</option>
                  <option value="ORDER">Orders Only</option>
                  <option value="PRODUCT">Products Catalog Only</option>
                  <option value="STAFF_ROLE">Privileges & Roles</option>
                </select>
              </div>

              {/* Text Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                <input 
                  type="text" 
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-205 rounded-xl p-2 pl-9 text-[11px] focus:ring-1 focus:ring-brand focus:outline-hidden text-slate-850"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table Rendering */}
          {isAuditLoading ? (
            <div className="p-20 text-center space-y-3">
              <RefreshCw className="animate-spin text-rose-600 mx-auto" size={24} />
              <p className="text-xs text-slate-400 font-mono">Scanning irreversible transaction blocks...</p>
            </div>
          ) : filteredAuditLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-1 bg-slate-50 rounded-2xl border border-slate-150">
              <FileCheck size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">No Auditable Transactions Found</p>
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                No logs met the current filter. Staff updates, prices edits, and order cancellations trigger permanent receipts instantly.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-slate-50/20">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-150 text-[10px] text-slate-450 uppercase font-black tracking-wider">
                    <th className="p-3.5 pl-4">Timestamp (Local)</th>
                    <th className="p-3.5">Actor (Staff Account)</th>
                    <th className="p-3.5">Action Code</th>
                    <th className="p-3.5">Details Description</th>
                    <th className="p-3.5 pr-4">Related ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-100/50 transition-colors">
                      {/* Timestamp */}
                      <td className="p-3.5 pl-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="p-3.5 font-bold text-slate-800">
                        <div className="max-w-[150px] truncate" title={log.actorUid}>
                          <p>{log.actorEmail}</p>
                          <p className="text-[8px] font-mono text-slate-405 font-light">UID: {log.actorUid.substring(0, 10)}...</p>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded-sm ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Details Description */}
                      <td className="p-3.5 text-slate-600 max-w-xs md:max-w-md break-words font-medium leading-relaxed">
                        {log.details}
                      </td>

                      {/* Related Target ID */}
                      <td className="p-3.5 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`px-1 rounded-sm text-[8px] font-extrabold uppercase ${getTargetTypeBadgeColor(log.targetType)}`}>
                            {log.targetType}
                          </span>
                          <span className="font-mono text-[9px] text-slate-450 bg-white px-1.5 py-0.5 rounded border border-slate-150 truncate max-w-[80px]" title={log.targetId}>
                            {log.targetId.substring(0, 8)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUid(log.targetId)}
                            className="text-slate-400 hover:text-brand transition-colors inline-block"
                            title="Copy full correlation id"
                          >
                            {copiedId === log.targetId ? (
                              <Check size={9} className="text-emerald-500" />
                            ) : (
                              <Copy size={9} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PLATFORM REGISTERED USERS DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-205 shadow-3xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Users size={14} className="text-blue-600" />
                <span>Registered Platform Users Directory</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">
                This indexing records logins, name metadata and authentication tokens from Firebase. Currently displaying {platformUsers.length} profiles.
              </p>
            </div>

            {/* Filter Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-3 text-slate-400" size={12} />
              <input 
                type="text" 
                placeholder="Search clients by Name/Email/UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-9 text-[11px] focus:ring-1 focus:ring-brand text-slate-850"
              />
            </div>
          </div>

          {/* User Cards Grid */}
          {isUsersLoading ? (
            <div className="p-20 text-center space-y-3">
              <RefreshCw className="animate-spin text-rose-600 mx-auto" size={24} />
              <p className="text-xs text-slate-400 font-mono">Gathering active user records...</p>
            </div>
          ) : filteredPlatformUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-1 bg-slate-50 rounded-2xl border border-slate-150">
              <Users size={30} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">No Customers Found</p>
              <p className="text-[10px] text-slate-400">No registration met your filter keywords.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlatformUsers.map((user) => {
                return (
                  <div 
                    key={user.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 transition-all flex flex-col justify-between gap-3 space-y-1"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100 shrink-0">
                          <Users size={16} />
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-150 max-w-[140px] truncate">
                          <span className="font-extrabold text-slate-400">UID:</span>
                          <span className="truncate">{user.uid}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyUid(user.uid)}
                            className="text-slate-400 hover:text-brand transition-colors inline-block"
                            title="Copy UID token"
                          >
                            {copiedId === user.uid ? (
                              <Check size={9} className="text-emerald-500" />
                            ) : (
                              <Copy size={9} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-800 truncate" title={user.displayName}>
                          {user.displayName || <span className="text-slate-400 italic font-medium">No display name configured</span>}
                        </h4>
                        <p className="text-[10.5px] font-bold text-slate-500 truncate" title={user.email}>
                          {user.email || <span className="text-slate-400 italic font-medium">Anonymous Guest Account</span>}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-150 pt-2 text-[9px] text-slate-400 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium tracking-wide">First Detected:</span>
                        <span className="font-mono">{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-650 font-bold">
                        <span className="font-semibold">Last Login Time:</span>
                        <span className="font-mono text-[8.5px]">{new Date(user.lastLoginAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SYSTEM SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-3xs space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="bg-rose-50 text-rose-600 p-2.5 rounded-2xl border border-rose-100">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Global Shop Control Parameters</h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                Configure universal website logic, purchase pathways and accessibility bounds.
              </p>
            </div>
          </div>

          {isSettingsLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="animate-spin text-rose-600 mx-auto" size={20} />
              <p className="text-xs text-slate-400 font-mono">Fetching active control state...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card 1: Guest Checkout Policy */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Allow Guest Checkout & Purchase</span>
                    <span className={`px-2 py-0.5 text-[8px] rounded-full uppercase tracking-widest font-black ${
                      allowGuestCheckout 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {allowGuestCheckout ? 'Active' : 'Disabled'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    When **activated**, unregistered guests are allowed to fill details and place solar orders. 
                    When **deactivated**, guest purchase logic is blocked; visitors are strictly required to log in or register before completing checkouts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleGuestCheckout}
                  className={`shrink-0 w-14 h-7 rounded-full p-1 transition-colors duration-250 focus:outline-hidden relative ${
                    allowGuestCheckout ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Guest Checkout"
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-250 absolute top-1 ${
                    allowGuestCheckout ? 'left-8' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Information Alert */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex gap-3 text-blue-850">
                <AlertTriangle className="shrink-0 text-blue-600 mt-0.5" size={16} />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5">Admin Security Protocol</p>
                  <p>
                    Changing this policy updates the client-side cart validation rules immediately. Any change is appended to the Forensic Command Hub logs trail for tracking purposes. Editors cannot access this setting.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
