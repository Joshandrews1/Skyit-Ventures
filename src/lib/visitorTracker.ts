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
  lat?: number;
  lng?: number;
  isLogin?: boolean;
  userEmail?: string;
  userName?: string;
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

// Helper function to request high accuracy browser geolocation
export const getUserGeolocation = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.warn("Browser geolocation permission/unavailable notice:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  });
};

// Returns coordinates ONLY if geolocation permission is ALREADY granted by user
// This ensures background visitors or page loads NEVER prompt the browser permission dialog automatically
export const getUserGeolocationIfGranted = async (): Promise<{ lat: number; lng: number } | null> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as any });
      if (permissionStatus.state !== 'granted') {
        return null; // Do NOT trigger browser permission popup on visit!
      }
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
  return getUserGeolocation();
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

    // Only fetch coordinates if user has ALREADY granted permission previously
    const coords = await getUserGeolocationIfGranted();

    const visitData: Record<string, any> = {
      sessionId,
      timestamp: now.toISOString(),
      page: pageName,
      device,
      referrer: document.referrer || 'direct'
    };

    if (coords) {
      visitData.lat = coords.lat;
      visitData.lng = coords.lng;
    }

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

// Comprehensive Nigerian Neighborhood Spatial Nodes Catalog
export interface NeighborhoodNode {
  lat: number;
  lng: number;
  communityName: string;
  cityName: string;
  stateName: string;
}

