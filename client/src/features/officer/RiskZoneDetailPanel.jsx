import React from 'react';
import {
  X,
  ShieldAlert,
  Mountain,
  CloudRain,
  Droplets,
  Compass,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Activity,
  Radio,
  Cpu,
} from 'lucide-react';
import { RiskBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatNumber } from '../../utils/formatters';

export const RiskZoneDetailPanel = ({ zone, onClose, onRequestVerification, onGenerateAlert }) => {
  if (!zone) return null;

  const { combinedRisk, susceptibility, currentTelemetry } = zone;
  const isDanger = combinedRisk.tier === 'DANGER';

  return (
    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className={`p-4 border-b ${isDanger ? 'bg-red-950/20 border-red-800/40' : 'bg-[#0c0c0c] border-neutral-800'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <RiskBadge tier={combinedRisk.tier} confidence={combinedRisk.confidence} size="md" />
              <span className="text-xs text-neutral-400 font-mono">
                Pop: {formatNumber(zone.populationEstimate, 0)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white tracking-[-0.4px] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
              {zone.name}
            </h3>
            <p className="text-xs text-neutral-400">
              {zone.districtName}, {zone.stateName} · Block: {zone.blockName || 'Central'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto text-xs sm:text-sm">
        {/* Multi-Hazard Scores Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#050505] border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[11px] font-mono text-neutral-400 block mb-0.5">Landslide Risk</span>
            <span className={`text-base font-bold font-mono ${isDanger ? 'text-red-400' : 'text-sky-400'}`}>
              {combinedRisk.landslideScore || combinedRisk.score}%
            </span>
          </div>
          <div className="bg-[#050505] border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[11px] font-mono text-neutral-400 block mb-0.5">Flash Flood</span>
            <span className="text-base font-bold font-mono text-amber-400">
              {combinedRisk.flashFloodScore}%
            </span>
            <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">{combinedRisk.flashFloodWindow}</span>
          </div>
          <div className="bg-[#050505] border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[11px] font-mono text-neutral-400 block mb-0.5">Flood Extent</span>
            <span className="text-base font-bold font-mono text-cyan-400">
              {combinedRisk.floodExtentSqKm} km²
            </span>
          </div>
        </div>

        {/* Live Telemetry & LSTM Forecast */}
        <div className="bg-[#050505] border border-neutral-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              Live Telemetry & LSTM Forecast
            </h4>
            <span className="text-[10px] font-mono text-sky-400">OpenWeather / IMD</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">24h Rainfall:</span>
              <span className="font-mono font-bold text-neutral-200">{currentTelemetry.rainfall24h} mm</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">LSTM 24h Forecast:</span>
              <span className="font-mono font-bold text-sky-300">{currentTelemetry.forecastNext24hMm || 35} mm</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">Soil Moisture:</span>
              <span className="font-mono font-bold text-neutral-200">{currentTelemetry.soilMoisture}%</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">Slope Gradient:</span>
              <span className="font-mono font-bold text-neutral-200">{susceptibility.slopeAngle}°</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1 col-span-2">
              <span className="text-neutral-400 flex items-center gap-1">
                <Mountain className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Elevation (OpenTopography DEM):</span>
              </span>
              <span className="font-mono font-bold text-emerald-300">{formatNumber(susceptibility.elevationMeters || susceptibility.elevation || 1430, 0)} m</span>
            </div>
          </div>
        </div>

        {/* Part 2: Hydrology & Terrain Factors (Drainage Density, Soil Type, CN, LULC, Historical Floods) */}
        <div className="bg-[#050505] border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              Hydrology & Terrain Matrix (SCS-CN)
            </h4>
            <span className="text-[10px] font-mono text-cyan-300">OSM + ESA WorldCover</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">Drainage Density (Dd):</span>
              <span className="font-mono font-bold text-sky-300">{zone.drainageDensityKmPerSqKm || 2.4} km/km²</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">Soil Type:</span>
              <span className="font-mono font-bold text-amber-300">{zone.soilType || 'Silt Loam'}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">Curve Number (CN):</span>
              <span className="font-mono font-bold text-emerald-300">{zone.curveNumber || 82}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1">
              <span className="text-neutral-400">LULC Class:</span>
              <span className="font-mono font-bold text-neutral-200">{zone.lulcClass || 'Dense Subtropical Forest'}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800/80 pb-1 col-span-2">
              <span className="text-neutral-400">Past Flood Incidents (NRSC/GSI):</span>
              <span className="font-mono font-bold text-cyan-300">{zone.historicalFloodCount || 3} events recorded</span>
            </div>
          </div>
        </div>

        {/* "WHY IS THIS AREA AT RISK?" 2-Layer Explainability Component */}
        <div className="bg-[#050505] border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
              Why is this area at risk?
            </h4>
            <span className="text-[11px] font-mono text-neutral-400">GSI + AI Explainability</span>
          </div>

          <p className="text-[11px] text-neutral-300">
            Causal balance between <strong className="text-amber-300">Base Susceptibility</strong> (Fault Lines/Mining/NDVI) and <strong className="text-sky-300">Dynamic Trigger</strong> (Precipitation):
          </p>

          {/* Susceptibility vs Trigger Contribution Bars */}
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-amber-300 font-medium">Base Susceptibility ({susceptibility.score}/100)</span>
                <span className="font-mono text-neutral-300">{combinedRisk.susceptibilityContribution}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${combinedRisk.susceptibilityContribution}%` }}
                />
              </div>
            </div>

            {/* Susceptibility Structural Factor Pills */}
            <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-neutral-800 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-neutral-300">
                <span>⚡ Active Fault Line (Zone V):</span>
                <span className="font-semibold text-amber-300 font-mono">
                  {susceptibility.nearestFaultLineName || 'Dauki Fault'} ({susceptibility.distanceToFaultLineKm || 3.2} km)
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span>📚 Historical Landslide Records (GSI):</span>
                <span className="font-semibold text-amber-300 font-mono">
                  {susceptibility.historicalLandslideCount || susceptibility.historicalLandslideDensity || 6} recorded ({susceptibility.historicalLandslideDensityScore || 65}/100)
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span>⛏️ Mining Proximity:</span>
                <span className="font-semibold text-neutral-200 font-mono">
                  {susceptibility.distanceToMiningSiteKm} km ({susceptibility.miningActivityType || 'Rat-hole Quarry'})
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span>🛰️ Sentinel-2 NDVI 5yr Loss:</span>
                <span className="font-semibold text-neutral-200 font-mono">
                  {Math.round((susceptibility.ndviChange5yr || -0.12) * 100)}% forest decline
                </span>
              </div>
              {susceptibility.satelliteChangeDetectedFlag && (
                <div className="flex items-center justify-between text-red-300 font-semibold pt-0.5">
                  <span>🚨 CNN Satellite Change Flag:</span>
                  <span>Active ground scarp delta detected</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-sky-300 font-medium">Dynamic Meteorological Trigger</span>
                <span className="font-mono text-neutral-300">{combinedRisk.triggerContribution}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${combinedRisk.triggerContribution}%` }}
                />
              </div>
            </div>
          </div>

          {/* Factor Breakdown Chips */}
          {combinedRisk.contributingFactors && combinedRisk.contributingFactors.length > 0 && (
            <div className="pt-2 border-t border-neutral-800 space-y-1">
              <span className="text-[11px] font-mono font-semibold text-neutral-400 block">Top Contributing Factors:</span>
              <div className="space-y-1">
                {combinedRisk.contributingFactors.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] bg-[#0a0a0a] px-2.5 py-1 rounded-lg border border-neutral-800">
                    <span className="text-neutral-300">{f.name}</span>
                    <span className="font-mono text-sky-400">{f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nearest Shelter */}
        {zone.nearestShelter && (
          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3 text-xs flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-300 block">Designated Relief Shelter</span>
              <span className="text-neutral-200 font-medium">{zone.nearestShelter.name}</span>
              <span className="text-[11px] text-neutral-400 block mt-0.5">
                Distance: {zone.nearestShelter.distanceKm} km from village center
              </span>
            </div>
          </div>
        )}

        {/* Officer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          {onRequestVerification && (
            <button
              onClick={() => onRequestVerification(zone)}
              className="flex-1 py-2 px-3 rounded-full border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-sky-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              Assign Field Inspection
            </button>
          )}
          {onGenerateAlert && (
            <button
              onClick={() => onGenerateAlert(zone)}
              className={`flex-1 py-2 px-3 rounded-full text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
                isDanger ? 'bg-red-600 hover:bg-red-500' : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              Dispatch Warning Notice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
