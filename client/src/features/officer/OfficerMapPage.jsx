import React, { useState, useEffect } from 'react';
import { OfficerRiskMap } from './OfficerRiskMap';
import { RiskZoneDetailPanel } from './RiskZoneDetailPanel';
import api from '../../services/api';

export const OfficerMapPage = ({ districtId = 'ALL' }) => {
  const [zones, setZones] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [roads, setRoads] = useState([]);
  const [reports, setReports] = useState([]);
  const [sosList, setSosList] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const [zonesRes, sensorsRes, roadsRes, reportsRes, sosRes] = await Promise.all([
          api.get(`/risk-zones?district=${districtId}`),
          api.get(`/sensors?district=${districtId}`),
          api.get(`/risk-zones/road-segments?district=${districtId}`),
          api.get(`/citizen-reports?district=${districtId}`),
          api.get(`/sos?district=${districtId}`),
        ]);
        if (zonesRes.data.success) setZones(zonesRes.data.data);
        if (sensorsRes.data.success) setSensors(sensorsRes.data.data);
        if (roadsRes.data.success) setRoads(roadsRes.data.data);
        if (reportsRes.data.success) setReports(reportsRes.data.data);
        if (sosRes.data.success) setSosList(sosRes.data.data);
      } catch (err) {
        console.error('Failed to load map page data:', err);
      }
    };
    loadMapData();
  }, [districtId]);

  return (
    <div className="h-[calc(100vh-140px)] w-full relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
      <OfficerRiskMap
        zones={zones}
        sensors={sensors}
        roads={roads}
        reports={reports}
        sosList={sosList}
        selectedZone={selectedZone}
        onSelectZone={(z) => setSelectedZone(z)}
        districtId={districtId}
      />

      {selectedZone && (
        <div className="absolute top-16 right-4 z-[1001] w-full max-w-sm">
          <RiskZoneDetailPanel
            zone={selectedZone}
            onClose={() => setSelectedZone(null)}
          />
        </div>
      )}
    </div>
  );
};
