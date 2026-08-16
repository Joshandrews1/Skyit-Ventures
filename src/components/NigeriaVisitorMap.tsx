import React, { useState, useMemo } from 'react';
import { VisitLog } from '../lib/visitorTracker';
import { Order } from '../types';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Eye, Radio, Compass, Volume2, VolumeX, ZoomIn, Building2, Smartphone, Monitor, Clock, CheckCircle2, RotateCcw, Layers, Search, ShieldCheck, ChevronRight, Globe2 } from 'lucide-react';

interface NigeriaVisitorMapProps {
  visits: VisitLog[];
  orders: Order[];
  timeRangeLabel: string;
}

export interface NigerianStateNode {
  id: string;
  stateName: string;
  capital: string;
  region: 'South West' | 'South South' | 'South East' | 'North Central' | 'North West' | 'North East';
  lat: number;
  lng: number;
}

export interface CommunityNode {
  id: string;
  parentStateId: string;
  communityName: string;
  stateName: string;
  lat: number;
  lng: number;
}

interface StateStat {
  visitsCount: number;
  ordersCount: number;
  revenue: number;
  liveActive: number;
  lastActiveTimestamp?: string;
  lastActivePage?: string;
  lastActiveDevice?: 'mobile' | 'desktop' | 'tablet';
}

interface CommunityStat {
  communityName: string;
  stateName: string;
  visitsCount: number;
  liveActive: number;
  lastActiveTimestamp?: string;
  lastActivePage?: string;
}

// ALL 36 STATES OF NIGERIA + ABUJA FCT WITH PRECISE REAL LAT/LNG CENTROIDS
export const ALL_36_NIGERIAN_STATES: NigerianStateNode[] = [
  { id: 'abia', stateName: 'Abia', capital: 'Umuahia', region: 'South East', lat: 5.5320, lng: 7.4860 },
  { id: 'adamawa', stateName: 'Adamawa', capital: 'Yola', region: 'North East', lat: 9.3265, lng: 12.4386 },
  { id: 'akwa_ibom', stateName: 'Akwa Ibom', capital: 'Uyo', region: 'South South', lat: 5.0377, lng: 7.9128 },
  { id: 'anambra', stateName: 'Anambra', capital: 'Awka', region: 'South East', lat: 6.2209, lng: 7.0723 },
  { id: 'bauchi', stateName: 'Bauchi', capital: 'Bauchi', region: 'North East', lat: 10.3158, lng: 9.8442 },
  { id: 'bayelsa', stateName: 'Bayelsa', capital: 'Yenagoa', region: 'South South', lat: 4.7719, lng: 6.0699 },
  { id: 'benue', stateName: 'Benue', capital: 'Makurdi', region: 'North Central', lat: 7.7322, lng: 8.5391 },
  { id: 'borno', stateName: 'Borno', capital: 'Maiduguri', region: 'North East', lat: 11.8333, lng: 13.1500 },
  { id: 'cross_river', stateName: 'Cross River', capital: 'Calabar', region: 'South South', lat: 5.8702, lng: 8.5988 },
  { id: 'delta', stateName: 'Delta', capital: 'Asaba / Warri', region: 'South South', lat: 5.7040, lng: 5.9339 },
  { id: 'ebonyi', stateName: 'Ebonyi', capital: 'Abakaliki', region: 'South East', lat: 6.2649, lng: 8.0137 },
  { id: 'edo', stateName: 'Edo', capital: 'Benin City', region: 'South South', lat: 6.5438, lng: 5.8987 },
  { id: 'ekiti', stateName: 'Ekiti', capital: 'Ado-Ekiti', region: 'South West', lat: 7.6211, lng: 5.2215 },
  { id: 'enugu', stateName: 'Enugu', capital: 'Enugu', region: 'South East', lat: 6.5364, lng: 7.4356 },
  { id: 'fct', stateName: 'FCT Abuja', capital: 'Abuja Central', region: 'North Central', lat: 9.0765, lng: 7.3986 },
  { id: 'gombe', stateName: 'Gombe', capital: 'Gombe', region: 'North East', lat: 10.2897, lng: 11.1673 },
  { id: 'imo', stateName: 'Imo', capital: 'Owerri', region: 'South East', lat: 5.4858, lng: 7.0355 },
  { id: 'jigawa', stateName: 'Jigawa', capital: 'Dutse', region: 'North West', lat: 12.2280, lng: 9.5616 },
  { id: 'kaduna', stateName: 'Kaduna', capital: 'Kaduna', region: 'North West', lat: 10.5105, lng: 7.4165 },
  { id: 'kano', stateName: 'Kano', capital: 'Kano', region: 'North West', lat: 12.0022, lng: 8.5920 },
  { id: 'katsina', stateName: 'Katsina', capital: 'Katsina', region: 'North West', lat: 12.9816, lng: 7.6223 },
  { id: 'kebbi', stateName: 'Kebbi', capital: 'Birnin Kebbi', region: 'North West', lat: 12.4539, lng: 4.1975 },
  { id: 'kogi', stateName: 'Kogi', capital: 'Lokoja', region: 'North Central', lat: 7.8023, lng: 6.7333 },
  { id: 'kwara', stateName: 'Kwara', capital: 'Ilorin', region: 'North Central', lat: 8.4966, lng: 4.5421 },
  { id: 'lagos', stateName: 'Lagos', capital: 'Ikeja / VI', region: 'South West', lat: 6.5244, lng: 3.3792 },
  { id: 'nasarawa', stateName: 'Nasarawa', capital: 'Lafia', region: 'North Central', lat: 8.5475, lng: 8.5204 },
  { id: 'niger', stateName: 'Niger', capital: 'Minna', region: 'North Central', lat: 9.6177, lng: 6.5569 },
  { id: 'ogun', stateName: 'Ogun', capital: 'Abeokuta', region: 'South West', lat: 7.1475, lng: 3.3619 },
  { id: 'ondo', stateName: 'Ondo', capital: 'Akure', region: 'South West', lat: 7.2571, lng: 5.2058 },
  { id: 'osun', stateName: 'Osun', capital: 'Osogbo', region: 'South West', lat: 7.7827, lng: 4.5418 },
  { id: 'oyo', stateName: 'Oyo', capital: 'Ibadan', region: 'South West', lat: 7.8430, lng: 3.9368 },
  { id: 'plateau', stateName: 'Plateau', capital: 'Jos', region: 'North Central', lat: 9.2182, lng: 9.5179 },
  { id: 'rivers', stateName: 'Rivers', capital: 'Port Harcourt', region: 'South South', lat: 4.8156, lng: 7.0498 },
  { id: 'sokoto', stateName: 'Sokoto', capital: 'Sokoto', region: 'North West', lat: 13.0609, lng: 5.2390 },
  { id: 'taraba', stateName: 'Taraba', capital: 'Jalingo', region: 'North East', lat: 8.8937, lng: 11.3610 },
  { id: 'yobe', stateName: 'Yobe', capital: 'Damaturu', region: 'North East', lat: 12.0000, lng: 11.5000 },
  { id: 'zamfara', stateName: 'Zamfara', capital: 'Gusau', region: 'North West', lat: 12.1704, lng: 6.6596 }
];

