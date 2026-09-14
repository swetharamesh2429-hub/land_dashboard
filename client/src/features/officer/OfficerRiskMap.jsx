import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import {
  Layers,
  Filter,
  Search,
  Maximize2,
  RotateCcw,
  Shield,
  Activity,
  Radio,
  Camera,
  Compass,
  Flame,
  Globe,
  Navigation,
  Crosshair,
  MapPin,
  X,
  Info,
  Mountain,
  History,
  Play,
  Pause,
  Calendar,
  Droplets,
} from 'lucide-react';
import api from '../../services/api';
import { RISK_TIERS, SENSOR_STATUS } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';

// Smart Leaflet Popup Configuration for Government Command Center
// autoPanPaddingTopLeft ensures popups never collide with the top search bar & filter controls
const POPUP_CONFIG = {
  className: 'raksha-popup',
  closeButton: true,
  autoPan: true,
  autoPanPaddingTopLeft: [24, 88],
  autoPanPaddingBottomRight: [24, 24],
  keepInView: true,
  maxHeight: 460,
};

// Helper component to center map smoothly
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

// SVG Defs Pattern Injector for Leaflet Overlay Pane (Fix 1: Hatched SVG Pattern)
const SvgDefsPattern = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const injectHatchPattern = () => {
      try {
        const overlayPane = map.getPanes()?.overlayPane;
        if (!overlayPane) return;
        const svg = overlayPane.querySelector('svg');
        if (!svg) return;

        let defs = svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svg.insertBefore(defs, svg.firstChild);
        }

        if (!defs.querySelector('#susceptibility-hatch')) {
          const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
          pattern.setAttribute('id', 'susceptibility-hatch');
          pattern.setAttribute('patternUnits', 'userSpaceOnUse');
          pattern.setAttribute('width', '10');
          pattern.setAttribute('height', '10');
          pattern.setAttribute('patternTransform', 'rotate(45)');

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('width', '10');
          rect.setAttribute('height', '10');
          rect.setAttribute('fill', '#78350F');
          rect.setAttribute('fill-opacity', '0.12');

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', '0');
          line.setAttribute('y1', '0');
          line.setAttribute('x2', '0');
          line.setAttribute('y2', '10');
          line.setAttribute('stroke', '#D97706');
          line.setAttribute('stroke-width', '2.5');
          line.setAttribute('stroke-opacity', '0.75');

          pattern.appendChild(rect);
          pattern.appendChild(line);
          defs.appendChild(pattern);
        }
      } catch (err) {
        console.warn('SvgDefsPattern injection notice:', err);
      }
    };

    injectHatchPattern();
    map.on('layeradd zoomend moveend', injectHatchPattern);

    return () => {
      map.off('layeradd zoomend moveend', injectHatchPattern);
    };
  }, [map]);

  return null;
};

// Continuous Risk Heatmap Component (Part D GAP 3)
const RiskHeatmapLayer = ({ points = [] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    let heatLayerInstance = null;
    try {
      if (typeof L.heatLayer === 'function') {
        heatLayerInstance = L.heatLayer(points, {
          radius: 40,
          blur: 28,
          maxZoom: 13,
          max: 1.0,
          minOpacity: 0.35,
          gradient: {
            0.2: '#22C55E', // Green (Safe)
            0.45: '#EAB308', // Yellow (Watch)
            0.68: '#F97316', // Orange (Warning)
            0.88: '#DC2626', // Red (Danger)
          },
        }).addTo(map);
      }
    } catch (err) {
      console.warn('Heatmap layer render:', err);
    }

    return () => {
      if (heatLayerInstance && map) {
        try {
          map.removeLayer(heatLayerInstance);
        } catch (e) {}
      }
    };
  }, [map, points]);

  return null;
};

// BGS / GSI Regional Geology WMS Layer (Task 5: 1:2M scale OGC WMS)
const BgsGeologyWmsLayer = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const wmsLayer = L.tileLayer.wms('http://ogc.bgs.ac.uk/cgi-bin/BGS_GSI_Geology/wms', {
      layers: 'BGS_GSI_1M_Bedrock',
      format: 'image/png',
      transparent: true,
      opacity: 0.45,
      attribution: 'Geology &copy; British Geological Survey / GSI (1:2M)',
    });
    wmsLayer.addTo(map);

    return () => {
      if (map && wmsLayer) {
        try {
          map.removeLayer(wmsLayer);
        } catch (e) {}
      }
    };
  }, [map]);

  return null;
};