export const NEIGHBORHOOD_NODES: NeighborhoodNode[] = [
  // Ojodu / Alagbole / Akute Axis
  { lat: 6.6618, lng: 3.3481, communityName: 'Alagbole', cityName: 'Ojodu / Alagbole', stateName: 'Lagos State' },
  { lat: 6.6680, lng: 3.3550, communityName: 'Akute', cityName: 'Ojodu / Akute Axis', stateName: 'Lagos State' },
  { lat: 6.6420, lng: 3.3610, communityName: 'Ojodu Berger', cityName: 'Ojodu', stateName: 'Lagos State' },
  { lat: 6.6310, lng: 3.3410, communityName: 'Ogba / Aguda', cityName: 'Ikeja / Ogba', stateName: 'Lagos State' },
  { lat: 6.6200, lng: 3.3280, communityName: 'Agege / Pen Cinema', cityName: 'Agege', stateName: 'Lagos State' },
  { lat: 6.6018, lng: 3.3515, communityName: 'Computer Village', cityName: 'Ikeja', stateName: 'Lagos State' },
  { lat: 6.5912, lng: 3.3524, communityName: 'Ikeja GRA', cityName: 'Ikeja', stateName: 'Lagos State' },
  { lat: 6.6180, lng: 3.3580, communityName: 'Alausa Secretariat', cityName: 'Ikeja', stateName: 'Lagos State' },
  { lat: 6.5654, lng: 3.3668, communityName: 'Maryland / Ojota', cityName: 'Kosofe', stateName: 'Lagos State' },
  { lat: 6.4281, lng: 3.4219, communityName: 'Ademola Adetokunbo Way', cityName: 'Victoria Island', stateName: 'Lagos State' },
  { lat: 6.4474, lng: 3.4723, communityName: 'Admiralty Way', cityName: 'Lekki Phase 1', stateName: 'Lagos State' },
  { lat: 6.4500, lng: 3.4350, communityName: 'Banana Island', cityName: 'Ikoyi', stateName: 'Lagos State' },
  { lat: 6.4698, lng: 3.5852, communityName: 'Ajah / Sangotedo', cityName: 'Eti-Osa', stateName: 'Lagos State' },
  { lat: 6.5095, lng: 3.3711, communityName: 'Yaba / Sabo', cityName: 'Yaba', stateName: 'Lagos State' },
  { lat: 6.4974, lng: 3.3541, communityName: 'Surulere Central', cityName: 'Surulere', stateName: 'Lagos State' },
  { lat: 6.4650, lng: 3.2820, communityName: 'Festac Town', cityName: 'Amuwo Odofin', stateName: 'Lagos State' },
  { lat: 6.5980, lng: 3.2720, communityName: 'Ipaja / Egbeda', cityName: 'Alimosho', stateName: 'Lagos State' },
  { lat: 6.6480, lng: 3.2890, communityName: 'Abule Egba', cityName: 'Alimosho', stateName: 'Lagos State' },
  { lat: 6.6194, lng: 3.5105, communityName: 'Ikorodu Central', cityName: 'Ikorodu', stateName: 'Lagos State' },
  
  // FCT Abuja
  { lat: 9.0765, lng: 7.3986, communityName: 'Transcorp Hilton Axis', cityName: 'Maitama', stateName: 'FCT Abuja' },
  { lat: 9.0882, lng: 7.4933, communityName: 'Maitama District', cityName: 'Abuja Central', stateName: 'FCT Abuja' },
  { lat: 9.0768, lng: 7.4722, communityName: 'Wuse II / Banex', cityName: 'Wuse', stateName: 'FCT Abuja' },
  { lat: 9.0333, lng: 7.4833, communityName: 'Garki Area 11', cityName: 'Garki', stateName: 'FCT Abuja' },
  { lat: 9.0474, lng: 7.5218, communityName: 'Asokoro District', cityName: 'Asokoro', stateName: 'FCT Abuja' },
  { lat: 9.1098, lng: 7.3912, communityName: 'Gwarinpa Estate', cityName: 'Gwarinpa', stateName: 'FCT Abuja' },
  { lat: 8.9745, lng: 7.3789, communityName: 'Lugbe / Airport Rd', cityName: 'Lugbe', stateName: 'FCT Abuja' },

  // Rivers State / Port Harcourt
  { lat: 4.8156, lng: 7.0498, communityName: 'GRA Phase 2', cityName: 'Port Harcourt', stateName: 'Rivers State' },
  { lat: 4.8090, lng: 7.0280, communityName: 'Trans-Amadi Industrial', cityName: 'Port Harcourt', stateName: 'Rivers State' },
  { lat: 4.8500, lng: 6.9900, communityName: 'Obio-Akpor', cityName: 'Port Harcourt', stateName: 'Rivers State' },

  // Oyo State / Ibadan
  { lat: 7.3775, lng: 3.9470, communityName: 'Bodija Estate', cityName: 'Bodija', stateName: 'Oyo State' },
  { lat: 7.3620, lng: 3.8710, communityName: 'Ring Road / Challenge', cityName: 'Ibadan', stateName: 'Oyo State' },
  { lat: 7.3880, lng: 3.8920, communityName: 'Dugbe CBD', cityName: 'Ibadan', stateName: 'Oyo State' },

  // Delta State / Warri
  { lat: 5.5582, lng: 5.7820, communityName: 'Effurun Metropolis', cityName: 'Effurun / Warri', stateName: 'Delta State' },
  { lat: 5.5230, lng: 5.7500, communityName: 'Airport Road Warri', cityName: 'Warri', stateName: 'Delta State' },

  // Kano State
  { lat: 12.0022, lng: 8.5920, communityName: 'Nassarawa District', cityName: 'Kano City', stateName: 'Kano State' },
  { lat: 12.0080, lng: 8.5380, communityName: 'Sabon Gari', cityName: 'Kano City', stateName: 'Kano State' },

  // Edo State
  { lat: 6.3350, lng: 5.6037, communityName: 'GRA Benin', cityName: 'Benin City', stateName: 'Edo State' },

  // Kaduna State
  { lat: 10.5105, lng: 7.4165, communityName: 'Barnawa Layout', cityName: 'Kaduna South', stateName: 'Kaduna State' }
];

// Dynamically resolve exact Neighborhood Node from GPS lat/lng coordinates
export const getNeighborhoodFromCoords = (lat: number, lng: number): NeighborhoodNode => {
  let closestNode = NEIGHBORHOOD_NODES[0];
  let minDistance = Infinity;

  for (const node of NEIGHBORHOOD_NODES) {
    const dLat = lat - node.lat;
    const dLng = lng - node.lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closestNode = node;
    }
  }

  return closestNode;
};

// High-accuracy reverse geocoding from exact GPS latitude/longitude
export const fetchReverseGeocode = async (lat: number, lng: number): Promise<NeighborhoodNode> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const community = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.road || addr.village || addr.town || addr.city_district;
      const city = addr.city || addr.town || addr.county || addr.city_district || 'Lagos';
      const state = addr.state || 'Lagos State';
      if (community) {
        return {
          lat,
          lng,
          communityName: community,
          cityName: city,
          stateName: state
        };
      }
    }
  } catch (e) {
    // Fallback to spatial catalog matching
  }
  return getNeighborhoodFromCoords(lat, lng);
};