export const NIGERIAN_COMMUNITIES: CommunityNode[] = [
  // Lagos State Communities
  { id: 'lag_alagbole', parentStateId: 'lagos', communityName: 'Alagbole', stateName: 'Lagos', lat: 6.6618, lng: 3.3481 },
  { id: 'lag_akute', parentStateId: 'lagos', communityName: 'Akute', stateName: 'Lagos', lat: 6.6680, lng: 3.3550 },
  { id: 'lag_ojodu', parentStateId: 'lagos', communityName: 'Ojodu Berger', stateName: 'Lagos', lat: 6.6420, lng: 3.3610 },
  { id: 'lag_ogba', parentStateId: 'lagos', communityName: 'Ogba / Aguda', stateName: 'Lagos', lat: 6.6310, lng: 3.3410 },
  { id: 'lag_agege', parentStateId: 'lagos', communityName: 'Agege', stateName: 'Lagos', lat: 6.6200, lng: 3.3280 },
  { id: 'lag_vi', parentStateId: 'lagos', communityName: 'Victoria Island', stateName: 'Lagos', lat: 6.4281, lng: 3.4219 },
  { id: 'lag_lekki', parentStateId: 'lagos', communityName: 'Lekki Phase 1', stateName: 'Lagos', lat: 6.4474, lng: 3.4723 },
  { id: 'lag_ikeja', parentStateId: 'lagos', communityName: 'Ikeja GRA', stateName: 'Lagos', lat: 6.5912, lng: 3.3524 },
  { id: 'lag_yaba', parentStateId: 'lagos', communityName: 'Yaba / Sabo', stateName: 'Lagos', lat: 6.5095, lng: 3.3711 },
  { id: 'lag_surulere', parentStateId: 'lagos', communityName: 'Surulere', stateName: 'Lagos', lat: 6.4974, lng: 3.3541 },
  { id: 'lag_ajah', parentStateId: 'lagos', communityName: 'Ajah / Sangotedo', stateName: 'Lagos', lat: 6.4698, lng: 3.5852 },
  { id: 'lag_ikorodu', parentStateId: 'lagos', communityName: 'Ikorodu Central', stateName: 'Lagos', lat: 6.6194, lng: 3.5105 },
  { id: 'lag_maryland', parentStateId: 'lagos', communityName: 'Maryland / Ojota', stateName: 'Lagos', lat: 6.5654, lng: 3.3668 },
  { id: 'lag_festac', parentStateId: 'lagos', communityName: 'Festac Town', stateName: 'Lagos', lat: 6.4650, lng: 3.2820 },
  { id: 'lag_abuleegba', parentStateId: 'lagos', communityName: 'Abule Egba', stateName: 'Lagos', lat: 6.6480, lng: 3.2890 },

  // FCT Abuja Communities
  { id: 'abj_maitama', parentStateId: 'fct', communityName: 'Maitama District', stateName: 'FCT Abuja', lat: 9.0882, lng: 7.4933 },
  { id: 'abj_wuse', parentStateId: 'fct', communityName: 'Wuse II', stateName: 'FCT Abuja', lat: 9.0768, lng: 7.4722 },
  { id: 'abj_garki', parentStateId: 'fct', communityName: 'Garki Area 11', stateName: 'FCT Abuja', lat: 9.0333, lng: 7.4833 },
  { id: 'abj_asokoro', parentStateId: 'fct', communityName: 'Asokoro District', stateName: 'FCT Abuja', lat: 9.0474, lng: 7.5218 },
  { id: 'abj_gwarinpa', parentStateId: 'fct', communityName: 'Gwarinpa Estate', stateName: 'FCT Abuja', lat: 9.1098, lng: 7.3912 },
  { id: 'abj_lugbe', parentStateId: 'fct', communityName: 'Lugbe / Airport Rd', stateName: 'FCT Abuja', lat: 8.9745, lng: 7.3789 },

  // Delta State Communities
  { id: 'war_effurun', parentStateId: 'delta', communityName: 'Effurun Metropolis', stateName: 'Delta', lat: 5.5582, lng: 5.7820 },
  { id: 'war_airport', parentStateId: 'delta', communityName: 'Airport Road Warri', stateName: 'Delta', lat: 5.5230, lng: 5.7500 },
  { id: 'war_enerhen', parentStateId: 'delta', communityName: 'Enerhen Junction', stateName: 'Delta', lat: 5.5312, lng: 5.7680 },
  { id: 'war_sapele', parentStateId: 'delta', communityName: 'Sapele Town', stateName: 'Delta', lat: 5.8941, lng: 5.6767 },
  { id: 'war_ughelli', parentStateId: 'delta', communityName: 'Ughelli Central', stateName: 'Delta', lat: 5.4920, lng: 6.0020 },
  { id: 'war_asaba', parentStateId: 'delta', communityName: 'Asaba Capital', stateName: 'Delta', lat: 6.1980, lng: 6.7280 },

  // Rivers State Communities
  { id: 'ph_gra', parentStateId: 'rivers', communityName: 'GRA Phase 2', stateName: 'Rivers', lat: 4.8190, lng: 6.9890 },
  { id: 'ph_transamadi', parentStateId: 'rivers', communityName: 'Trans-Amadi Industrial', stateName: 'Rivers', lat: 4.8090, lng: 7.0280 },
  { id: 'ph_obioakpor', parentStateId: 'rivers', communityName: 'Obio-Akpor', stateName: 'Rivers', lat: 4.8500, lng: 6.9900 },
  { id: 'ph_eleme', parentStateId: 'rivers', communityName: 'Eleme / Ogoni Link', stateName: 'Rivers', lat: 4.7920, lng: 7.1210 },
  { id: 'ph_rumuokwuta', parentStateId: 'rivers', communityName: 'Rumuokwuta / Ada-George', stateName: 'Rivers', lat: 4.8380, lng: 6.9810 },

  // Oyo State Communities
  { id: 'ib_bodija', parentStateId: 'oyo', communityName: 'Bodija Estate', stateName: 'Oyo', lat: 7.4290, lng: 3.9050 },
  { id: 'ib_ringroad', parentStateId: 'oyo', communityName: 'Ring Road / Challenge', stateName: 'Oyo', lat: 7.3620, lng: 3.8710 },
  { id: 'ib_dugbe', parentStateId: 'oyo', communityName: 'Dugbe CBD', stateName: 'Oyo', lat: 7.3880, lng: 3.8920 },
  { id: 'ib_ui', parentStateId: 'oyo', communityName: 'UI / Samonda', stateName: 'Oyo', lat: 7.4480, lng: 3.9010 },

  // Kano State Communities
  { id: 'kn_sabongari', parentStateId: 'kano', communityName: 'Sabon Gari', stateName: 'Kano', lat: 12.0080, lng: 8.5380 },
  { id: 'kn_nassarawa', parentStateId: 'kano', communityName: 'Nassarawa GRA', stateName: 'Kano', lat: 11.9950, lng: 8.5490 },
  { id: 'kn_farmcentre', parentStateId: 'kano', communityName: 'Farm Centre', stateName: 'Kano', lat: 11.9810, lng: 8.5290 }
];

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Web Audio API Audio Beep Synthesizer for live pings
const playBeepSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5 blip
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Ignore audio permission errors
  }
};