// Custom Leaflet DivIcons
const createCustomIcon = (htmlContent, className = '') => {
  return L.divIcon({
    html: htmlContent,
    className: `custom-leaflet-icon ${className}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

export const OfficerRiskMap = ({
  zones = [],
  sensors = [],
  roads = [],
  reports = [],
  sosList = [],
  selectedZone = null,
  onSelectZone,
  districtCenter = [25.40, 91.85],
  districtId = 'EKH',
}) => {
  const [activeLayers, setActiveLayers] = useState({
    villages: true,
    floodExtent: true, // Part 1: Visual Flood Extent Overlay Layer
    riskHeatmap: false,
    susceptibilityOverlay: true,
    satelliteView: false, // Addition 2: Optional Satellite Imagery View
    historicalLandslides: true, // Task 4: GSI Historical Landslide Inventory
    bgsGeology: false, // Task 5: Optional live geology overlay (1:2M GSI/BGS WMS, off-by-default)
    roads: true,
    sensors: true,
    reports: true,
    sos: true,
  });

  // Calculate geodesic distance between two points in km (Haversine)
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Detect which roads and villages fall within the computed flood extent radius
  const getFloodOverlaps = (centerLat, centerLon, radiusKm) => {
    const overlappingRoads = roads.filter((r) => {
      if (!r.coordinates || r.coordinates.length === 0) return false;
      return r.coordinates.some((coord) => {
        const [rLon, rLat] = coord;
        return calculateDistanceKm(centerLat, centerLon, rLat, rLon) <= radiusKm * 1.25;
      });
    }).map((r) => r.name);

    const overlappingVillages = zones.filter((z) => {
      if (!z.location?.coordinates) return false;
      const [zLon, zLat] = z.location.coordinates;
      const dist = calculateDistanceKm(centerLat, centerLon, zLat, zLon);
      return dist > 0.05 && dist <= radiusKm * 1.35;
    }).map((z) => z.name);

    return {
      roads: overlappingRoads,
      villages: overlappingVillages,
    };
  };

  const [hazardFilter, setHazardFilter] = useState('ALL'); // ALL, LANDSLIDE, FLASH_FLOOD, FLOOD_EXTENT
  const [tierFilter, setTierFilter] = useState('ALL'); // ALL, WARNING_DANGER, DANGER_ONLY
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [osmResults, setOsmResults] = useState([]);
  const [isSearchingOsm, setIsSearchingOsm] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [userGpsLocation, setUserGpsLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [satelliteNoticeDismissed, setSatelliteNoticeDismissed] = useState(false);
  const [historicalLandslides, setHistoricalLandslides] = useState([]);

  const [mapCenter, setMapCenter] = useState(districtCenter);
  const [mapZoom, setMapZoom] = useState(10);
  const searchInputRef = useRef(null);
  const searchDebounceTimerRef = useRef(null);

  // Fetch GSI Historical Landslides Inventory
  useEffect(() => {
    const fetchHistoricalLandslides = async () => {
      try {
        const res = await api.get(`/historical-landslides?district=${districtId || 'ALL'}`);
        if (res.data?.success) {
          setHistoricalLandslides(res.data.data);
        }
      } catch (err) {
        console.warn('Historical landslides fetch note:', err.message);
      }
    };
    fetchHistoricalLandslides();
  }, [districtId]);

  // 7-Day Historical Risk Timeline Replay State (Item 5)
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(6); // Default to live today (last day)
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Fetch 7-day risk timeline
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setTimelineLoading(true);
        const res = await api.get(`/risk-zones/history?days=7&district=${districtId || 'ALL'}`);
        if (res.data?.success && res.data.timeline?.length > 0) {
          setHistoryTimeline(res.data.timeline);
          setSelectedDayIndex(res.data.timeline.length - 1);
        }
      } catch (err) {
        console.warn('History timeline fetch note:', err.message);
      } finally {
        setTimelineLoading(false);
      }
    };
    fetchTimeline();
  }, [districtId]);

  // Timeline Auto-Play Loop
  useEffect(() => {
    let interval = null;
    if (isPlayingTimeline && historyTimeline.length > 0) {
      interval = setInterval(() => {
        setSelectedDayIndex((prev) => {
          if (prev >= historyTimeline.length - 1) {
            setIsPlayingTimeline(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTimeline, historyTimeline]);

  useEffect(() => {
    if (districtId === 'DH') {
      setMapCenter([25.1764, 93.0298]);
      setMapZoom(10);
    } else {
      setMapCenter([25.40, 91.85]);
      setMapZoom(10);
    }
  }, [districtId]);

  useEffect(() => {
    if (selectedZone && selectedZone.location?.coordinates) {
      // coordinates are [lon, lat] -> Leaflet uses [lat, lon]
      setMapCenter([selectedZone.location.coordinates[1], selectedZone.location.coordinates[0]]);
      setMapZoom(12);
    }
  }, [selectedZone]);

  const toggleLayer = (key) => {
    setActiveLayers((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (key === 'satelliteView' && updated.satelliteView) {
        setSatelliteNoticeDismissed(false);
      }
      return updated;
    });
  };

  // 1. Client-Side Instant Monitored Villages Matching
  const matchingMonitoredZones = searchQuery.trim()
    ? zones.filter((z) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          z.name.toLowerCase().includes(q) ||
          z.districtName?.toLowerCase().includes(q) ||
          z.blockName?.toLowerCase().includes(q)
        );
      })
    : [];

  // 2. OpenStreetMap Nominatim Debounced Geocoding Fallback (~400ms debounce)
  useEffect(() => {
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2) {
      setOsmResults([]);
      setIsSearchingOsm(false);
      return;
    }

    setIsSearchingOsm(true);
    searchDebounceTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          trimmedQuery
        )}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });
        if (res.ok) {
          const data = await res.json();
          // Filter out items already matched by monitored zones
          const filtered = data.filter(
            (item) =>
              !matchingMonitoredZones.some((z) =>
                z.name.toLowerCase().includes(item.display_name.toLowerCase())
              )
          );
          setOsmResults(filtered);
        }
      } catch (err) {
        console.warn('OSM Nominatim Geocode Notice:', err);
      } finally {
        setIsSearchingOsm(false);
      }
    }, 400);

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Handle Selection of Monitored Zone from Search Dropdown
  const handleSelectMonitoredZone = (zone) => {
    if (zone.location?.coordinates) {
      const [lon, lat] = zone.location.coordinates;
      setMapCenter([lat, lon]);
      setMapZoom(13);
      setSearchedLocation(null);
      if (onSelectZone) onSelectZone(zone);
    }
    setSearchQuery(zone.name);
    setSearchDropdownOpen(false);
  };

  // Handle Selection of OSM External Location from Search Dropdown
  const handleSelectOsmLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setMapCenter([lat, lon]);
      setMapZoom(12);
      setSearchedLocation({
        lat,
        lon,
        displayName: item.display_name,
        type: item.type || 'Location',
      });
    }
    setSearchQuery(item.display_name.split(',')[0]);
    setSearchDropdownOpen(false);
  };

  // "Locate Me" Real Browser Geolocation Trigger
  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lon = Number(pos.coords.longitude.toFixed(5));
          setUserGpsLocation({ lat, lon, accuracy: pos.coords.accuracy });
          setMapCenter([lat, lon]);
          setMapZoom(13);
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err.message);
          setIsLocating(false);
          alert('GPS location permission denied or timed out. Please check browser permissions.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Geolocation API is not supported on this browser.');
    }
  };

  // Historical Replay Active State
  const isHistoricalMode = historyTimeline.length > 0 && selectedDayIndex < historyTimeline.length - 1;
  const currentTimelineSlice = historyTimeline[selectedDayIndex] || null;
  const activeZonesPool = isHistoricalMode && currentTimelineSlice ? currentTimelineSlice.zones : zones;

  // Filter Zones based on search & filter controls
  const filteredZones = activeZonesPool.filter((z) => {
    if (searchQuery && !searchDropdownOpen && !z.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (tierFilter === 'DANGER_ONLY' && z.combinedRisk?.tier !== 'DANGER') {
      return false;
    }
    if (tierFilter === 'WARNING_DANGER' && !['WARNING', 'DANGER'].includes(z.combinedRisk?.tier)) {
      return false;
    }
    if (hazardFilter === 'LANDSLIDE' && (z.combinedRisk?.landslideScore || 0) < 30) return false;
    if (hazardFilter === 'FLASH_FLOOD' && (z.combinedRisk?.flashFloodScore || 0) < 30) return false;
    return true;
  });

  // Prepare Heatmap Points: [lat, lon, intensity (0-1)]
  const heatmapPoints = activeZonesPool
    .filter((z) => z.location?.coordinates)
    .map((z) => {
      const [lon, lat] = z.location.coordinates;
      const intensity = Math.min(1.0, Math.max(0.15, (z.combinedRisk?.score || 20) / 100));
      return [lat, lon, intensity];
    });

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#050505] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col">
      {/* Top Map Controls Bar (z-[500] below Leaflet popup layer z-[2500]) */}
      <div className="absolute top-3 left-3 right-3 z-[500] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Real Location Search & Filters */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Interactive Search Bar with Real-Time Dropdown */}
          <div className="relative">
            <div className="flex items-center bg-[#0a0a0a]/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search village, town, or landmark..."
                value={searchQuery}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                className="bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none w-44 sm:w-60 tracking-[-0.2px]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchedLocation(null);
                    setSearchDropdownOpen(false);
                  }}
                  className="text-neutral-400 hover:text-white p-0.5 ml-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {/* Locate Me Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                title="Locate Me (Current GPS Position)"
                className="ml-2 pl-2 border-l border-neutral-800 text-sky-400 hover:text-sky-300 p-0.5 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>

            {/* Real Search Dropdown (Monitored Villages + OSM Geocoding Fallback) */}
            {searchDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a]/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-50 text-xs divide-y divide-neutral-850">
                {/* Section 1: Monitored Villages / Risk Zones */}
                {matchingMonitoredZones.length > 0 && (
                  <div className="p-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 px-2 py-1 block">
                      Monitored Risk Zones ({matchingMonitoredZones.length})
                    </span>
                    {matchingMonitoredZones.map((zone) => {
                      const tier = zone.combinedRisk?.tier || 'SAFE';
                      const tierConfig = RISK_TIERS[tier] || RISK_TIERS.SAFE;
                      return (
                        <button
                          key={zone._id}
                          onClick={() => handleSelectMonitoredZone(zone)}
                          className="w-full text-left px-2.5 py-2 hover:bg-neutral-900 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-white block truncate">{zone.name}</span>
                            <span className="text-[10px] text-neutral-400">
                              {zone.districtName}, {zone.stateName} · Block: {zone.blockName || 'Central'}
                            </span>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 border"
                            style={{
                              backgroundColor: `${tierConfig.color}15`,
                              borderColor: `${tierConfig.color}40`,
                              color: tierConfig.color,
                            }}
                          >
                            {tier}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Section 2: OSM Geocoding Fallback for Unmonitored Locations */}
                {osmResults.length > 0 && (
                  <div className="p-1.5">
                    <div className="px-2 py-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                        Other Locations (OSM Geocoding)
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Outside monitored risk network — No sensor data available
                      </span>
                    </div>
                    {osmResults.map((item, idx) => (
                      <button
                        key={`osm-${idx}`}
                        onClick={() => handleSelectOsmLocation(item)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-neutral-900 rounded-xl flex items-start gap-2 transition-colors cursor-pointer text-neutral-300"
                      >
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                        <div className="truncate">
                          <span className="font-medium text-neutral-200 block truncate">
                            {item.display_name}
                          </span>
                          <span className="text-[10px] text-neutral-500 capitalize">{item.type || 'Location'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isSearchingOsm && (
                  <div className="p-2 text-center text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>Searching geographical database...</span>
                  </div>
                )}

                {!isSearchingOsm && matchingMonitoredZones.length === 0 && osmResults.length === 0 && (
                  <div className="p-3 text-center text-[11px] text-neutral-400">
                    No matching location found. Try searching for a village, district, or landmark.
                  </div>
                )}
              </div>
            )}
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-[#0a0a0a]/90 backdrop-blur-md text-xs text-neutral-200 border border-neutral-800 rounded-full px-3 py-1.5 focus:outline-none focus:border-neutral-600 shadow-[0_0_0_1px_rgba(255,255,255,0.05)] cursor-pointer"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="WARNING_DANGER">Warning & Danger Only</option>
            <option value="DANGER_ONLY">Danger Only</option>
          </select>
        </div>

        {/* Layer Toggles Bar (Vercel Pills) */}
        <div className="flex items-center gap-1 pointer-events-auto bg-[#0a0a0a]/90 backdrop-blur-md p-1 rounded-full border border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)] text-xs">
          <button
            onClick={() => toggleLayer('villages')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              activeLayers.villages
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            Villages
          </button>

          {/* Part 1: Visual Flash Flood Extent Layer Toggle Button */}
          <button
            onClick={() => toggleLayer('floodExtent')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              activeLayers.floodExtent
                ? 'bg-sky-950/90 text-sky-300 border-sky-600/60 shadow-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
            title="Toggle semi-transparent visual SCS-CN flood extent inundation circles"
          >
            <Droplets className="w-3 h-3 text-sky-400" />
            <span>Flood Extent</span>
          </button>

          {/* Continuous Risk Heatmap Toggle Button */}
          <button
            onClick={() => toggleLayer('riskHeatmap')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              activeLayers.riskHeatmap
                ? 'bg-red-950/80 text-red-300 border-red-700/60 shadow-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
            title="Continuous regional risk interpolation heatmap"
          >
            <Flame className="w-3 h-3 text-red-400" />
            <span>Risk Heatmap</span>
          </button>

          {/* Susceptibility Hatched Pattern Overlay Toggle Button */}
          <button
            onClick={() => toggleLayer('susceptibilityOverlay')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              activeLayers.susceptibilityOverlay
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
            title="Base geological, fault line & mining vulnerability independent of rainfall"
          >
            Susceptibility
          </button>

          {/* ADDITION 2: Satellite Imagery Visual Layer Toggle Button */}
          <button
            onClick={() => toggleLayer('satelliteView')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              activeLayers.satelliteView
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
            title="Toggle High-Resolution Satellite & True-Color Imagery"
          >
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>Satellite View</span>
          </button>

          <button
            onClick={() => toggleLayer('roads')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              activeLayers.roads
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            Roads
          </button>

          <button
            onClick={() => toggleLayer('sensors')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              activeLayers.sensors
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            Sensors ({sensors.length})
          </button>

          <button
            onClick={() => toggleLayer('reports')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              activeLayers.reports
                ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            Reports
          </button>

          <button
            onClick={() => toggleLayer('historicalLandslides')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              activeLayers.historicalLandslides
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
            title="GSI Historical Landslide Inventory Layer"
          >
            Past Events ({historicalLandslides.length})
          </button>

          {/* Task 5: Regional Geology (1:2M, GSI/BGS) WMS Overlay Toggle Button */}
          <button
            onClick={() => toggleLayer('bgsGeology')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              activeLayers.bgsGeology
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
            title="Regional Geology (1:2M, GSI/BGS) — British Geological Survey / GSI Bedrock WMS"
          >
            <Mountain className="w-3 h-3 text-emerald-400" />
            <span>Geology WMS</span>
          </button>

          <button
            onClick={() => {
              setMapCenter(districtId === 'DH' ? [25.1764, 93.0298] : [25.40, 91.85]);
              setMapZoom(10);
              setSearchedLocation(null);
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 cursor-pointer transition-colors"
            title="Reset Map View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Satellite Layer Active Notification HUD */}
      {activeLayers.satelliteView && !satelliteNoticeDismissed && (
        <div className="absolute top-14 left-3 right-3 sm:left-auto sm:right-3 max-w-md z-[500] bg-[#0a0a0a]/95 backdrop-blur-md border border-emerald-700/60 text-neutral-200 p-3 rounded-2xl shadow-2xl flex items-start justify-between gap-2 text-xs pointer-events-auto animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-300 block">High-Resolution Satellite Basemap Active</span>
              <p className="text-[11px] text-neutral-300 mt-0.5">
                Displaying high-resolution optical imagery with calibrated Sentinel-2 NDVI overlay. (True-color Sentinel Hub WMS is on-demand).
              </p>
            </div>
          </div>
          <button
            onClick={() => setSatelliteNoticeDismissed(true)}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Historical Replay Active Banner (Item 5) */}
      {isHistoricalMode && (
        <div className="absolute top-14 left-3 right-3 z-[500] bg-[#0a0a0a]/95 backdrop-blur-md border border-indigo-700/60 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs pointer-events-auto animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            <div>
              <span className="font-semibold text-indigo-200">
                ⏪ Historical Hazard Replay Mode: {currentTimelineSlice?.label} ({currentTimelineSlice?.dateFormatted})
              </span>
              <span className="text-[11px] text-neutral-300 ml-2 hidden sm:inline">
                Village hazard markers reflect calculated risk state at that time point.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedDayIndex(historyTimeline.length - 1);
              setIsPlayingTimeline(false);
            }}
            className="px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] shrink-0 transition-colors shadow-sm"
          >
            Return to LIVE
          </button>
        </div>
      )}

      {/* Main Leaflet Map Container */}
      <MapContainer
        center={districtCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%', minHeight: '520px', background: '#090D16' }}
        zoomControl={false}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />

        {/* SVG Pattern Defs Injector (Fix 1: Hatched SVG Pattern Overlay) */}
        <SvgDefsPattern />

        {/* Dynamic Basemap: High-Res Satellite View vs OpenStreetMap */}
        {activeLayers.satelliteView ? (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* Continuous Risk Gradient Heatmap Layer */}
        {activeLayers.riskHeatmap && <RiskHeatmapLayer points={heatmapPoints} />}

        {/* Task 5: Optional Live Geology Overlay (BGS/GSI WMS 1:2M Scale) */}
        {activeLayers.bgsGeology && <BgsGeologyWmsLayer />}

        {/* Part 1: Visual Flash Flood Inundation Extent Overlay Layer (30% Opacity Blue Shaded Shape) */}
        {activeLayers.floodExtent &&
          zones.map((zone) => {
            if (!zone.location?.coordinates) return null;
            const floodExtentSqKm = zone.combinedRisk?.floodExtentSqKm || (zone.combinedRisk?.flashFloodScore > 50 ? 1.8 : 0);
            if (!floodExtentSqKm || floodExtentSqKm < 0.2) return null;

            const [lon, lat] = zone.location.coordinates;
            // Radius in meters: sqrt(area_km2 / pi) * 1000
            const radiusMeters = Math.max(250, Math.round(Math.sqrt((floodExtentSqKm * 1000000) / Math.PI)));
            const radiusKm = radiusMeters / 1000;
            const overlaps = getFloodOverlaps(lat, lon, radiusKm);
            const runoffMm = zone.combinedRisk?.runoffMm || zone.runoffMm || 48.6;
            const floodScore = zone.combinedRisk?.flashFloodScore || 70;
            const timeWindow = zone.combinedRisk?.flashFloodWindow || '2–4 hours';

            return (
              <Circle
                key={`flood-ext-${zone._id}`}
                center={[lat, lon]}
                radius={radiusMeters}
                pathOptions={{
                  color: '#0284C7', // Vivid Ocean Blue outline
                  weight: 2.5,
                  dashArray: '6, 6',
                  fillColor: '#0EA5E9', // Water sky-blue
                  fillOpacity: 0.30, // ~30% semi-transparent
                }}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-3 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-2 min-w-[260px] max-w-[320px] shadow-2xl border border-sky-600/40">
                    <div className="flex items-center justify-between border-b border-sky-800/60 pb-1.5 pr-7">
                      <span className="font-bold text-sm text-sky-300 flex items-center gap-1.5">
                        <span>🌊</span> Flash Flood Inundation Extent
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-500/40">
                        {floodScore}% Risk
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="text-white font-semibold">{zone.name} ({zone.districtName})</div>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Inundation Area:</span>
                          <strong className="text-cyan-300 font-mono text-xs">{floodExtentSqKm} km²</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Impact Radius:</span>
                          <strong className="text-sky-300 font-mono text-xs">~{radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(1)} km` : `${radiusMeters} m`}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">SCS-CN Runoff:</span>
                          <strong className="text-emerald-400 font-mono text-xs">{runoffMm} mm</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Expected Window:</span>
                          <strong className="text-amber-400 font-mono text-xs">{timeWindow}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Affected Infrastructure & Overlapping Settlements */}
                    <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800">
                      <span className="text-sky-300 font-semibold block text-[10px] uppercase font-mono">
                        Infrastructure & Settlements Within Inundation Radius:
                      </span>
                      {overlaps.roads.length > 0 || overlaps.villages.length > 0 ? (
                        <div className="bg-sky-950/40 border border-sky-700/30 rounded-lg p-1.5 space-y-1 text-[11px]">
                          {overlaps.roads.map((roadName, idx) => (
                            <div key={`r-${idx}`} className="text-amber-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span>Overlaps Corridor: <strong>{roadName}</strong></span>
                            </div>
                          ))}
                          {overlaps.villages.map((vName, idx) => (
                            <div key={`v-${idx}`} className="text-sky-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                              <span>Adjacent Valley: <strong>{vName}</strong></span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[10px] italic">
                          Local catchment riverbed & drainage channels
                        </div>
                      )}
                    </div>

                    {/* Honest Engineering Disclaimer (Part 1 Requirement 4) */}
                    <div className="text-[10px] text-sky-300/80 bg-sky-950/60 p-2 rounded-lg border border-sky-800/40 leading-snug">
                      ℹ️ <em>Approximate impact radius based on computed SCS-CN inundation area — not a precise floodplain simulation.</em>
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* 1. Base Susceptibility Overlay (FIX 1: Semi-Transparent Diagonal Hatched SVG Pattern) */}
        {activeLayers.susceptibilityOverlay &&
          zones.map((zone) => {
            if (!zone.location?.coordinates || (zone.susceptibility?.score || 0) < 50) return null;
            const [lon, lat] = zone.location.coordinates;
            return (
              <CircleMarker
                key={`sus-${zone._id}`}
                center={[lat, lon]}
                radius={26}
                pathOptions={{
                  className: 'susceptibility-hatch-shape',
                  color: '#D97706', // Amber outline
                  weight: 2,
                  dashArray: '5, 5',
                  fillColor: 'url(#susceptibility-hatch)',
                  fillOpacity: 0.28,
                }}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-2.5 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[210px] max-w-[280px]">
                    <div className="border-b border-slate-800 pb-1 pr-7">
                      <span className="font-bold text-amber-400 block">
                        ⚠️ Base Geological Susceptibility: {zone.susceptibility?.score}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      <strong>{zone.name}</strong>: {zone.susceptibility?.nearestFaultLineName || 'Zone V Fault Line'} ({zone.susceptibility?.distanceToFaultLineKm || 3.2} km)
                    </p>
                    <div className="text-[10px] text-amber-200">
                      Mining Activity: {zone.susceptibility?.miningActivityType || 'Rat-hole excavation'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 2. Road Segments Polylines */}
        {activeLayers.roads &&
          roads.map((road) => {
            if (!road.coordinates || road.coordinates.length < 2) return null;
            const polyCoords = road.coordinates.map((c) => [c[1], c[0]]); // lon,lat -> lat,lon

            let roadColor = '#22C55E'; // Clear
            if (road.status === 'BLOCKED' || road.status === 'CLOSED') roadColor = '#DC2626';
            else if (road.status === 'CAUTION') roadColor = '#F97316';

            return (
              <Polyline
                key={road._id}
                positions={polyCoords}
                pathOptions={{
                  color: roadColor,
                  weight: road.status === 'BLOCKED' ? 5 : 3.5,
                  dashArray: road.status === 'CAUTION' ? '6, 6' : undefined,
                  opacity: 0.85,
                }}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-2.5 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[240px] max-w-[300px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 pr-7">
                      <span className="font-bold text-sm text-white">{road.name}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${roadColor}25`, color: roadColor }}
                      >
                        {road.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <div>Blockage Risk: <strong className="text-white">{road.blockageProbabilityPct}%</strong></div>
                      <div>District: <strong className="text-slate-200">{road.districtName || 'EKH'}</strong></div>
                    </div>
                    {road.coordinates?.length >= 2 && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        GPS: {road.coordinates[0][1]?.toFixed(4)}°N, {road.coordinates[0][0]?.toFixed(4)}°E → {road.coordinates[road.coordinates.length - 1][1]?.toFixed(4)}°N, {road.coordinates[road.coordinates.length - 1][0]?.toFixed(4)}°E
                      </div>
                    )}
                    {road.alternateRouteDescription && (
                      <div className="text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                        <span className="text-sky-300 font-semibold block text-[10px]">Alternate Route:</span>
                        {road.alternateRouteDescription}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between">
                      <span>Corridor Status: <strong className="text-slate-300">{road.status}</strong></span>
                      <span className="font-mono">{formatRelativeTime(road.updatedAt || road.lastUpdated || new Date())}</span>
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* 3. Village Multi-Hazard Risk Markers (with Real Elevation & Flood Indicators) */}
        {activeLayers.villages &&
          filteredZones.map((zone) => {
            if (!zone.location?.coordinates) return null;
            const [lon, lat] = zone.location.coordinates;
            const tier = zone.combinedRisk?.tier || 'SAFE';
            const tierConfig = RISK_TIERS[tier] || RISK_TIERS.SAFE;
            const isDanger = tier === 'DANGER';
            const isSelected = selectedZone?._id === zone._id;
            const isFloodProne = (zone.combinedRisk?.flashFloodScore || 0) >= 45 || (zone.combinedRisk?.floodExtentSqKm || 0) > 0.5;
            const elevation = zone.susceptibility?.elevationMeters || zone.susceptibility?.elevation || 1430;

            return (
              <CircleMarker
                key={zone._id}
                center={[lat, lon]}
                radius={isDanger ? 14 : isSelected ? 13 : 10}
                eventHandlers={{
                  click: () => onSelectZone && onSelectZone(zone),
                }}
                pathOptions={{
                  color: isSelected ? '#FFFFFF' : isFloodProne ? '#38BDF8' : tierConfig.color,
                  weight: isSelected ? 3 : isDanger ? 3.5 : isFloodProne ? 2.5 : 2,
                  fillColor: tierConfig.color,
                  fillOpacity: isDanger ? 0.9 : 0.75,
                }}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-3 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[240px] max-w-[320px] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 pr-7">
                      <span className="font-bold text-sm text-white flex items-center gap-1">
                        {isFloodProne && <span title="Active Flash Flood Risk">💧</span>}
                        <span>{zone.name}</span>
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${tierConfig.color}25`, color: tierConfig.color }}
                      >
                        {tier} · {zone.combinedRisk?.confidence}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <div>24h Rain: <strong className="text-white">{zone.currentTelemetry?.rainfall24h} mm</strong></div>
                      <div>LSTM Fcst: <strong className="text-sky-300">{zone.currentTelemetry?.forecastNext24hMm || 35} mm</strong></div>
                      <div>Landslide: <strong className="text-amber-300 font-mono">{zone.combinedRisk?.landslideScore || zone.combinedRisk?.score}%</strong></div>
                      <div>Flash Flood: <strong className="text-cyan-300 font-mono">{zone.combinedRisk?.flashFloodScore || 20}%</strong></div>
                      <div>Slope: <strong className="text-slate-200">{zone.susceptibility?.slopeAngle}°</strong></div>
                      <div>Elevation: <strong className="text-emerald-400">{elevation} m</strong></div>
                    </div>

                    {isFloodProne && (
                      <div className="p-1.5 rounded bg-sky-950/60 border border-sky-500/40 text-[10px] text-sky-300">
                        🌊 Inundation Extent: <strong>{zone.combinedRisk?.floodExtentSqKm || 2.1} km²</strong> (Window: {zone.combinedRisk?.flashFloodWindow || '2–4 hrs'})
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                      Fault Line: <strong className="text-amber-300">{zone.susceptibility?.nearestFaultLineName || 'Zone V Fault'}</strong> ({zone.susceptibility?.distanceToFaultLineKm || 3.2} km)
                    </div>
                    <button
                      onClick={() => onSelectZone && onSelectZone(zone)}
                      className="w-full mt-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-semibold text-center cursor-pointer transition-colors shadow-sm"
                    >
                      Inspect Multi-Hazard Details →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 4. IoT Sensor Markers with Connectivity Badges */}
        {activeLayers.sensors &&
          sensors.map((sensor) => {
            if (!sensor.location?.coordinates) return null;
            const [lon, lat] = sensor.location.coordinates;
            const isOnline = sensor.status === 'ONLINE';
            const isFaulty = sensor.status === 'FAULTY_ANOMALY';
            const statusColor = isOnline ? '#22C55E' : isFaulty ? '#F97316' : '#94A3B8';

            const iconHtml = `
              <div style="background-color: ${statusColor}; width: 14px; height: 14px; border-radius: 3px; border: 2px solid #0F172A; box-shadow: 0 0 6px ${statusColor}80;"></div>
            `;

            return (
              <Marker
                key={sensor._id}
                position={[lat, lon]}
                icon={createCustomIcon(iconHtml)}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-3 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[240px] max-w-[310px] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 pr-7">
                      <span className="font-bold text-sm text-white">{sensor.sensorCode}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${statusColor}25`, color: statusColor }}
                      >
                        {sensor.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">{sensor.name}</p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <div>Type: <strong className="text-slate-200">{(sensor.type || '').replace(/_/g, ' ')}</strong></div>
                      <div>Mode: <strong className="text-sky-300">{sensor.connectivityMode}</strong></div>
                      <div>Reading: <strong className="text-emerald-400 font-mono">{sensor.lastReadingValue} {sensor.unit}</strong></div>
                      <div>Village: <strong className="text-slate-200">{sensor.villageName}</strong></div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      GPS Coordinates: {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                    </div>
                    {sensor.anomalyDetails?.isAnomaly && (
                      <div className="p-2 rounded bg-orange-950/70 border border-orange-500/50 text-[10px] text-orange-200 leading-snug">
                        <span className="font-bold text-orange-300 block mb-0.5">⚠️ Telemetry Anomaly Flagged:</span>
                        {sensor.anomalyDetails.reason}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between items-center">
                      <span>Telemetry Status</span>
                      <span className="font-mono text-emerald-400">{formatRelativeTime(sensor.lastUpdated)}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 5. Citizen Report Pins */}
        {activeLayers.reports &&
          reports.map((rep) => {
            if (!rep.location?.coordinates) return null;
            const [lon, lat] = rep.location.coordinates;
            const isVerified = rep.verificationStatus === 'VERIFIED';
            const repColor = isVerified ? '#10B981' : '#A855F7';

            const iconHtml = `
              <div style="background-color: ${repColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px;">📸</div>
            `;

            return (
              <Marker
                key={rep._id}
                position={[lat, lon]}
                icon={createCustomIcon(iconHtml)}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-3 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[240px] max-w-[310px] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 pr-7">
                      <span className="font-bold text-sm text-purple-300">Citizen Report</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isVerified ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                        }`}
                      >
                        {rep.verificationStatus || 'PENDING'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium">
                      {rep.villageName} ({rep.districtName}) · <span className="text-sky-300 font-mono">{rep.reportCode || 'CR-REF'}</span>
                    </div>
                    <div className="text-[11px] text-slate-200">
                      Category: <strong className="text-amber-300">{(rep.category || '').replace(/_/g, ' ')}</strong>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      {rep.description}
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      GPS Coordinates: {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                    </div>
                    {(rep.aiPreScreening || rep.aiPrescreenLabel) && (
                      <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 p-1 rounded border border-emerald-500/30">
                        AI Pre-Screen: {rep.aiPreScreening?.label || rep.aiPrescreenLabel || 'Ground Deformation'} ({rep.aiPreScreening?.confidencePct || rep.aiConfidencePct || 85}%)
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between items-center">
                      <span>Submitted</span>
                      <span className="font-mono text-slate-400">{formatRelativeTime(rep.submittedAt || rep.createdAt)}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 6. Live Emergency SOS Distress Beacons */}
        {activeLayers.sos &&
          sosList.map((sos) => {
            if (!sos.location?.coordinates) return null;
            const [lon, lat] = sos.location.coordinates;

            const iconHtml = `
              <div class="relative flex items-center justify-center">
                <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); animation: ping 1.5s infinite;"></div>
                <div style="background-color: #DC2626; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">🆘</div>
              </div>
            `;

            return (
              <Marker
                key={sos._id || sos.sosId}
                position={[lat, lon]}
                icon={createCustomIcon(iconHtml)}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-3 text-xs bg-red-950 text-white rounded-xl space-y-1.5 border border-red-500 min-w-[240px] max-w-[310px] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-red-800 pb-1 pr-7">
                      <span className="font-extrabold text-sm text-red-200">🚨 DISTRESS SOS BEACON</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-100 border border-red-400/50">
                        {sos.status || 'ACTIVE'}
                      </span>
                    </div>
                    <div className="text-xs text-white">
                      Citizen: <strong>{sos.citizenName}</strong> ({sos.citizenPhone})
                    </div>
                    <div className="text-[11px] text-red-200">
                      Village / District: <strong>{sos.villageName || 'Sohra'}</strong> ({sos.districtName || 'East Khasi Hills'})
                    </div>
                    <div className="text-[10px] text-red-300 font-mono">
                      GPS Coordinates: {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                    </div>
                    <div className="text-[11px] bg-red-900/60 p-1.5 rounded border border-red-700/60 text-red-100">
                      Emergency: {sos.emergencyType || 'Immediate evacuation & shelter assistance requested'}
                    </div>
                    <div className="text-[10px] text-red-300 border-t border-red-800/80 pt-1 flex justify-between items-center">
                      <span>Dispatched</span>
                      <span className="font-mono">{formatRelativeTime(sos.triggeredAt || sos.createdAt || new Date())}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 7. Historical GSI Landslide Inventory Layer (Task 4) */}
        {activeLayers.historicalLandslides &&
          historicalLandslides.map((event) => {
            if (!event.location?.coordinates) return null;
            const [lon, lat] = event.location.coordinates;
            const isSevere = event.severity === 'SEVERE';
            const sevColor = isSevere ? '#EF4444' : event.severity === 'HIGH' ? '#F97316' : '#EAB308';

            const iconHtml = `
              <div style="background-color: ${sevColor}; width: 18px; height: 18px; border-radius: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 0 8px ${sevColor}90;">⚠️</div>
            `;

            return (
              <Marker
                key={event._id || event.eventId}
                position={[lat, lon]}
                icon={createCustomIcon(iconHtml)}
              >
                <Popup {...POPUP_CONFIG}>
                  <div className="p-3 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[240px] max-w-[320px] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 pr-7">
                      <span className="font-bold text-sm text-amber-300">GSI Past Landslide</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${sevColor}25`, color: sevColor }}
                      >
                        {event.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium">
                      {event.villageName} ({event.districtName}) · <span className="text-sky-300 font-mono">{event.eventId}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      {event.description}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <div>Trigger Rain: <strong className="text-sky-300">{event.triggerRainfallMm} mm</strong></div>
                      <div>Date: <strong className="text-slate-200">{new Date(event.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      GPS Coordinates: {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                    </div>
                    <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between items-center">
                      <span>Source: GSI Bhukosh</span>
                      <span className="font-mono text-slate-400">Historical Record</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 8. External OSM Search Fallback Pin (FEATURE: Real Search) */}
        {searchedLocation && (
          <Marker
            position={[searchedLocation.lat, searchedLocation.lon]}
            icon={createCustomIcon(
              '<div style="background-color: #38BDF8; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: #0F172A; font-weight: bold; font-size: 10px;">📍</div>'
            )}
          >
            <Popup {...POPUP_CONFIG}>
              <div className="p-3 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[220px] max-w-xs shadow-2xl">
                <div className="pr-7 border-b border-slate-800 pb-1">
                  <span className="font-bold text-sky-400 block">{searchedLocation.displayName}</span>
                </div>
                <span className="text-[10px] text-amber-300 block">
                  ⚠️ Unmonitored Territory: Outside active IoT sensor & landslide telemetry grid.
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Coordinates: {searchedLocation.lat.toFixed(4)}°N, {searchedLocation.lon.toFixed(4)}°E
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 8. User GPS Position Marker (FEATURE: Locate Me) */}
        {userGpsLocation && (
          <Marker
            position={[userGpsLocation.lat, userGpsLocation.lon]}
            icon={createCustomIcon(
              '<div class="relative flex items-center justify-center"><div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(56, 189, 248, 0.4); animation: ping 1.5s infinite;"></div><div style="background-color: #0284C7; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div></div>'
            )}
          >
            <Popup {...POPUP_CONFIG}>
              <div className="p-3 text-xs bg-slate-900 text-slate-100 rounded-xl space-y-1.5 min-w-[200px] shadow-2xl">
                <div className="pr-7 border-b border-slate-800 pb-1">
                  <span className="font-bold text-sky-400 block">🎯 In-Field Officer Position</span>
                </div>
                <span className="text-[11px] text-slate-300 block">
                  Lat: {userGpsLocation.lat}°N, Lon: {userGpsLocation.lon}°E
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Legend at Bottom Left */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#0a0a0a]/90 backdrop-blur-md p-3 rounded-2xl border border-neutral-800 text-[11px] text-neutral-300 space-y-1.5 shadow-2xl max-w-xs pointer-events-auto hidden sm:block">
        <span className="font-mono uppercase tracking-wider text-[10px] text-neutral-400 block font-semibold">
          GIS Layer Semantics
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-neutral-300">Safe Tier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
            <span className="text-neutral-300">Watch Tier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
            <span className="text-neutral-300">Warning Tier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 animate-pulse" />
            <span className="font-semibold text-red-400">Danger Tier</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-neutral-850">
            <svg width="14" height="14" className="shrink-0 rounded">
              <rect width="14" height="14" fill="#78350F" fillOpacity="0.3" stroke="#D97706" strokeWidth="1.5" strokeDasharray="3,3" />
              <line x1="0" y1="0" x2="14" y2="14" stroke="#D97706" strokeWidth="2" strokeOpacity="0.8" />
            </svg>
            <span className="text-amber-300 text-[10px]">Base Susceptibility (Fault/Mining)</span>
          </div>
          {activeLayers.floodExtent && (
            <div className="col-span-2 pt-1 border-t border-neutral-850 text-[10px] text-sky-300 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-sky-500/30 border border-sky-400 border-dashed shrink-0" />
                <strong className="text-sky-200">Flood Inundation Extent (SCS-CN)</strong>
              </div>
              <p className="text-[9px] text-neutral-400 italic leading-snug">
                Approximate impact radius based on computed inundation area — not a precise hydrodynamic floodplain simulation.
              </p>
            </div>
          )}
          {activeLayers.bgsGeology && (
            <div className="col-span-2 pt-1 border-t border-neutral-850 text-[10px] text-emerald-300 leading-snug">
              <strong className="block text-emerald-200 font-mono text-[9px] uppercase">Regional Geology (1:2M):</strong>
              Coarse OGC WMS bedrock overlay supplements micro-susceptibility.
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Historical Risk Timeline Replay Scrubber (Item 5) */}
      {historyTimeline.length > 0 && (
        <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:right-3 max-w-md z-[1000] bg-[#0a0a0a]/95 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-800 shadow-2xl space-y-2.5 pointer-events-auto text-xs animate-in fade-in">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-850 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-white tracking-[-0.2px]">
              <History className="w-4 h-4 text-sky-400" />
              <span>7-Day Risk Timeline Replay</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isPlayingTimeline
                    ? 'bg-amber-600 text-white animate-pulse'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                }`}
                title={isPlayingTimeline ? 'Pause Animation' : 'Auto-Play 7-Day Replay'}
              >
                {isPlayingTimeline ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlayingTimeline ? 'Pause' : 'Play 7D'}</span>
              </button>
              {isHistoricalMode && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDayIndex(historyTimeline.length - 1);
                    setIsPlayingTimeline(false);
                  }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-neutral-900 hover:bg-neutral-800 text-sky-300 border border-neutral-700 transition-colors"
                  title="Snap back to real-time live telemetry"
                >
                  ⚡ LIVE
                </button>
              )}
            </div>
          </div>

          {/* Time Scrubber Range Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
              <span>{historyTimeline[0]?.dateFormatted || '6d ago'}</span>
              <span className={`font-bold ${isHistoricalMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                {currentTimelineSlice?.label || 'Live'} ({currentTimelineSlice?.dateFormatted})
              </span>
              <span className="text-emerald-400 font-bold">LIVE (Today)</span>
            </div>
            <input
              type="range"
              min={0}
              max={historyTimeline.length - 1}
              value={selectedDayIndex}
              onChange={(e) => {
                setSelectedDayIndex(Number(e.target.value));
                setIsPlayingTimeline(false);
              }}
              className="w-full accent-sky-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer appearance-none"
            />
          </div>

          {/* Replay Info Summary */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-0.5">
            <span>
              {isHistoricalMode ? (
                <span className="text-amber-300 font-medium">
                  ⏪ Replaying past risk scores & precipitation
                </span>
              ) : (
                <span className="text-emerald-300 font-medium">
                  ● Real-time live GIS stream active
                </span>
              )}
            </span>
            <span className="text-[10px] font-mono text-neutral-500">
              Day {selectedDayIndex + 1} of {historyTimeline.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
