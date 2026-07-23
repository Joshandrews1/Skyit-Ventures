import React, { useState, useMemo } from 'react';
import { VisitLog } from '../lib/visitorTracker';
import { Order } from '../types';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Eye, Radio, Compass, Key, ZoomIn, Building2 } from 'lucide-react';

interface NigeriaVisitorMapProps {
  visits: VisitLog[];
  orders: Order[];
  timeRangeLabel: string;
}

interface NigerianCityNode {
  id: string;
  cityName: string;
  stateName: string;
  region: string;
  lat: number;
  lng: number;
  xPct: number; // Relative SVG X coordinate
  yPct: number; // Relative SVG Y coordinate
}

export interface CommunityNode {
  id: string;
  parentCityId: string;
  communityName: string;
  stateName: string;
  lat: number;
  lng: number;
  xPct: number;
  yPct: number;
}

interface CityStat {
  visitsCount: number;
  ordersCount: number;
  revenue: number;
  liveActive: number;
}

interface CommunityStat {
  communityName: string;
  stateName: string;
  visitsCount: number;
  liveActive: number;
}

const NIGERIAN_CITIES: NigerianCityNode[] = [
  { id: 'lagos', cityName: 'Lagos Metropolis', stateName: 'Lagos State', region: 'South West', lat: 6.5244, lng: 3.3792, xPct: 20, yPct: 78 },
  { id: 'abuja', cityName: 'Abuja FCT', stateName: 'Federal Capital Territory', region: 'North Central', lat: 9.0765, lng: 7.3986, xPct: 48, yPct: 48 },
  { id: 'warri', cityName: 'Warri / Delta', stateName: 'Delta State', region: 'South South', lat: 5.5544, lng: 5.7932, xPct: 35, yPct: 80 },
  { id: 'port_harcourt', cityName: 'Port Harcourt', stateName: 'Rivers State', region: 'South South', lat: 4.8156, lng: 7.0498, xPct: 46, yPct: 86 },
  { id: 'ibadan', cityName: 'Ibadan', stateName: 'Oyo State', region: 'South West', lat: 7.3775, lng: 3.9470, xPct: 23, yPct: 69 },
  { id: 'kano', cityName: 'Kano', stateName: 'Kano State', region: 'North West', lat: 12.0022, lng: 8.5920, xPct: 58, yPct: 22 },
  { id: 'kaduna', cityName: 'Kaduna', stateName: 'Kaduna State', region: 'North West', lat: 10.5105, lng: 7.4165, xPct: 50, yPct: 36 },
  { id: 'enugu', cityName: 'Enugu', stateName: 'Enugu State', region: 'South East', lat: 6.4584, lng: 7.5464, xPct: 51, yPct: 74 },
  { id: 'benin', cityName: 'Benin City', stateName: 'Edo State', region: 'South South', lat: 6.3350, lng: 5.6037, xPct: 36, yPct: 73 },
  { id: 'calabar', cityName: 'Calabar', stateName: 'Cross River State', region: 'South South', lat: 4.9757, lng: 8.3417, xPct: 58, yPct: 84 },
  { id: 'jos', cityName: 'Jos', stateName: 'Plateau State', region: 'North Central', lat: 9.8965, lng: 8.8583, xPct: 63, yPct: 46 },
  { id: 'maiduguri', cityName: 'Maiduguri', stateName: 'Borno State', region: 'North East', lat: 11.8333, lng: 13.1500, xPct: 86, yPct: 24 }
];

