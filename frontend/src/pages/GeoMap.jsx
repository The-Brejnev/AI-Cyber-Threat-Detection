import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format } from 'date-fns';
import {
  Globe, Shield, AlertTriangle, Radio, Ban, Crosshair,
  Search, Eye, Layers, RefreshCw, Zap, Server, Activity,
  ArrowRight, MapPin, CheckCircle, Navigation, ExternalLink
} from 'lucide-react';
import { geoAPI, blockedIPsAPI } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Fix Leaflet default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Protected Sensor Node Anchor Icon
const targetSensorIcon = L.divIcon({
  className: 'custom-sensor-icon',
  html: `
    <div style="position: relative; width: 28px; height: 28px;">
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(34, 197, 94, 0.25); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; top: 5px; left: 5px; width: 18px; height: 18px; border-radius: 50%; background: #22c55e; border: 2px solid #ffffff; box-shadow: 0 0 14px #22c55e;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const TILE_SERVERS = {
  dark: {
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  voyager: {
    name: 'CartoDB Voyager (Night)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  satellite: {
    name: 'High-Contrast Radar',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ'
  }
};

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  NORMAL: '#6b7280'
};

// Map panning helper component
const MapPanController = ({ targetCoords, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && targetCoords[0] && targetCoords[1]) {
      map.flyTo(targetCoords, zoom || 6, { duration: 1.5 });
    }
  }, [targetCoords, zoom, map]);
  return null;
};

const GeoMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedParamIP = searchParams.get('focus');

  const [locations, setLocations] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [countries, setCountries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [targetSensor, setTargetSensor] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Customization & Filter states
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showVectors, setShowVectors] = useState(true);
  const [tileMode, setTileMode] = useState('dark');
  const [search, setSearch] = useState('');
  const [selectedIP, setSelectedIP] = useState(null);
  const [mapCenter, setMapCenter] = useState([25, 0]);
  const [mapZoom, setMapZoom] = useState(2);

  const fetchGeoData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (severityFilter !== 'ALL') {
        params.severity = severityFilter;
      }
      const { data } = await geoAPI.getThreats(params);
      
      const locList = Array.isArray(data) ? data : (data.locations || []);
      const attackList = data.attacks || [];
      const countryList = data.countries || [];
      const targetData = data.target || {
        lat: 37.7749,
        lon: -122.4194,
        name: 'Your Monitored System (SOC Gateway)',
        ip_address: '192.168.1.105'
      };
      
      setLocations(locList);
      setAttacks(attackList);
      setCountries(countryList);
      setTargetSensor(targetData);
      setSummary(data.summary || {
        total_mapped_ips: locList.length,
        countries_count: countryList.length,
        top_country: countryList[0]?.country || 'None',
        active_threats_mapped: locList.reduce((acc, cur) => acc + (cur.threat_count || 1), 0),
        user_system_ip: targetData.ip_address || '192.168.1.105',
        user_system_name: targetData.name || 'Your Monitored System'
      });

      // If URL has ?focus=IP, focus on it
      if (focusedParamIP) {
        const found = locList.find(l => l.ip === focusedParamIP);
        if (found) {
          setSelectedIP(found);
          setMapCenter([found.lat, found.lon]);
          setMapZoom(7);
          toast.success(`Focused on attacking host: ${focusedParamIP}`, { icon: '🎯' });
        } else {
          // If not in top list, query single IP lookup
          try {
            const singleGeo = await geoAPI.getIPInfo(focusedParamIP);
            if (singleGeo.data && singleGeo.data.lat) {
              const customLoc = {
                ip: focusedParamIP,
                country: singleGeo.data.country || 'Unknown',
                city: singleGeo.data.city || '',
                lat: singleGeo.data.lat,
                lon: singleGeo.data.lon,
                isp: singleGeo.data.isp || 'Autonomous System',
                threat_count: 1,
                worst_severity: 'HIGH',
                threat_types: ['ACTIVE_ATTACK'],
                destination_ip: targetData.ip_address || '192.168.1.105',
                destination_port: 22
              };
              setLocations(prev => [customLoc, ...prev]);
              setSelectedIP(customLoc);
              setMapCenter([singleGeo.data.lat, singleGeo.data.lon]);
              setMapZoom(7);
              toast.success(`Located attacking host: ${focusedParamIP}`, { icon: '🎯' });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('Error fetching geo data:', error);
      toast.error('Failed to load global threat coordinates');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, focusedParamIP]);

  useEffect(() => {
    fetchGeoData();
  }, [fetchGeoData]);

  // Handle instant firewall blocking from map
  const handleQuickBlock = async (ip, reason, threatType) => {
    try {
      await blockedIPsAPI.blockIP({
        ip_address: ip,
        reason: reason || 'Identified active malicious source on Global Threat Map',
        threat_type: threatType || 'THREAT_MAP_SOURCE'
      });
      toast.success(`Enforced immediate firewall block on ${ip}`);
      fetchGeoData();
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to block ${ip}`);
    }
  };

  const focusLocation = (loc) => {
    setSelectedIP(loc);
    setMapCenter([loc.lat, loc.lon]);
    setMapZoom(7);
  };

  const filteredLocations = locations.filter(loc => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      loc.ip.toLowerCase().includes(q) ||
      (loc.country && loc.country.toLowerCase().includes(q)) ||
      (loc.city && loc.city.toLowerCase().includes(q)) ||
      (loc.isp && loc.isp.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* Top Header & Tactical Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyber-blue" />
            Global Threat Geolocation & Attack Trajectory Radar
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Visualizing inbound attack origins (Public IPs) targeting your protected system (<span className="text-green-400 font-mono font-medium">{summary?.user_system_ip || '192.168.1.105'}</span>)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Attack Vector Toggle */}
          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showVectors
                ? 'bg-blue-500/20 border-cyber-blue text-cyber-blue'
                : 'bg-cyber-surface border-cyber-border text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {showVectors ? 'Attack Vectors ON' : 'Vectors OFF'}
          </button>

          {/* Tile Switcher */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg p-0.5 flex items-center">
            {Object.keys(TILE_SERVERS).map(key => (
              <button
                key={key}
                onClick={() => setTileMode(key)}
                className={`px-2.5 py-1 text-xs rounded capitalize transition-colors ${
                  tileMode === key ? 'bg-cyber-blue text-black font-semibold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-cyber-surface border border-cyber-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchGeoData}
            className="p-1.5 bg-cyber-card hover:bg-cyber-surface border border-cyber-border rounded-lg text-gray-300 transition-colors"
            title="Refresh Map Coordinates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Source vs Destination Flow Banner */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Source Attack Side */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Attack Source (Inbound Host)</p>
            <p className="font-mono text-white text-sm font-semibold">
              {selectedIP ? `${selectedIP.ip} (${selectedIP.city ? `${selectedIP.city}, ` : ''}${selectedIP.country})` : `${summary?.total_mapped_ips || 0} Global Malicious IPs`}
            </p>
          </div>
        </div>

        {/* Dynamic Trajectory Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-cyber-surface rounded-full border border-cyber-border text-gray-400 font-mono text-[11px]">
          <span className="text-red-400 font-bold">Source Public IP</span>
          <ArrowRight className="w-4 h-4 text-cyber-blue animate-pulse" />
          <span className="text-green-400 font-bold">Your Target Subnet</span>
        </div>

        {/* Protected Destination Side */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          <div className="text-left md:text-right">
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Protected Destination (Your System)</p>
            <p className="font-mono text-green-400 text-sm font-bold">
              {targetSensor?.ip_address || '192.168.1.105'} <span className="text-gray-400 font-normal text-xs">({targetSensor?.name || 'Local Gateway'})</span>
            </p>
          </div>
          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            <Server className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Selected Attacker Inspector Card (Displays when an IP is clicked or linked from Threat Analysis) */}
      {selectedIP && (
        <div className="bg-gradient-to-r from-red-950/40 via-cyber-card to-cyber-card border border-red-500/40 rounded-xl p-4 animate-fade-in shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-border pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/40 text-red-400">
                <Crosshair className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white font-mono">{selectedIP.ip}</h2>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${SEVERITY_COLORS[selectedIP.worst_severity || 'HIGH']}20`,
                      color: SEVERITY_COLORS[selectedIP.worst_severity || 'HIGH'],
                      border: `1px solid ${SEVERITY_COLORS[selectedIP.worst_severity || 'HIGH']}40`
                    }}
                  >
                    {selectedIP.worst_severity || 'HIGH'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Origin: <strong className="text-gray-200">{selectedIP.city ? `${selectedIP.city}, ` : ''}{selectedIP.country}</strong> | ISP: <span className="text-gray-300">{selectedIP.isp || 'Autonomous Network'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => focusLocation(selectedIP)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black rounded-lg text-xs font-semibold transition-all"
              >
                <Navigation className="w-3.5 h-3.5" /> Re-Center Radar
              </button>
              <button
                onClick={() => handleQuickBlock(selectedIP.ip, `Blocked from Threat Map Inspection`, selectedIP.threat_types?.[0])}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-red-500/20"
              >
                <Ban className="w-3.5 h-3.5" /> Enforce Block
              </button>
              <button
                onClick={() => setSelectedIP(null)}
                className="text-gray-500 hover:text-white text-xs px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-cyber-surface/60 p-2.5 rounded-lg border border-cyber-border">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Attack Category</p>
              <p className="font-semibold text-white mt-0.5">{(selectedIP.threat_types || []).join(', ') || 'Exploit Probe'}</p>
            </div>
            <div className="bg-cyber-surface/60 p-2.5 rounded-lg border border-cyber-border">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Targeted Destination</p>
              <p className="font-mono text-green-400 mt-0.5">{selectedIP.destination_ip || targetSensor?.ip_address || '192.168.1.105'}:{selectedIP.destination_port || 22}</p>
            </div>
            <div className="bg-cyber-surface/60 p-2.5 rounded-lg border border-cyber-border">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Recorded Hits</p>
              <p className="font-mono text-red-400 font-bold mt-0.5">{selectedIP.threat_count || 1} intrusion events</p>
            </div>
            <div className="bg-cyber-surface/60 p-2.5 rounded-lg border border-cyber-border">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Coordinates</p>
              <p className="font-mono text-gray-300 mt-0.5">{selectedIP.lat?.toFixed(4)}, {selectedIP.lon?.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Main Display: Map + Live Telemetry Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Leaflet Map Canvas */}
        <div className="lg:col-span-8 xl:col-span-9 bg-cyber-card border border-cyber-border rounded-xl overflow-hidden relative" style={{ height: '600px' }}>
          {loading && locations.length === 0 && (
            <div className="absolute inset-0 z-10 bg-cyber-dark/80 flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          )}

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            minZoom={2}
            maxZoom={12}
            style={{ height: '100%', width: '100%', backgroundColor: '#0a0e1a' }}
          >
            <MapPanController targetCoords={mapCenter} zoom={mapZoom} />

            <TileLayer
              url={TILE_SERVERS[tileMode]?.url || TILE_SERVERS.dark.url}
              attribution={TILE_SERVERS[tileMode]?.attribution || TILE_SERVERS.dark.attribution}
            />

            {/* Protected Target Sensor Node Anchor */}
            {targetSensor && (
              <Marker
                position={[targetSensor.lat, targetSensor.lon]}
                icon={targetSensorIcon}
              >
                <Popup className="cyber-popup">
                  <div className="bg-cyber-card text-white p-2.5 min-w-52 text-xs font-sans">
                    <div className="flex items-center gap-1.5 text-green-400 font-bold border-b border-cyber-border pb-1 mb-1.5">
                      <Shield className="w-4 h-4" />
                      {targetSensor.name}
                    </div>
                    <p className="text-gray-300">Protected Subnet: <span className="text-green-400 font-mono font-bold">{targetSensor.ip_address || '192.168.1.105'}</span></p>
                    <p className="text-gray-300">Location: {targetSensor.city}, {targetSensor.country}</p>
                    <p className="text-gray-400 mt-1">Status: <span className="text-green-400 font-semibold">ONLINE (Shield Active)</span></p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Attack Trajectory Lines: Source -> Destination Target */}
            {showVectors && targetSensor && attacks.map((atk, idx) => {
              if (!atk.source?.lat || !atk.source?.lon) return null;
              const color = SEVERITY_COLORS[atk.severity] || '#00d4ff';
              const isHighlighted = selectedIP?.ip === atk.source.ip;

              return (
                <Polyline
                  key={`atk-${idx}`}
                  positions={[
                    [atk.source.lat, atk.source.lon],
                    [targetSensor.lat, targetSensor.lon]
                  ]}
                  pathOptions={{
                    color: isHighlighted ? '#00d4ff' : color,
                    weight: isHighlighted ? 3 : Math.max(1, Math.min(atk.count * 0.4, 2.5)),
                    opacity: isHighlighted ? 0.9 : 0.4,
                    dashArray: isHighlighted ? undefined : '4, 8'
                  }}
                />
              );
            })}

            {/* Threat Origin Locations */}
            {filteredLocations.map((loc, idx) => {
              const severity = loc.worst_severity || 'MEDIUM';
              const color = SEVERITY_COLORS[severity] || '#ef4444';
              const isSelected = selectedIP?.ip === loc.ip;
              const radius = isSelected ? 16 : Math.max(7, Math.min(loc.threat_count * 2.5, 24));

              return (
                <CircleMarker
                  key={`loc-${idx}`}
                  center={[loc.lat, loc.lon]}
                  radius={radius}
                  pathOptions={{
                    fillColor: isSelected ? '#00d4ff' : color,
                    color: isSelected ? '#ffffff' : color,
                    weight: isSelected ? 3 : 2,
                    opacity: 0.95,
                    fillOpacity: isSelected ? 0.8 : 0.45
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedIP(loc);
                    }
                  }}
                >
                  <Popup className="cyber-popup">
                    <div className="bg-cyber-card text-white p-3 min-w-60 text-xs font-sans">
                      <div className="flex items-center justify-between border-b border-cyber-border pb-1.5 mb-2">
                        <span className="font-mono font-bold text-sm text-red-400">{loc.ip}</span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded"
                          style={{ backgroundColor: `${color}20`, color: color, border: `1px solid ${color}40` }}
                        >
                          {severity}
                        </span>
                      </div>

                      <div className="space-y-1 text-gray-300">
                        <p>📍 <strong className="text-white">Origin:</strong> {loc.city ? `${loc.city}, ` : ''}{loc.country}</p>
                        <p>🏢 <strong className="text-white">ISP:</strong> {loc.isp || loc.org}</p>
                        <p>🎯 <strong className="text-white">Target Subnet:</strong> <span className="text-green-400 font-mono">{loc.destination_ip || targetSensor?.ip_address || '192.168.1.105'}:{loc.destination_port || 22}</span></p>
                        <p>⚠️ <strong className="text-white">Threat Category:</strong> {(loc.threat_types || []).join(', ') || 'Exploit Probe'}</p>
                        <p>💥 <strong className="text-white">Inbound Volume:</strong> <span className="font-mono font-bold text-white">{loc.threat_count}</span> hits</p>
                        {loc.last_seen && (
                          <p className="text-[11px] text-gray-400 font-mono">Last Detected: {format(new Date(loc.last_seen), 'MMM dd, HH:mm')}</p>
                        )}
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="mt-3 pt-2 border-t border-cyber-border flex gap-2">
                        <button
                          onClick={() => handleQuickBlock(loc.ip, `Blocked from Threat Map (${severity})`, loc.threat_types?.[0])}
                          className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-medium transition-colors"
                        >
                          <Ban className="w-3 h-3" />
                          Enforce Block
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[400] bg-cyber-card/90 backdrop-blur border border-cyber-border rounded-lg p-2.5 text-xs text-white shadow-xl">
            <p className="font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyber-blue" />
              Threat Severity
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(SEVERITY_COLORS).filter(([k]) => k !== 'NORMAL').map(([sev, c]) => (
                <div key={sev} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                  <span className="text-[11px] text-gray-400">{sev}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Telemetry & Origin Drawer */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search Attacker IP, country, or ISP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-cyber-card border border-cyber-border rounded-xl text-xs text-white focus:outline-none focus:border-cyber-blue"
            />
          </div>

          {/* Top Origin Countries Ranking */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
              <span>Top Attack Origins</span>
              <span className="text-cyber-blue">{countries.length} Nations</span>
            </h2>

            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
              {countries.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No country telemetry recorded</p>
              ) : (
                countries.slice(0, 8).map((c, i) => {
                  const maxVal = countries[0]?.total_threats || 1;
                  const pct = Math.min(100, Math.round((c.total_threats / maxVal) * 100));
                  return (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium flex items-center gap-1.5 truncate max-w-36">
                          <span className="font-mono text-gray-500">{i + 1}.</span>
                          {c.country}
                        </span>
                        <span className="text-gray-400 font-mono text-[11px]">{c.total_threats} hits</span>
                      </div>
                      <div className="h-1 bg-cyber-surface rounded-full overflow-hidden">
                        <div className="h-full bg-cyber-blue rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Inbound Threats List */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex-1 flex flex-col min-h-64">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-400" />
                Active Attacker Coordinates
              </h2>
              <span className="text-[11px] text-gray-500">{filteredLocations.length} Hosts</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
              {filteredLocations.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">No matching threat locations</p>
              ) : (
                filteredLocations.map((loc, idx) => {
                  const sev = loc.worst_severity || 'MEDIUM';
                  const sevColor = SEVERITY_COLORS[sev] || '#ef4444';
                  const isSelected = selectedIP?.ip === loc.ip;

                  return (
                    <div
                      key={idx}
                      onClick={() => focusLocation(loc)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-500/15 border-cyber-blue shadow-md shadow-blue-500/10'
                          : 'bg-cyber-surface border-cyber-border hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-red-400">{loc.ip}</span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${sevColor}20`, color: sevColor }}
                        >
                          {sev}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-400 text-[11px]">
                        <span>{loc.city ? `${loc.city}, ` : ''}{loc.country}</span>
                        <span className="font-mono text-cyber-blue">{loc.threat_count} hits</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-500 text-[10px] mt-1 pt-1 border-t border-cyber-border/40">
                        <span className="truncate max-w-32">{loc.isp}</span>
                        <span className="text-cyber-blue flex items-center gap-0.5 hover:underline font-medium">
                          <Eye className="w-3 h-3" /> Focus Radar
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Leaflet Popups */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
          background-color: #141d35 !important;
          color: white !important;
          border: 1px solid #1e2d4a !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip {
          background-color: #141d35 !important;
          border: 1px solid #1e2d4a !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}} />
    </div>
  );
};

export default GeoMap;