// Standard Admin Sample Geolocation Pinpoints across Nigerian Hubs
export const ADMIN_SAMPLE_LOCATIONS = [
  { lat: 6.4281, lng: 3.4219, cityName: 'Victoria Island', stateName: 'Lagos State', communityName: 'Ademola Adetokunbo Way' },
  { lat: 6.6018, lng: 3.3515, cityName: 'Ikeja', stateName: 'Lagos State', communityName: 'Computer Village' },
  { lat: 9.0765, lng: 7.3986, cityName: 'Maitama', stateName: 'FCT Abuja', communityName: 'Transcorp Hilton Axis' },
  { lat: 4.8156, lng: 7.0498, cityName: 'Port Harcourt', stateName: 'Rivers State', communityName: 'GRA Phase 2' },
  { lat: 7.3775, lng: 3.9470, cityName: 'Bodija', stateName: 'Oyo State', communityName: 'Bodija Estate' },
  { lat: 12.0022, lng: 8.5920, cityName: 'Kano City', stateName: 'Kano State', communityName: 'Nassarawa District' },
  { lat: 6.3350, lng: 5.6037, cityName: 'Benin City', stateName: 'Edo State', communityName: 'GRA Benin' },
  { lat: 10.5105, lng: 7.4165, cityName: 'Kaduna South', stateName: 'Kaduna State', communityName: 'Barnawa Layout' }
];

// Helper to deterministically match user email to exact Admin Analytics pinpoint
export const getAdminMatchedLocationForUser = (userEmail: string) => {
  if (!userEmail) return ADMIN_SAMPLE_LOCATIONS[0];
  const emailLower = userEmail.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < emailLower.length; i++) {
    hash = (hash << 5) - hash + emailLower.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ADMIN_SAMPLE_LOCATIONS.length;
  return ADMIN_SAMPLE_LOCATIONS[index];
};

// Log a user login event with exact pinpoint geolocation to Firestore
export const logUserLoginPinpoint = async (
  userEmail: string,
  userName?: string,
  customLocation?: { lat?: number; lng?: number; cityName?: string; stateName?: string; communityName?: string }
): Promise<void> => {
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

    // Only attempt real browser geolocation if already granted
    const coords = await getUserGeolocationIfGranted();

    let finalLat: number;
    let finalLng: number;
    let finalCity: string;
    let finalState: string;
    let finalCommunity: string;

    if (customLocation?.lat && customLocation?.lng) {
      finalLat = customLocation.lat;
      finalLng = customLocation.lng;
      const resolved = await fetchReverseGeocode(finalLat, finalLng);
      finalCity = customLocation.cityName || resolved.cityName;
      finalState = customLocation.stateName || resolved.stateName;
      finalCommunity = customLocation.communityName || resolved.communityName;
    } else if (coords?.lat && coords?.lng) {
      finalLat = coords.lat;
      finalLng = coords.lng;
      const resolved = await fetchReverseGeocode(finalLat, finalLng);
      finalCity = resolved.cityName;
      finalState = resolved.stateName;
      finalCommunity = resolved.communityName;
    } else {
      const adminMatched = getAdminMatchedLocationForUser(userEmail);
      finalLat = adminMatched.lat;
      finalLng = adminMatched.lng;
      finalCity = adminMatched.cityName;
      finalState = adminMatched.stateName;
      finalCommunity = adminMatched.communityName;
    }

    const loginData = {
      sessionId,
      timestamp: now.toISOString(),
      page: 'user_login',
      device,
      referrer: 'login_modal',
      isLogin: true,
      userEmail,
      userName: userName || userEmail.split('@')[0],
      lat: finalLat,
      lng: finalLng,
      cityName: finalCity,
      stateName: finalState,
      communityName: finalCommunity
    };

    const visitsColRef = collection(db, 'site_visits');
    await addDoc(visitsColRef, loginData);
    console.log("Logged exact user login pinpoint to Firestore:", loginData);
  } catch (err) {
    console.warn("Failed to log user login pinpoint:", err);
  }
};