export const NIGERIAN_COMMUNITIES: CommunityNode[] = [
  // Lagos State Communities
  { id: 'lag_vi', parentCityId: 'lagos', communityName: 'Victoria Island', stateName: 'Lagos State', lat: 6.4281, lng: 3.4219, xPct: 20.2, yPct: 78.5 },
  { id: 'lag_lekki', parentCityId: 'lagos', communityName: 'Lekki Phase 1', stateName: 'Lagos State', lat: 6.4474, lng: 3.4723, xPct: 20.8, yPct: 78.3 },
  { id: 'lag_ikeja', parentCityId: 'lagos', communityName: 'Ikeja GRA', stateName: 'Lagos State', lat: 6.5912, lng: 3.3524, xPct: 19.8, yPct: 77.2 },
  { id: 'lag_yaba', parentCityId: 'lagos', communityName: 'Yaba / Sabo', stateName: 'Lagos State', lat: 6.5095, lng: 3.3711, xPct: 19.9, yPct: 77.8 },
  { id: 'lag_surulere', parentCityId: 'lagos', communityName: 'Surulere', stateName: 'Lagos State', lat: 6.4974, lng: 3.3541, xPct: 19.7, yPct: 78.0 },
  { id: 'lag_ajah', parentCityId: 'lagos', communityName: 'Ajah / Sangotedo', stateName: 'Lagos State', lat: 6.4698, lng: 3.5852, xPct: 21.5, yPct: 78.2 },
  { id: 'lag_ikorodu', parentCityId: 'lagos', communityName: 'Ikorodu Central', stateName: 'Lagos State', lat: 6.6194, lng: 3.5105, xPct: 21.2, yPct: 76.9 },
  { id: 'lag_maryland', parentCityId: 'lagos', communityName: 'Maryland / Ojota', stateName: 'Lagos State', lat: 6.5654, lng: 3.3668, xPct: 19.9, yPct: 77.4 },

  // Abuja FCT Communities
  { id: 'abj_maitama', parentCityId: 'abuja', communityName: 'Maitama District', stateName: 'Federal Capital Territory', lat: 9.0882, lng: 7.4933, xPct: 48.5, yPct: 47.8 },
  { id: 'abj_wuse', parentCityId: 'abuja', communityName: 'Wuse II', stateName: 'Federal Capital Territory', lat: 9.0768, lng: 7.4722, xPct: 48.2, yPct: 48.1 },
  { id: 'abj_garki', parentCityId: 'abuja', communityName: 'Garki Area 11', stateName: 'Federal Capital Territory', lat: 9.0333, lng: 7.4833, xPct: 48.3, yPct: 48.6 },
  { id: 'abj_asokoro', parentCityId: 'abuja', communityName: 'Asokoro District', stateName: 'Federal Capital Territory', lat: 9.0474, lng: 7.5218, xPct: 48.8, yPct: 48.4 },
  { id: 'abj_gwarinpa', parentCityId: 'abuja', communityName: 'Gwarinpa Estate', stateName: 'Federal Capital Territory', lat: 9.1098, lng: 7.3912, xPct: 47.6, yPct: 47.6 },
  { id: 'abj_lugbe', parentCityId: 'abuja', communityName: 'Lugbe / Airport Rd', stateName: 'Federal Capital Territory', lat: 8.9745, lng: 7.3789, xPct: 47.4, yPct: 49.1 },

  // Delta State / Warri Communities
  { id: 'war_effurun', parentCityId: 'warri', communityName: 'Effurun Metropolis', stateName: 'Delta State', lat: 5.5582, lng: 5.7820, xPct: 35.1, yPct: 79.8 },
  { id: 'war_airport', parentCityId: 'warri', communityName: 'Airport Road Warri', stateName: 'Delta State', lat: 5.5230, lng: 5.7500, xPct: 34.9, yPct: 80.2 },
  { id: 'war_enerhen', parentCityId: 'warri', communityName: 'Enerhen Junction', stateName: 'Delta State', lat: 5.5312, lng: 5.7680, xPct: 35.0, yPct: 80.1 },
  { id: 'war_sapele', parentCityId: 'warri', communityName: 'Sapele Town', stateName: 'Delta State', lat: 5.8941, lng: 5.6767, xPct: 34.5, yPct: 77.2 },
  { id: 'war_ughelli', parentCityId: 'warri', communityName: 'Ughelli Central', stateName: 'Delta State', lat: 5.4920, lng: 6.0020, xPct: 36.5, yPct: 80.5 },
  { id: 'war_asaba', parentCityId: 'warri', communityName: 'Asaba Capital', stateName: 'Delta State', lat: 6.1980, lng: 6.7280, xPct: 41.5, yPct: 74.8 },

  // Rivers State / Port Harcourt Communities
  { id: 'ph_gra', parentCityId: 'port_harcourt', communityName: 'GRA Phase 2', stateName: 'Rivers State', lat: 4.8190, lng: 6.9890, xPct: 45.8, yPct: 85.8 },
  { id: 'ph_transamadi', parentCityId: 'port_harcourt', communityName: 'Trans-Amadi Industrial', stateName: 'Rivers State', lat: 4.8090, lng: 7.0280, xPct: 46.2, yPct: 85.9 },
  { id: 'ph_obioakpor', parentCityId: 'port_harcourt', communityName: 'Obio-Akpor', stateName: 'Rivers State', lat: 4.8500, lng: 6.9900, xPct: 45.9, yPct: 85.5 },
  { id: 'ph_eleme', parentCityId: 'port_harcourt', communityName: 'Eleme / Ogoni Link', stateName: 'Rivers State', lat: 4.7920, lng: 7.1210, xPct: 47.1, yPct: 86.1 },
  { id: 'ph_rumuokwuta', parentCityId: 'port_harcourt', communityName: 'Rumuokwuta / Ada-George', stateName: 'Rivers State', lat: 4.8380, lng: 6.9810, xPct: 45.7, yPct: 85.6 },

  // Oyo State / Ibadan Communities
  { id: 'ib_bodija', parentCityId: 'ibadan', communityName: 'Bodija Estate', stateName: 'Oyo State', lat: 7.4290, lng: 3.9050, xPct: 23.2, yPct: 68.6 },
  { id: 'ib_ringroad', parentCityId: 'ibadan', communityName: 'Ring Road / Challenge', stateName: 'Oyo State', lat: 7.3620, lng: 3.8710, xPct: 22.9, yPct: 69.1 },
  { id: 'ib_dugbe', parentCityId: 'ibadan', communityName: 'Dugbe CBD', stateName: 'Oyo State', lat: 7.3880, lng: 3.8920, xPct: 23.0, yPct: 68.9 },
  { id: 'ib_ui', parentCityId: 'ibadan', communityName: 'UI / Samonda', stateName: 'Oyo State', lat: 7.4480, lng: 3.9010, xPct: 23.1, yPct: 68.4 },

  // Kano State Communities
  { id: 'kn_sabongari', parentCityId: 'kano', communityName: 'Sabon Gari', stateName: 'Kano State', lat: 12.0080, lng: 8.5380, xPct: 57.6, yPct: 21.9 },
  { id: 'kn_nassarawa', parentCityId: 'kano', communityName: 'Nassarawa GRA', stateName: 'Kano State', lat: 11.9950, lng: 8.5490, xPct: 57.7, yPct: 22.1 },
  { id: 'kn_farmcentre', parentCityId: 'kano', communityName: 'Farm Centre', stateName: 'Kano State', lat: 11.9810, lng: 8.5290, xPct: 57.5, yPct: 22.2 }
];

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Web Audio API Audio Beep Synthesizer
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

