import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserNotification, NotificationType } from '../types';
import { getUserGeolocation, getUserGeolocationIfGranted, getAdminMatchedLocationForUser, getNeighborhoodFromCoords, fetchReverseGeocode } from './visitorTracker';

const LOCAL_NOTIFS_KEY = 'skyit_local_notifications';

// Helper to get notifications stored locally (for guests or instant offline display)
export function getLocalNotifications(): UserNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse local notifications", e);
    return [];
  }
}

// Helper to save notifications locally
export function saveLocalNotifications(notifs: UserNotification[]) {
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs.slice(0, 100)));
  } catch (e) {
    console.error("Failed to save local notifications", e);
  }
}

// Helper to clear local notifications on logout
export function clearLocalNotifications() {
  try {
    localStorage.removeItem(LOCAL_NOTIFS_KEY);
  } catch (e) {
    console.error("Failed to clear local notifications", e);
  }
}

// Helper to retrieve last recorded login metadata
export interface LastLoginInfo {
  timestamp: string;
  userEmail: string;
  displayName?: string;
  loginMethod: string;
  ip: string;
  locationName: string;
  lat: number;
  lng: number;
  userAgent?: string;
  deviceInfo?: string;
}

export function getStoredLastLogin(): LastLoginInfo | null {
  try {
    const raw = localStorage.getItem('skyit_last_login');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Dispatch login fraud detection notification email & create in-app notification
export async function dispatchLoginSecurityAlert(
  userEmail: string,
  displayName?: string,
  loginMethod?: string,
  userId?: string
) {
  if (!userEmail) return;

  const timestamp = new Date().toISOString();
  const notifId = `notif_login_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const browserInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser';

  // 1. Resolve Location & Geolocation Coordinates (matching Admin Analytics pinpoints)
  const adminMatched = getAdminMatchedLocationForUser(userEmail);
  let userIp = '102.89.23.14';
  let locationName = `${adminMatched.cityName}, ${adminMatched.stateName}`;
  let lat = adminMatched.lat;
  let lng = adminMatched.lng;

  try {
    const coords = await getUserGeolocationIfGranted();
    if (coords && coords.lat && coords.lng) {
      lat = coords.lat;
      lng = coords.lng;
    }

    const geoRes = await Promise.race([
      fetch('https://ipapi.co/json/').then(r => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Geo timeout')), 2500))
    ]) as any;

    if (geoRes && geoRes.city && geoRes.country_name) {
      locationName = `${geoRes.city}, ${geoRes.country_name}`;
      userIp = geoRes.ip || userIp;
      if (!coords && typeof geoRes.latitude === 'number' && typeof geoRes.longitude === 'number') {
        lat = geoRes.latitude;
        lng = geoRes.longitude;
      }
    }
  } catch (err) {
    console.log('[GEO_FETCH_FALLBACK] Using default location metadata for security alert.');
  }

  const resolvedNeighborhood = await fetchReverseGeocode(lat, lng);
  const communityName = resolvedNeighborhood.communityName;
  const cityName = resolvedNeighborhood.cityName;
  const stateName = resolvedNeighborhood.stateName;
  const fullLocationString = `${communityName}, ${cityName}, ${stateName}`;
  locationName = fullLocationString;

  const lastLoginData: LastLoginInfo = {
    timestamp,
    userEmail,
    displayName: displayName || '',
    loginMethod: loginMethod || 'Email Password Login',
    ip: userIp,
    locationName,
    lat,
    lng,
    userAgent: browserInfo
  };

  // Persist locally for immediate map UI rendering
  try {
    localStorage.setItem('skyit_last_login', JSON.stringify(lastLoginData));
  } catch (e) {
    console.warn("Could not set local last login:", e);
  }

  // Persist in Firestore user document if userId is available
  if (userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { lastLogin: lastLoginData }, { merge: true });
    } catch (dbErr) {
      console.warn("Firestore lastLogin update ignored:", dbErr);
    }
  }

  // 2. Dispatch Security Email Alert via Server Endpoint
  try {
    fetch('/api/auth/notify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        displayName: displayName || '',
        loginMethod: loginMethod || 'Account Login',
        userAgent: browserInfo,
        ip: userIp,
        location: locationName
      })
    }).catch(err => console.warn('[NOTIFY_LOGIN_FETCH_ERR]', err));
  } catch (err) {
    console.warn("Failed to invoke notify-login API:", err);
  }

  // 3. Create in-app notification object
  const newNotif: UserNotification = {
    id: notifId,
    userId: userId || '',
    userEmail: userEmail,
    title: '🔒 Security Alert: Account Login Detected',
    message: `A new login was recorded for ${userEmail} at ${communityName} (${cityName}, ${stateName}) from IP ${userIp} using ${loginMethod || 'credentials'}.`,
    type: 'security',
    read: false,
    createdAt: timestamp,
    metadata: {
      browser: browserInfo,
      location: fullLocationString,
      ip: userIp,
      lat,
      lng,
      community: communityName,
      cityName,
      stateName
    }
  };

  // Save to local storage for zero latency
  const currentLocal = getLocalNotifications();
  // Prevent duplicate login notifications within 5 minutes for same user
  const recentDuplicate = currentLocal.find(n => 
    n.userEmail === userEmail && 
    n.type === 'security' && 
    (Date.now() - new Date(n.createdAt).getTime()) < 300000
  );

  if (!recentDuplicate) {
    saveLocalNotifications([newNotif, ...currentLocal]);

    // Save to Firestore user_notifications collection
    try {
      const docRef = doc(db, 'user_notifications', notifId);
      await setDoc(docRef, newNotif);
    } catch (error) {
      console.warn("Firestore notification sync offline/fallback:", error);
    }
  }
}

// Create custom notification (e.g., for order updates, quotes, system alerts)
export async function createUserNotification(
  data: Omit<UserNotification, 'id' | 'createdAt' | 'read'>
): Promise<UserNotification> {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newNotif: UserNotification = {
    ...data,
    id: notifId,
    read: false,
    createdAt: new Date().toISOString()
  };

  // Save to Local Storage first
  const currentLocal = getLocalNotifications();
  saveLocalNotifications([newNotif, ...currentLocal]);

  // Save to Firestore
  try {
    const docRef = doc(db, 'user_notifications', notifId);
    await setDoc(docRef, newNotif);
  } catch (error) {
    console.warn("Firestore notification create error:", error);
  }

  return newNotif;
}

// Subscribe to realtime user notifications from Firestore + merge local
export function subscribeUserNotifications(
  userEmail: string,
  userId: string | undefined,
  onUpdate: (notifications: UserNotification[]) => void
): () => void {
  // If no authenticated user email or id, return empty array to protect user privacy
  if (!userEmail && !userId) {
    onUpdate([]);
    return () => {};
  }

  try {
    const notifsRef = collection(db, 'user_notifications');
    // Subscribe to query
    const q = query(notifsRef, where('userEmail', '==', userEmail));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentLocal = getLocalNotifications();
      const notifMap = new Map<string, UserNotification>();
      
      // Preserve local-only notifications that don't match this user's email
      currentLocal.forEach(n => {
        if (!n.userEmail || (n.userEmail && n.userEmail !== userEmail)) {
          notifMap.set(n.id, n);
        }
      });

      // Add active notifications from Firestore for this user
      snapshot.forEach(docSnap => {
        const notif = docSnap.data() as UserNotification;
        notifMap.set(notif.id, notif);
      });

      const combined = Array.from(notifMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      saveLocalNotifications(combined);
      onUpdate(combined);
    }, (error) => {
      console.warn("Firestore notification snapshot warning, falling back to local:", error);
      const currentLocal = getLocalNotifications();
      const filtered = currentLocal.filter(n => !n.userEmail || n.userEmail === userEmail || (userId && n.userId === userId));
      onUpdate(filtered);
    });

    return unsubscribe;
  } catch (err) {
    console.warn("Failed to subscribe user notifications:", err);
    const currentLocal = getLocalNotifications();
    const filtered = currentLocal.filter(n => !n.userEmail || n.userEmail === userEmail || (userId && n.userId === userId));
    onUpdate(filtered);
    return () => {};
  }
}

// Mark a single notification as read or unread
export async function markNotificationAsRead(notificationId: string, read: boolean = true) {
  const current = getLocalNotifications();
  const updated = current.map(n => n.id === notificationId ? { ...n, read } : n);
  saveLocalNotifications(updated);

  try {
    const docRef = doc(db, 'user_notifications', notificationId);
    await updateDoc(docRef, { read });
  } catch (e) {
    console.warn("Firestore markRead warning:", e);
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userEmail?: string) {
  const current = getLocalNotifications();
  const updated = current.map(n => {
    if (!userEmail || n.userEmail === userEmail) {
      return { ...n, read: true };
    }
    return n;
  });
  saveLocalNotifications(updated);

  if (userEmail) {
    try {
      const q = query(collection(db, 'user_notifications'), where('userEmail', '==', userEmail));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        if (!d.data().read) {
          await updateDoc(doc(db, 'user_notifications', d.id), { read: true }).catch(() => {});
        }
      });
    } catch (e) {
      console.warn("Firestore markAllRead warning:", e);
    }
  }
}

// Delete a notification
export async function deleteNotification(notificationId: string) {
  const current = getLocalNotifications();
  const updated = current.filter(n => n.id !== notificationId);
  saveLocalNotifications(updated);

  try {
    const docRef = doc(db, 'user_notifications', notificationId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn("Firestore deleteNotification warning:", e);
  }
}

// Clear all notifications for a user or guest
export async function clearAllNotifications(userEmail?: string) {
  const current = getLocalNotifications();
  const updated = userEmail ? current.filter(n => n.userEmail && n.userEmail !== userEmail) : [];
  saveLocalNotifications(updated);

  if (userEmail) {
    try {
      const q = query(collection(db, 'user_notifications'), where('userEmail', '==', userEmail));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await deleteDoc(doc(db, 'user_notifications', d.id)).catch(() => {});
      });
    } catch (e) {
      console.warn("Firestore clearAllNotifications warning:", e);
    }
  }
}