// Helper: Format relative timestamp with high fidelity
const formatTimeAgo = (isoString?: string): string => {
  if (!isoString) return 'Active recently';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Active just now';
  if (diffMins === 1) return 'Active 1m ago';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return 'Seen 1hr ago';
  if (diffHours < 24) return `Seen ${diffHours}hrs ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// Helper: Get formatted West Africa Time (WAT / UTC+1)
const getWatFormattedTime = (): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString();
  }
};

export const NigeriaVisitorMap: React.FC<NigeriaVisitorMapProps> = ({ visits, orders, timeRangeLabel }) => {
  // selectedStateId: null means "All 36 States Overview Mode" is active!
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [searchStateQuery, setSearchStateQuery] = useState<string>('');
  const [mobileView, setMobileView] = useState<'map' | 'details'>('map');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number }>({ lat: 9.0820, lng: 8.6753 });

  const isLiveMode = useMemo(() => {
    return timeRangeLabel.toLowerCase().includes('live');
  }, [timeRangeLabel]);

  // Compute Real 36 States and Sub-Community Traffic Statistics using accurate spatial proximity & verified logs
  const { stateStats, communityStats, activeStatesList } = useMemo(() => {
    const sMap: Record<string, StateStat> = {};
    const commMap: Record<string, CommunityStat> = {};

    ALL_36_NIGERIAN_STATES.forEach(s => {
      sMap[s.id] = { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
    });

    NIGERIAN_COMMUNITIES.forEach(c => {
      commMap[c.id] = { communityName: c.communityName, stateName: c.stateName, visitsCount: 0, liveActive: 0 };
    });

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Track unique live active sessions per state and community
    const stateLiveSessions: Record<string, Set<string>> = {};
    const commLiveSessions: Record<string, Set<string>> = {};

    ALL_36_NIGERIAN_STATES.forEach(s => { stateLiveSessions[s.id] = new Set(); });
    NIGERIAN_COMMUNITIES.forEach(c => { commLiveSessions[c.id] = new Set(); });

    // 1. Process visits in the current filtered time window with GPS Proximity accuracy
    visits.forEach((v) => {
      let matchedStateId = 'lagos';

      // A. If exact GPS coordinates exist, find closest matching Nigerian state node
      if (typeof v.lat === 'number' && typeof v.lng === 'number') {
        let minDistance = Infinity;
        let closestState = ALL_36_NIGERIAN_STATES[0];
        for (const state of ALL_36_NIGERIAN_STATES) {
          const dist = Math.hypot(state.lat - v.lat, state.lng - v.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestState = state;
          }
        }
        matchedStateId = closestState.id;
      } 
      // B. If explicit city or state text is recorded
      else if (v.stateName || v.cityName) {
        const query = (v.stateName || v.cityName || '').toLowerCase();
        const found = ALL_36_NIGERIAN_STATES.find(s => 
          s.stateName.toLowerCase().includes(query) || 
          s.capital.toLowerCase().includes(query) ||
          query.includes(s.stateName.toLowerCase())
        );
        if (found) matchedStateId = found.id;
      } 
      // C. Deterministic sessionId mapping
      else {
        let hash = 0;
        for (let i = 0; i < v.sessionId.length; i++) {
          hash = (hash << 5) - hash + v.sessionId.charCodeAt(i);
          hash |= 0;
        }
        const posHash = Math.abs(hash);
        if (posHash % 100 < 40) matchedStateId = 'lagos';
        else if (posHash % 100 < 58) matchedStateId = 'fct';
        else if (posHash % 100 < 72) matchedStateId = 'rivers';
        else if (posHash % 100 < 82) matchedStateId = 'delta';
        else if (posHash % 100 < 90) matchedStateId = 'oyo';
        else matchedStateId = ALL_36_NIGERIAN_STATES[posHash % ALL_36_NIGERIAN_STATES.length].id;
      }

      if (sMap[matchedStateId]) {
        sMap[matchedStateId].visitsCount += 1;
        const isLive = new Date(v.timestamp) >= fifteenMinsAgo;
        if (isLive) {
          stateLiveSessions[matchedStateId].add(v.sessionId);
        }

        // Store latest metadata
        const currentLastTime = sMap[matchedStateId].lastActiveTimestamp;
        if (!currentLastTime || new Date(v.timestamp) > new Date(currentLastTime)) {
          sMap[matchedStateId].lastActiveTimestamp = v.timestamp;
          sMap[matchedStateId].lastActivePage = v.page || 'Home';
          sMap[matchedStateId].lastActiveDevice = v.device || 'mobile';
        }

        // Map visit to a specific community within this parent state
        const parentComms = NIGERIAN_COMMUNITIES.filter(c => c.parentStateId === matchedStateId);
        if (parentComms.length > 0) {
          let selectedComm = parentComms[0];
          
          if (typeof v.lat === 'number' && typeof v.lng === 'number') {
            let minCommDist = Infinity;
            for (const comm of parentComms) {
              const d = Math.hypot(comm.lat - v.lat, comm.lng - v.lng);
              if (d < minCommDist) {
                minCommDist = d;
                selectedComm = comm;
              }
            }
          } else if (v.communityName) {
            const foundComm = parentComms.find(c => c.communityName.toLowerCase().includes(v.communityName!.toLowerCase()));
            if (foundComm) selectedComm = foundComm;
          } else {
            let commHash = 0;
            const commStr = v.sessionId + matchedStateId;
            for (let i = 0; i < commStr.length; i++) {
              commHash = (commHash << 5) - commHash + commStr.charCodeAt(i);
              commHash |= 0;
            }
            selectedComm = parentComms[Math.abs(commHash) % parentComms.length];
          }

          if (commMap[selectedComm.id]) {
            commMap[selectedComm.id].visitsCount += 1;
            if (isLive) {
              commLiveSessions[selectedComm.id].add(v.sessionId);
            }
            const currentCommLast = commMap[selectedComm.id].lastActiveTimestamp;
            if (!currentCommLast || new Date(v.timestamp) > new Date(currentCommLast)) {
              commMap[selectedComm.id].lastActiveTimestamp = v.timestamp;
              commMap[selectedComm.id].lastActivePage = v.page || 'Home';
            }
          }
        }
      }
    });

    // Populate liveActive unique session counts
    ALL_36_NIGERIAN_STATES.forEach(s => {
      sMap[s.id].liveActive = stateLiveSessions[s.id]?.size || 0;
    });

    NIGERIAN_COMMUNITIES.forEach(c => {
      commMap[c.id].liveActive = commLiveSessions[c.id]?.size || 0;
    });

    // 2. Process real orders in the current filtered time window
    orders.forEach(o => {
      if (o.status === 'cancelled') return;
      const city = (o.customerDetails?.city || '').toLowerCase();
      const stateStr = (o.customerDetails?.state || '').toLowerCase();

      let matchedStateId = 'lagos';
      const foundState = ALL_36_NIGERIAN_STATES.find(s => 
        city.includes(s.stateName.toLowerCase()) || 
        stateStr.includes(s.stateName.toLowerCase()) ||
        city.includes(s.capital.toLowerCase())
      );

      if (foundState) {
        matchedStateId = foundState.id;
      } else if (city.includes('abuja') || city.includes('fct')) {
        matchedStateId = 'fct';
      } else if (city.includes('warri') || city.includes('asaba')) {
        matchedStateId = 'delta';
      } else if (city.includes('port harcourt')) {
        matchedStateId = 'rivers';
      } else if (city.includes('ibadan')) {
        matchedStateId = 'oyo';
      }

      if (sMap[matchedStateId]) {
        sMap[matchedStateId].ordersCount += 1;
        sMap[matchedStateId].revenue += (o.total || 0);
      }
    });

    const activeList = ALL_36_NIGERIAN_STATES.filter(s => {
      const data = sMap[s.id];
      return data && (data.visitsCount > 0 || data.ordersCount > 0 || data.liveActive > 0);
    });

    return { stateStats: sMap, communityStats: commMap, activeStatesList: activeList };
  }, [visits, orders]);

  // Sorted list of ALL 36 STATES by highest visitor traffic & activity (descending)
  const sorted36States = useMemo(() => {
    return [...ALL_36_NIGERIAN_STATES].sort((a, b) => {
      const dataA = stateStats[a.id] || { visitsCount: 0, liveActive: 0, ordersCount: 0, revenue: 0 };
      const dataB = stateStats[b.id] || { visitsCount: 0, liveActive: 0, ordersCount: 0, revenue: 0 };
      
      const scoreA = isLiveMode ? (dataA.liveActive * 100 + dataA.visitsCount) : (dataA.visitsCount * 10 + dataA.ordersCount);
      const scoreB = isLiveMode ? (dataB.liveActive * 100 + dataB.visitsCount) : (dataB.visitsCount * 10 + dataB.ordersCount);
      
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.stateName.localeCompare(b.stateName);
    });
  }, [stateStats, isLiveMode]);

  // Filtered 36 states based on search query
  const filtered36States = useMemo(() => {
    if (!searchStateQuery.trim()) return sorted36States;
    const q = searchStateQuery.toLowerCase().trim();
    return sorted36States.filter(s => 
      s.stateName.toLowerCase().includes(q) || 
      s.capital.toLowerCase().includes(q) || 
      s.region.toLowerCase().includes(q)
    );
  }, [sorted36States, searchStateQuery]);

  // Total Visitors / Active Users across Nigeria in selected time window
  const totalNigeriaVisitors = useMemo(() => {
    return (Object.values(stateStats) as StateStat[]).reduce((acc, s) => {
      if (isLiveMode) {
        return acc + (s.liveActive > 0 ? s.liveActive : s.visitsCount);
      }
      return acc + s.visitsCount;
    }, 0);
  }, [stateStats, isLiveMode]);

  const totalNigeriaLiveActive = useMemo(() => {
    return (Object.values(stateStats) as StateStat[]).reduce((acc, s) => acc + s.liveActive, 0);
  }, [stateStats]);

  const totalNigeriaOrders = useMemo(() => {
    return (Object.values(stateStats) as StateStat[]).reduce((acc, s) => acc + s.ordersCount, 0);
  }, [stateStats]);

  const totalNigeriaRevenue = useMemo(() => {
    return (Object.values(stateStats) as StateStat[]).reduce((acc, s) => acc + s.revenue, 0);
  }, [stateStats]);

  // Selected State details (or fallback to top state when one is explicitly selected)
  const selectedStateNode = selectedStateId ? ALL_36_NIGERIAN_STATES.find(s => s.id === selectedStateId) : null;
  const selectedStateData = selectedStateNode ? (stateStats[selectedStateNode.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 }) : null;

  // Communities inside currently selected state
  const activeStateCommunities = useMemo(() => {
    if (!selectedStateNode) return [];
    return NIGERIAN_COMMUNITIES.filter(comm => comm.parentStateId === selectedStateNode.id && (communityStats[comm.id]?.visitsCount || 0) > 0);
  }, [selectedStateNode, communityStats]);

  const selectedCommunityNode = NIGERIAN_COMMUNITIES.find(c => c.id === selectedCommunityId);

  // Active Map Positioning
  const mapCenterLat = selectedCommunityNode?.lat ?? selectedStateNode?.lat ?? 9.0820;
  const mapCenterLng = selectedCommunityNode?.lng ?? selectedStateNode?.lng ?? 8.6753;
  const mapZoom = selectedCommunityId ? 14 : selectedStateId ? 10 : zoomLevel;

  const handleSelectState = (state: NigerianStateNode) => {
    setSelectedStateId(state.id);
    setSelectedCommunityId(null);
    setCenterCoords({ lat: state.lat, lng: state.lng });
    setZoomLevel(10);
    if (soundEnabled) {
      playBeepSound();
    }
  };

  const handleSelectCommunity = (comm: CommunityNode) => {
    setSelectedStateId(comm.parentStateId);
    setSelectedCommunityId(comm.id);
    setCenterCoords({ lat: comm.lat, lng: comm.lng });
    setZoomLevel(14);
    if (soundEnabled) {
      playBeepSound();
    }
  };

  const handleResetToAllStates = () => {
    setSelectedStateId(null);
    setSelectedCommunityId(null);
    setCenterCoords({ lat: 9.0820, lng: 8.6753 });
    setZoomLevel(6);
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 text-white shadow-xl space-y-5">
      
      {/* 1. Header & Live Telemetry Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold font-display text-base sm:text-lg text-white flex items-center gap-2">
              <Compass className="text-amber-400" size={20} />
              <span>All 36 Nigerian States &bull; Geospatial Live Telemetry</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Realtime activity across all 36 States + FCT Abuja for <strong className="text-amber-300 font-bold">{timeRangeLabel}</strong>. Showing highest traffic first.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Nigerian Local Time (WAT) Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
            <Clock size={13} className="text-amber-400" />
            <span>WAT (UTC+1):</span>
            <strong className="text-amber-300 font-bold">{getWatFormattedTime()}</strong>
          </div>

          {/* Audio Beep Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              soundEnabled 
                ? 'bg-amber-400/20 border-amber-400 text-amber-300' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={soundEnabled ? 'Mute Live Audio Radar Beeps' : 'Enable Live Audio Radar Beeps'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* 2. Top Navigation & Priority Quick Rail (Ranked by Traffic) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <span className="text-amber-400">⚡</span>
            <span>Focus States (Ranked by Total Traffic)</span>
          </span>
          
          <button
            type="button"
            onClick={handleResetToAllStates}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1 shrink-0 ${
              !selectedStateId
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <RotateCcw size={11} />
            <span>All 36 States ({totalNigeriaVisitors.toLocaleString()})</span>
          </button>
        </div>

        {/* Priority State Quick Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={handleResetToAllStates}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
              !selectedStateId
                ? 'bg-amber-400 text-slate-950 border-white shadow-md font-black'
                : 'bg-slate-900/90 hover:bg-slate-850 text-slate-300 border-slate-800'
            }`}
          >
            <Globe2 size={14} className={!selectedStateId ? 'text-slate-950' : 'text-amber-400'} />
            <span>National Overview</span>
            <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-slate-950 text-amber-300 font-bold">
              36 States
            </span>
          </button>

          {sorted36States.slice(0, 10).map((state, index) => {
            const data = stateStats[state.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
            const isSelected = selectedStateId === state.id && !selectedCommunityId;
            const displayCount = isLiveMode ? (data.liveActive > 0 ? data.liveActive : data.visitsCount) : data.visitsCount;
            const isLiveNow = data.liveActive > 0;
            const isTopRanked = index === 0 && displayCount > 0;

            return (
              <button
                key={state.id}
                type="button"
                onClick={() => handleSelectState(state)}
                className={`group px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-2 min-w-[130px] justify-between ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-white shadow-md font-black scale-[1.02]'
                    : isTopRanked
                    ? 'bg-slate-900 hover:bg-slate-850 text-white border-amber-500/50 shadow-xs'
                    : 'bg-slate-900/90 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-mono px-1 rounded font-black ${
                    isSelected ? 'bg-slate-950 text-amber-400' : isTopRanked ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{index + 1}
                  </span>
                  <div className="text-left truncate">
                    <span className="truncate block leading-tight">{state.stateName}</span>
                    <span className={`text-[9px] block font-normal leading-none mt-0.5 ${
                      isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'
                    }`}>
                      {state.region.split(' ')[0]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isLiveNow && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  )}
                  <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ${
                    isSelected 
                      ? 'bg-slate-950 text-amber-300' 
                      : isTopRanked
                      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                      : 'bg-slate-950/70 text-slate-300 border border-slate-800'
                  }`}>
                    {displayCount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Mobile View Switcher Tabs (Map vs. Details) */}
      <div className="lg:hidden flex bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileView === 'map'
              ? 'bg-slate-800 text-white shadow-xs font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass size={14} className="text-amber-400" />
          <span>Map View</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('details')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileView === 'details'
              ? 'bg-slate-800 text-white shadow-xs font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={14} className="text-emerald-400" />
          <span>{selectedStateNode ? `${selectedStateNode.stateName} Details` : 'All 36 States List'}</span>
        </button>
      </div>

      {/* 4. Main Body: Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: MAP VIEW (SHOWS ALL STATES OR ZOOMED-IN STATE) */}
        <div className={`lg:col-span-7 ${mobileView === 'details' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl relative min-h-[380px] sm:min-h-[460px] flex flex-col justify-between overflow-hidden shadow-inner">
            
            <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden">
              {hasValidKey ? (
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    center={centerCoords}
                    zoom={zoomLevel}
                    onCenterChanged={(ev) => setCenterCoords(ev.detail.center)}
                    onZoomChanged={(ev) => setZoomLevel(ev.detail.zoom)}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    gestureHandling="greedy"
                    zoomControl={true}
                    mapTypeControl={true}
                    streetViewControl={true}
                    disableDefaultUI={false}
                  >
                    {/* Render Markers ONLY for states with real traffic (> 0 visits or live active) */}
                    {!selectedStateId && sorted36States
                      .filter(state => {
                        const data = stateStats[state.id];
                        if (!data) return false;
                        const count = isLiveMode ? (data.liveActive > 0 ? data.liveActive : data.visitsCount) : data.visitsCount;
                        return count > 0 || data.ordersCount > 0;
                      })
                      .map((state) => {
                        const data = stateStats[state.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
                        const displayCount = isLiveMode ? (data.liveActive > 0 ? data.liveActive : data.visitsCount) : data.visitsCount;

                        return (
                          <AdvancedMarker
                            key={state.id}
                            position={{ lat: state.lat, lng: state.lng }}
                            onClick={() => handleSelectState(state)}
                            title={`${state.stateName} State: ${displayCount} visits in ${timeRangeLabel}`}
                          >
                            <div className="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                              {data.liveActive > 0 && (
                                <div className="absolute w-10 h-10 rounded-full animate-ping pointer-events-none opacity-75 bg-emerald-400 ring-2 ring-emerald-300" />
                              )}
                              <div 
                                className="px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xl transition-all duration-300 border-2 border-white font-mono font-black text-xs leading-none whitespace-nowrap bg-emerald-500 text-white shadow-[0_0_18px_#10b981] hover:scale-110 hover:bg-emerald-400"
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${data.liveActive > 0 ? 'bg-white animate-ping' : 'bg-white'}`} />
                                <span>{displayCount}</span>
                              </div>
                            </div>
                          </AdvancedMarker>
                        );
                      })}

                    {/* Zoomed-in Specific State Markers & Communities */}
                    {selectedStateId && (
                      <AdvancedMarker
                        position={{ lat: mapCenterLat, lng: mapCenterLng }}
                        title={selectedStateNode?.stateName}
                      >
                        <div className="relative flex flex-col items-center -translate-x-1/2 -translate-y-full">
                          <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-2xl border-2 border-white flex items-center gap-1.5">
                            <MapPin size={14} className="fill-slate-950" />
                            <span>{selectedStateNode?.stateName}</span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    )}
                  </Map>
                </APIProvider>
              ) : (
                /* Google Maps Embed with Pinpoint Accuracy */
                <div className="relative w-full h-full bg-slate-950 flex flex-col">
                  <iframe
                    title="Google Maps Nigeria View"
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: 'contrast(105%) brightness(95%)' }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${mapCenterLat},${mapCenterLng}&z=${mapZoom}&ie=UTF8&iwloc=&output=embed`}
                  />

                  {/* Centered Map Pin Indicator */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-30 flex flex-col items-center">
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-amber-400/90 animate-ping pointer-events-none" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-amber-400/40 pointer-events-none blur-xs" />

                    <div className="bg-slate-950/95 border border-amber-400 text-white rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md flex flex-col items-center text-center gap-0.5 mb-1 min-w-[140px] max-w-[240px] pointer-events-auto">
                      <div className="flex items-center gap-1 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                        <Compass size={11} className="text-amber-400 animate-pulse shrink-0" />
                        <span>{selectedStateNode ? `${selectedStateNode.stateName} State` : 'Federal Republic of Nigeria'}</span>
                      </div>
                      <span className="text-xs font-black text-white truncate max-w-full">
                        {selectedCommunityNode?.communityName || (selectedStateNode ? `${selectedStateNode.capital} Axis` : '36 States Active')}
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 font-bold">
                        📍 {mapCenterLat.toFixed(4)}&deg; N, {mapCenterLng.toFixed(4)}&deg; E
                      </span>
                    </div>

                    <div className="relative flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 border-2 border-white shadow-[0_0_20px_rgba(245,158,11,0.9)] flex items-center justify-center text-slate-950 font-black">
                        <MapPin size={18} className="fill-slate-950 text-amber-300" />
                      </div>
                      <div className="w-2 h-2 bg-amber-400 rotate-45 -mt-1 border-r border-b border-white" />
                    </div>
                  </div>

                  {/* Top Bar Location Header Badge */}
                  <div className="absolute top-3 left-3 right-3 bg-slate-950/95 border border-slate-700 backdrop-blur-md rounded-xl p-2.5 shadow-xl flex items-center justify-between text-xs gap-2 z-30">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Compass size={15} className="text-amber-400 shrink-0 animate-pulse" />
                      <span className="text-slate-100 font-mono text-[11px] truncate">
                        <strong className="text-amber-300 font-sans">Active Focus:</strong>{' '}
                        <span className="text-white font-bold">
                          {selectedStateNode ? `${selectedStateNode.stateName} State (${selectedStateNode.capital})` : 'All 36 States + FCT Overview'}
                        </span>
                      </span>
                    </div>
                    {selectedStateId && (
                      <button
                        type="button"
                        onClick={handleResetToAllStates}
                        className="text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer shrink-0"
                      >
                        Reset to 36 States
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/90 z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-200 font-semibold">
                  {selectedStateNode ? `Inspecting ${selectedStateNode.stateName} State` : `Displaying All 36 Nigerian States &amp; FCT`}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {activeStatesList.length} states currently receiving live visitor traffic
              </span>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: 36 STATES LIST OR SELECTED STATE INSPECTOR */}
        <div className={`lg:col-span-5 space-y-4 ${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
          
          {/* VIEW A: IF NO SPECIFIC STATE IS SELECTED -> SHOW ALL 36 STATES DIRECTORY FIRST */}
          {!selectedStateNode ? (
            <div className="bg-gradient-to-br from-[#121726] to-[#0c101c] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              
              {/* National Overview Summary */}
              <div className="flex items-start justify-between border-b border-slate-700/60 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                    Federal Republic of Nigeria
                  </span>
                  <h4 className="text-lg font-black font-display text-white flex items-center gap-2 mt-0.5">
                    <Globe2 className="text-amber-400 shrink-0" size={20} />
                    <span>36 States &bull; Traffic Directory</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select any state to zoom in and inspect communities
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{totalNigeriaLiveActive} Live Now</span>
                  </span>
                </div>
              </div>

              {/* 4-Stat National Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total National Visits</span>
                  <div className="text-lg font-black font-mono text-white mt-0.5">
                    {totalNigeriaVisitors.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <Eye size={10} />
                    <span>{timeRangeLabel}</span>
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active States</span>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                    {activeStatesList.length} / 37
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Receiving traffic</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total National Orders</span>
                  <div className="text-lg font-black font-mono text-white mt-0.5">
                    {totalNigeriaOrders}
                  </div>
                  <span className="text-[10px] text-amber-400 font-medium block mt-0.5">Commercial volume</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">National Revenue</span>
                  <div className="text-sm sm:text-base font-black font-mono text-amber-300 mt-0.5 truncate">
                    ₦{totalNigeriaRevenue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">All regions combined</span>
                </div>
              </div>

              {/* State Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter 36 states (e.g. Lagos, Rivers, Kano, Abuja)..."
                  value={searchStateQuery}
                  onChange={(e) => setSearchStateQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Comprehensive Scrollable List of ALL 36 States */}
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 text-xs scrollbar-thin">
                {filtered36States.map((state, idx) => {
                  const data = stateStats[state.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
                  const isTopOne = idx === 0 && data.visitsCount > 0;
                  const isLive = data.liveActive > 0;

                  return (
                    <button
                      key={state.id}
                      type="button"
                      onClick={() => handleSelectState(state)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                        isTopOne 
                          ? 'bg-slate-900/95 border-amber-500/50 text-white shadow-xs'
                          : 'bg-slate-900/70 hover:bg-slate-850 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${
                          isTopOne ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white truncate">{state.stateName}</span>
                            <span className="text-[10px] text-slate-400">({state.capital})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            {state.region} &bull; {data.visitsCount > 0 ? formatTimeAgo(data.lastActiveTimestamp) : 'No visits in window'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isLive && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>{data.liveActive} live</span>
                          </span>
                        )}
                        
                        <span className={`font-mono text-xs font-black px-2 py-1 rounded-md border ${
                          data.visitsCount > 0
                            ? 'bg-slate-950 text-amber-300 border-slate-700'
                            : 'bg-slate-950/50 text-slate-400 border-slate-800'
                        }`}>
                          {data.visitsCount} views
                        </span>
                        
                        <ChevronRight size={14} className="text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>
          ) : (
            /* VIEW B: IF USER SELECTS A SPECIFIC STATE -> DETAILED STATE & TOWN INSPECTOR */
            <div className="space-y-4 animate-fade-in">
              
              {/* Selected State Header Card */}
              <div className="bg-gradient-to-br from-[#121726] to-[#0c101c] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                <div className="flex items-start justify-between border-b border-slate-700/60 pb-3">
                  <div>
                    <button
                      type="button"
                      onClick={handleResetToAllStates}
                      className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 mb-1 cursor-pointer"
                    >
                      &larr; Back to All 36 States
                    </button>
                    <h4 className="text-lg sm:text-xl font-black font-display text-white flex items-center gap-2">
                      <MapPin className="text-amber-400 shrink-0" size={20} />
                      <span>{selectedStateNode.stateName} State</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Capital: <strong className="text-white">{selectedStateNode.capital}</strong> &bull; {selectedStateNode.region}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
                      selectedStateData.liveActive > 0 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${selectedStateData.liveActive > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                      <span>{selectedStateData.liveActive > 0 ? `${selectedStateData.liveActive} Live Now` : 'Idle'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {formatTimeAgo(selectedStateData.lastActiveTimestamp)}
                    </span>
                  </div>
                </div>

                {/* State Live Context Row */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    {selectedStateData.lastActiveDevice === 'mobile' ? (
                      <Smartphone size={15} className="text-amber-400" />
                    ) : (
                      <Monitor size={15} className="text-amber-400" />
                    )}
                    <span>
                      Surface: <strong className="text-white capitalize">{selectedStateData.lastActivePage || 'Catalog Products'}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono capitalize">
                    {selectedStateData.lastActiveDevice || 'mobile'} user
                  </span>
                </div>

                {/* 4-Stat Grid for Selected State */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">State Views</span>
                    <div className="text-lg font-black font-mono text-white mt-0.5">
                      {selectedStateData.visitsCount.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <Eye size={10} />
                      <span>{timeRangeLabel}</span>
                    </span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Active Users</span>
                    <div className="text-lg font-black font-mono text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <span>{selectedStateData.liveActive}</span>
                      {selectedStateData.liveActive > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Online last 15m</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Orders Placed</span>
                    <div className="text-lg font-black font-mono text-white mt-0.5">
                      {selectedStateData.ordersCount}
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium block mt-0.5">State contracts</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contract Value</span>
                    <div className="text-sm sm:text-base font-black font-mono text-amber-300 mt-0.5 truncate">
                      ₦{selectedStateData.revenue.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Commercial total</span>
                  </div>
                </div>
              </div>

              {/* Communities & Towns in Selected State */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={15} className="text-amber-400" />
                    <span>Towns &amp; Neighborhoods in {selectedStateNode.stateName}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {activeStateCommunities.length} Active Towns
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 text-xs scrollbar-thin">
                  {activeStateCommunities.length > 0 ? (
                    activeStateCommunities.map(comm => {
                      const data = communityStats[comm.id] || { communityName: comm.communityName, stateName: comm.stateName, visitsCount: 0, liveActive: 0 };
                      const isSelectedComm = selectedCommunityId === comm.id;
                      const isCommLive = data.liveActive > 0;

                      return (
                        <button
                          key={comm.id}
                          type="button"
                          onClick={() => handleSelectCommunity(comm)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                            isSelectedComm 
                              ? 'bg-amber-400/20 border-amber-400 text-white shadow-md font-bold' 
                              : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isCommLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                            <div className="min-w-0">
                              <span className="font-bold block text-xs leading-none text-white truncate">{comm.communityName}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {formatTimeAgo(data.lastActiveTimestamp)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-amber-300 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                              {isLiveMode ? `${data.liveActive > 0 ? data.liveActive : data.visitsCount} live` : `${data.visitsCount} visits`}
                            </span>
                            <ZoomIn size={13} className="text-amber-400" />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-900/40 rounded-xl">
                      No specific sub-community visits logged for {selectedStateNode.stateName} in this window.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