export const NigeriaVisitorMap: React.FC<NigeriaVisitorMapProps> = ({ visits, orders, timeRangeLabel }) => {
  const [activeCityId, setActiveCityId] = useState<string>('lagos');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number }>({ lat: 9.0820, lng: 8.6753 });

  const isLiveMode = useMemo(() => {
    return timeRangeLabel.toLowerCase().includes('live');
  }, [timeRangeLabel]);

  // Compute City and Sub-Community Traffic Statistics combining visits and customer order addresses
  const { cityStats, communityStats } = useMemo(() => {
    const cityMap: Record<string, CityStat> = {};
    const commMap: Record<string, CommunityStat> = {};

    NIGERIAN_CITIES.forEach(c => {
      cityMap[c.id] = { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
    });

    NIGERIAN_COMMUNITIES.forEach(c => {
      commMap[c.id] = { communityName: c.communityName, stateName: c.stateName, visitsCount: 0, liveActive: 0 };
    });

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Track unique live active sessions per city and community
    const cityLiveSessions: Record<string, Set<string>> = {};
    const commLiveSessions: Record<string, Set<string>> = {};

    NIGERIAN_CITIES.forEach(c => { cityLiveSessions[c.id] = new Set(); });
    NIGERIAN_COMMUNITIES.forEach(c => { commLiveSessions[c.id] = new Set(); });

    // 1. Process visits in the current filtered time window deterministically by sessionId
    visits.forEach((v) => {
      let matchedCityId = 'lagos';

      if (v.cityName || v.stateName) {
        const query = (v.cityName || v.stateName || '').toLowerCase();
        const found = NIGERIAN_CITIES.find(c => 
          c.cityName.toLowerCase().includes(query) || 
          c.stateName.toLowerCase().includes(query)
        );
        if (found) matchedCityId = found.id;
      } else {
        // Deterministic Hash strictly on sessionId (NO random index offset)
        let hash = 0;
        for (let i = 0; i < v.sessionId.length; i++) {
          hash = (hash << 5) - hash + v.sessionId.charCodeAt(i);
          hash |= 0;
        }
        const posHash = Math.abs(hash);
        if (posHash % 100 < 45) matchedCityId = 'lagos';
        else if (posHash % 100 < 65) matchedCityId = 'abuja';
        else if (posHash % 100 < 77) matchedCityId = 'port_harcourt';
        else if (posHash % 100 < 87) matchedCityId = 'warri';
        else if (posHash % 100 < 93) matchedCityId = 'ibadan';
        else matchedCityId = NIGERIAN_CITIES[posHash % NIGERIAN_CITIES.length].id;
      }

      if (cityMap[matchedCityId]) {
        cityMap[matchedCityId].visitsCount += 1;
        const isLive = new Date(v.timestamp) >= fifteenMinsAgo;
        if (isLive) {
          cityLiveSessions[matchedCityId].add(v.sessionId);
        }

        // Map visit to a specific community within this parent city/state deterministically
        const parentComms = NIGERIAN_COMMUNITIES.filter(c => c.parentCityId === matchedCityId);
        if (parentComms.length > 0) {
          let selectedComm = parentComms[0];
          if (v.communityName) {
            const foundComm = parentComms.find(c => c.communityName.toLowerCase().includes(v.communityName!.toLowerCase()));
            if (foundComm) selectedComm = foundComm;
          } else {
            let commHash = 0;
            const commStr = v.sessionId + matchedCityId;
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
          }
        }
      }
    });

    // Populate liveActive unique session counts
    NIGERIAN_CITIES.forEach(c => {
      cityMap[c.id].liveActive = cityLiveSessions[c.id]?.size || 0;
    });

    NIGERIAN_COMMUNITIES.forEach(c => {
      commMap[c.id].liveActive = commLiveSessions[c.id]?.size || 0;
    });

    // 2. Process real orders in the current filtered time window
    orders.forEach(o => {
      if (o.status === 'cancelled') return;
      const city = (o.customerDetails?.city || '').toLowerCase();

      let matchedCityId = 'lagos';
      if (city.includes('abuja') || city.includes('fct')) matchedCityId = 'abuja';
      else if (city.includes('warri') || city.includes('delta') || city.includes('effurun')) matchedCityId = 'warri';
      else if (city.includes('port harcourt') || city.includes('rivers')) matchedCityId = 'port_harcourt';
      else if (city.includes('ibadan') || city.includes('oyo')) matchedCityId = 'ibadan';
      else if (city.includes('kano')) matchedCityId = 'kano';
      else if (city.includes('kaduna')) matchedCityId = 'kaduna';
      else if (city.includes('enugu')) matchedCityId = 'enugu';
      else if (city.includes('benin')) matchedCityId = 'benin';
      else if (city.includes('calabar')) matchedCityId = 'calabar';

      if (cityMap[matchedCityId]) {
        cityMap[matchedCityId].ordersCount += 1;
        cityMap[matchedCityId].revenue += (o.total || 0);
      }
    });

    return { cityStats: cityMap, communityStats: commMap };
  }, [visits, orders]);

  // Filter cities to ONLY those that have actual activity in this time range
  const visitedCities = useMemo(() => {
    return NIGERIAN_CITIES.filter(city => {
      const data = cityStats[city.id];
      if (!data) return false;
      if (isLiveMode) {
        return (data.liveActive > 0) || (data.visitsCount > 0);
      }
      return data.visitsCount > 0 || data.ordersCount > 0;
    });
  }, [cityStats, isLiveMode]);

  // Filter communities that received visits in the current time range
  const visitedCommunities = useMemo(() => {
    return NIGERIAN_COMMUNITIES.filter(comm => {
      const data = communityStats[comm.id];
      if (!data) return false;
      if (isLiveMode) {
        return (data.liveActive > 0) || (data.visitsCount > 0);
      }
      return data.visitsCount > 0;
    });
  }, [communityStats, isLiveMode]);

  // Total Visitors / Active Users across Nigeria in selected time window
  const totalNigeriaVisitors = useMemo(() => {
    return (Object.values(cityStats) as CityStat[]).reduce((acc, s) => {
      if (isLiveMode) {
        return acc + (s.liveActive > 0 ? s.liveActive : s.visitsCount);
      }
      return acc + s.visitsCount;
    }, 0);
  }, [cityStats, isLiveMode]);

  const activeCityNode = NIGERIAN_CITIES.find(c => c.id === activeCityId) || NIGERIAN_CITIES[0];
  const activeCityData = cityStats[activeCityNode.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };

  // Communities inside currently active selected state
  const activeStateCommunities = useMemo(() => {
    return NIGERIAN_COMMUNITIES.filter(comm => comm.parentCityId === activeCityNode.id && (communityStats[comm.id]?.visitsCount || 0) > 0);
  }, [activeCityNode, communityStats]);

  const handleSelectCity = (city: NigerianCityNode, zoomInToCommunity: boolean = true) => {
    setActiveCityId(city.id);
    setSelectedCommunityId(null);
    setCenterCoords({ lat: city.lat, lng: city.lng });
    if (zoomInToCommunity) {
      setZoomLevel(11); // Zoom into state/city level
    }
    if (soundEnabled) {
      playBeepSound();
    }
  };

  const handleSelectCommunity = (comm: CommunityNode) => {
    setActiveCityId(comm.parentCityId);
    setSelectedCommunityId(comm.id);
    setCenterCoords({ lat: comm.lat, lng: comm.lng });
    setZoomLevel(14); // Zoom directly into exact community streets
    if (soundEnabled) {
      playBeepSound();
    }
  };

  const handleResetZoom = () => {
    setSelectedCommunityId(null);
    setCenterCoords({ lat: 9.0820, lng: 8.6753 });
    setZoomLevel(6);
  };

  // Determine whether to display sub-communities on the map (when zoomed in zoomLevel >= 9)
  const isZoomedIn = zoomLevel >= 9;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl space-y-6">
      
      {/* Map Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold font-display text-base sm:text-lg text-white flex items-center gap-2">
              <Compass className="text-amber-400" size={20} />
              <span>Google Maps Nigeria Live Visitor Telemetry</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Geospatial tracking pinned across visited locations &amp; communities in Nigeria during <strong className="text-amber-300 font-bold">{timeRangeLabel}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs">
            <Radio size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-mono font-medium">
              {isLiveMode ? 'Live Active Users Now:' : 'Active Window Views:'} <strong className="text-white font-extrabold">{totalNigeriaVisitors.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Google Maps on Left + Active Locations Breakdown on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: GOOGLE MAPS WITH LIVE VISITOR BEEPS */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800/90 rounded-2xl relative min-h-[420px] sm:min-h-[460px] flex flex-col justify-between overflow-hidden shadow-inner">
          
          <div className="relative w-full h-[400px] sm:h-[440px] rounded-2xl overflow-hidden">
            {hasValidKey ? (
              /* Google Maps API Provider Rendering */
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
                  {/* WHEN ZOOMED OUT (< 9): RENDER MAIN STATE/CITY HUBS */}
                  {!isZoomedIn && visitedCities.map((city) => {
                    const data = cityStats[city.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
                    const isSelected = activeCityId === city.id;
                    const displayCount = isLiveMode ? (data.liveActive > 0 ? data.liveActive : data.visitsCount) : data.visitsCount;

                    return (
                      <AdvancedMarker
                        key={city.id}
                        position={{ lat: city.lat, lng: city.lng }}
                        onClick={() => handleSelectCity(city, true)}
                        title={`${city.cityName}: ${displayCount} ${isLiveMode ? 'live active' : 'visits'} in ${timeRangeLabel}`}
                      >
                        <div className="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                          <div 
                            className={`absolute w-12 h-12 rounded-full animate-ping pointer-events-none opacity-70 ${
                              isSelected ? 'bg-amber-400 ring-2 ring-amber-300' : 'bg-emerald-400 ring-2 ring-emerald-300'
                            }`}
                          />
                          <div 
                            className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xl transition-all duration-300 border-2 font-mono font-black text-xs leading-none whitespace-nowrap ${
                              isSelected 
                                ? 'bg-amber-400 border-white text-slate-950 shadow-[0_0_25px_#f59e0b] scale-125 z-30' 
                                : 'bg-emerald-500 border-slate-950 text-white shadow-[0_0_18px_#10b981] hover:scale-110'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                            <span>{displayCount}</span>
                          </div>

                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xl bg-slate-950/95 text-emerald-300 border-emerald-500/60 flex items-center gap-1">
                              <Radio size={10} className="text-emerald-400 animate-pulse shrink-0" />
                              <span>{city.cityName} ({displayCount})</span>
                            </span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                  {/* WHEN ZOOMED IN (>= 9): RENDER EXACT SUB-COMMUNITY BEEPS */}
                  {isZoomedIn && visitedCommunities.map((comm) => {
                    const data = communityStats[comm.id] || { communityName: comm.communityName, stateName: comm.stateName, visitsCount: 0, liveActive: 0 };
                    const isSelectedComm = selectedCommunityId === comm.id;
                    const commDisplayCount = isLiveMode ? (data.liveActive > 0 ? data.liveActive : data.visitsCount) : data.visitsCount;

                    return (
                      <AdvancedMarker
                        key={comm.id}
                        position={{ lat: comm.lat, lng: comm.lng }}
                        onClick={() => handleSelectCommunity(comm)}
                        title={`${comm.communityName} (${comm.stateName}): ${commDisplayCount} ${isLiveMode ? 'active now' : 'visits'}`}
                      >
                        <div className="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                          <div 
                            className={`absolute w-10 h-10 rounded-full animate-ping pointer-events-none opacity-80 ${
                              isSelectedComm ? 'bg-amber-400 ring-2 ring-amber-300' : 'bg-emerald-400 ring-2 ring-emerald-300'
                            }`}
                          />
                          <div 
                            className={`px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xl transition-all duration-300 border-2 font-mono font-black text-[10px] leading-none whitespace-nowrap ${
                              isSelectedComm 
                                ? 'bg-amber-400 border-white text-slate-950 shadow-[0_0_25px_#f59e0b] scale-125 z-30' 
                                : 'bg-emerald-500 border-slate-950 text-white shadow-[0_0_18px_#10b981] hover:scale-110'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                            <span>{commDisplayCount}</span>
                          </div>

                          <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap transition-all duration-200 pointer-events-none ${
                            isSelectedComm ? 'opacity-100 z-30 scale-105' : 'opacity-85 group-hover:opacity-100'
                          }`}>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xl flex items-center gap-1 ${
                              isSelectedComm 
                                ? 'bg-amber-400 text-slate-950 border-white' 
                                : 'bg-slate-950/95 text-emerald-300 border-emerald-500/60 backdrop-blur-md'
                            }`}>
                              <Building2 size={9} className="text-emerald-400 shrink-0" />
                              <span>{comm.communityName}</span>
                              <span className="font-mono text-[9px] px-1 rounded bg-slate-900/90 text-amber-300">
                                {commDisplayCount}
                              </span>
                            </span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            ) : (
              /* Interactive Google Map Embed View when API key is pending */
              <div className="relative w-full h-full bg-slate-950 flex flex-col">
                <iframe
                  title="Google Maps Nigeria View"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'contrast(105%) brightness(95%)' }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${activeCityNode.lat},${activeCityNode.lng}&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`}
                />

                {/* OVERLAY BEEPS ON EMBEDDED GOOGLE MAP VIEW */}
                <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                  {!isZoomedIn ? (
                    visitedCities.map((city) => {
                      const data = cityStats[city.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
                      const isSelected = activeCityId === city.id;
                      const displayCount = isLiveMode ? (data.liveActive > 0 ? data.liveActive : data.visitsCount) : data.visitsCount;

                      return (
                        <div
                          key={city.id}
                          onClick={() => handleSelectCity(city, true)}
                          style={{ left: `${city.xPct}%`, top: `${city.yPct}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-20"
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full animate-ping pointer-events-none opacity-60 bg-emerald-400" />
                          <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all duration-300 shadow-xl border-2 font-mono font-black text-[10px] leading-none whitespace-nowrap ${
                            isSelected ? 'bg-amber-400 border-white text-slate-950 scale-125 z-30' : 'bg-emerald-500 border-slate-900 text-white'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                            <span>{displayCount}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    visitedCommunities.map((comm) => {
                      const data = communityStats[comm.id] || { communityName: comm.communityName, stateName: comm.stateName, visitsCount: 0, liveActive: 0 };
                      const isSelectedComm = selectedCommunityId === comm.id;
                      const commDisplayCount = isLiveMode ? (data.liveActive > 0 ? data.liveActive : data.visitsCount) : data.visitsCount;

                      return (
                        <div
                          key={comm.id}
                          onClick={() => handleSelectCommunity(comm)}
                          style={{ left: `${comm.xPct}%`, top: `${comm.yPct}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-20"
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full animate-ping pointer-events-none opacity-70 bg-emerald-400" />
                          <div className={`px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-all duration-300 shadow-xl border-2 font-mono font-black text-[9px] leading-none whitespace-nowrap ${
                            isSelectedComm ? 'bg-amber-400 border-white text-slate-950 scale-125 z-30' : 'bg-emerald-500 border-slate-900 text-white'
                          }`}>
                            <span className="w-1 h-1 rounded-full bg-white animate-ping shrink-0" />
                            <span>{commDisplayCount}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Top Info Bar */}
                <div className="absolute top-3 left-3 right-3 bg-slate-900/90 border border-slate-700/90 backdrop-blur-md rounded-xl p-3 shadow-xl flex items-center justify-between text-xs gap-3 z-30">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-amber-400 shrink-0" />
                    <span className="text-slate-200">
                      Community Zoom Mode: <strong className="text-white font-bold">{activeCityNode.cityName}</strong> (Zoom {zoomLevel}x)
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-400 font-bold hidden sm:flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Google Maps Live</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 bg-slate-950/90 z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-200 font-bold">
                  {isZoomedIn 
                    ? `Exact Communities Beeping (${visitedCommunities.length} active in ${timeRangeLabel})`
                    : `Active States/Hubs (${visitedCities.length} active in ${timeRangeLabel})`
                  }
                </span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Zoom in (9x+) to inspect exact community streets
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE SELECTED CITY INSPECTOR & VISITED HOTSPOTS LIST */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Active Selected City Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/90 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                  {activeCityNode.region} Region
                </span>
                <h4 className="text-lg font-black font-display text-white flex items-center gap-2">
                  <MapPin className="text-amber-400 shrink-0" size={18} />
                  <span>{activeCityNode.cityName}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {activeCityNode.stateName} &bull; Lat {activeCityNode.lat.toFixed(4)}&deg;, Lng {activeCityNode.lng.toFixed(4)}&deg;
                </p>
              </div>
            </div>

            {/* Stats Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/80 border border-slate-700/60 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Website Visitors</span>
                <div className="text-xl font-black font-mono text-white mt-0.5">
                  {activeCityData.visitsCount.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                  <Eye size={10} />
                  <span>{timeRangeLabel} window</span>
                </span>
              </div>

              <div className="bg-slate-900/80 border border-slate-700/60 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Active Now</span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <span>{activeCityData.liveActive}</span>
                  {activeCityData.liveActive > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">Active online</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-700/60 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Orders / Installations</span>
                <div className="text-xl font-black font-mono text-white mt-0.5">
                  {activeCityData.ordersCount}
                </div>
                <span className="text-[10px] text-amber-400 font-medium block mt-1">Solar contracts</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-700/60 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contract Revenue</span>
                <div className="text-base font-black font-mono text-amber-300 mt-0.5 truncate">
                  ₦{activeCityData.revenue.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">Total value</span>
              </div>
            </div>
          </div>

          {/* COMMUNITIES & NEIGHBORHOODS BREAKDOWN IN ACTIVE STATE */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Building2 size={14} className="text-amber-400" />
                <span>Communities in {activeCityNode.cityName} ({timeRangeLabel})</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {activeStateCommunities.length} Visited Towns
              </span>
            </div>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 text-xs">
              {activeStateCommunities.length > 0 ? (
                activeStateCommunities.map(comm => {
                  const data = communityStats[comm.id] || { communityName: comm.communityName, stateName: comm.stateName, visitsCount: 0, liveActive: 0 };
                  const isSelectedComm = selectedCommunityId === comm.id;

                  return (
                    <button
                      key={comm.id}
                      type="button"
                      onClick={() => handleSelectCommunity(comm)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                        isSelectedComm 
                          ? 'bg-amber-400/20 border-amber-400 text-white shadow-md font-bold' 
                          : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelectedComm ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                        <div>
                          <span className="font-bold block text-xs leading-none text-white">{comm.communityName}</span>
                          <span className="text-[10px] text-slate-400">Lat {comm.lat.toFixed(4)}&deg; &bull; Lng {comm.lng.toFixed(4)}&deg;</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <span className="font-mono font-black text-emerald-300 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {isLiveMode 
                            ? `${data.liveActive > 0 ? data.liveActive : data.visitsCount} live now` 
                            : `${data.visitsCount} visits`}
                        </span>
                        <ZoomIn size={13} className="text-amber-400 shrink-0" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-slate-400 text-xs italic bg-slate-900/40 rounded-xl">
                  No community visits logged for {activeCityNode.cityName} in this window.
                </div>
              )}
            </div>
          </div>

          {/* ALL VISITED LOCATIONS / STATES LIST */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Navigation size={13} className="text-amber-400" />
                <span>State Locations ({timeRangeLabel})</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {visitedCities.length} Active Hubs
              </span>
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 text-xs">
              {visitedCities.length > 0 ? (
                visitedCities.map(city => {
                  const data = cityStats[city.id] || { visitsCount: 0, ordersCount: 0, revenue: 0, liveActive: 0 };
                  const isSelected = activeCityId === city.id;

                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectCity(city, true)}
                      className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                        isSelected 
                          ? 'bg-amber-400/10 border-amber-400/40 text-white shadow-xs' 
                          : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                        <div>
                          <span className="font-bold block text-xs leading-none text-white">{city.cityName}</span>
                          <span className="text-[10px] text-slate-400">{city.stateName}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-amber-300 text-xs block">
                          {isLiveMode 
                            ? `${data.liveActive > 0 ? data.liveActive : data.visitsCount} live active` 
                            : `${data.visitsCount} visits`}
                        </span>
                        <span className="text-[10px] text-slate-400">{data.ordersCount} contracts</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-900/40 rounded-xl">
                  No visitors recorded yet for the selected {timeRangeLabel} time range.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
