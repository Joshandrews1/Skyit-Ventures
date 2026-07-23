import { db } from '../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export interface VisitLog {
  id: string;
  sessionId: string;
  timestamp: string; // ISO string
  page: string;
  device: 'mobile' | 'desktop' | 'tablet';
  referrer: string;
  cityName?: string;
  stateName?: string;
  communityName?: string;
}

// Generate or retrieve persistent Session ID for this browser tab/session
export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('skyit_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('skyit_session_id', sessionId);
  }
  return sessionId;
};

// Log a site visit event to Firestore
export const logSiteVisit = async (pageName: string = 'home'): Promise<void> => {
  try {
    const sessionId = getSessionId();
    const now = new Date();
    const userAgent = navigator.userAgent || '';
    
    let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    if (/iPad|tablet|PlayBook|Nexus 7|Nexus 10/i.test(userAgent)) {
      device = 'tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(userAgent)) {
      device = 'mobile';
    }

    const visitData = {
      sessionId,
      timestamp: now.toISOString(),
      page: pageName,
      device,
      referrer: document.referrer || 'direct'
    };

    // Save to Firestore 'site_visits' collection
    const visitsColRef = collection(db, 'site_visits');
    await addDoc(visitsColRef, visitData);

    // Also update a quick total counter in 'analytics_summary/visitors'
    const summaryRef = doc(db, 'analytics_summary', 'visitors');
    await setDoc(summaryRef, {
      lastVisitAt: now.toISOString(),
      totalLoggedVisits: (parseInt(localStorage.getItem('skyit_visit_count') || '0', 10) + 1)
    }, { merge: true });

    // Local storage count increment for offline tracking fallback
    const localCount = parseInt(localStorage.getItem('skyit_visit_count') || '0', 10);
    localStorage.setItem('skyit_visit_count', String(localCount + 1));
  } catch (err) {
    console.warn("Site visit logging notice:", err);
  }
};
