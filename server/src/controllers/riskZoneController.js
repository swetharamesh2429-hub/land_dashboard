import RiskZone from '../models/RiskZone.js';
import RoadSegment from '../models/RoadSegment.js';
import Jurisdiction from '../models/Jurisdiction.js';

// GET /api/risk-zones?district=
export const getRiskZones = async (req, res, next) => {
  try {
    const { district, tier } = req.query;
    const filter = {};

    if (district && district !== 'ALL') {
      filter.districtId = district;
    }

    if (tier && tier !== 'ALL') {
      filter['combinedRisk.tier'] = tier;
    }

    const zones = await RiskZone.find(filter).sort({ 'combinedRisk.score': -1 });

    // Summary counts
    const summary = {
      total: zones.length,
      danger: zones.filter(z => z.combinedRisk.tier === 'DANGER').length,
      warning: zones.filter(z => z.combinedRisk.tier === 'WARNING').length,
      watch: zones.filter(z => z.combinedRisk.tier === 'WATCH').length,
      safe: zones.filter(z => z.combinedRisk.tier === 'SAFE').length,
    };

    res.json({
      success: true,
      summary,
      count: zones.length,
      data: zones,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/risk-zones/:id
export const getRiskZoneById = async (req, res, next) => {
  try {
    const zone = await RiskZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Risk zone not found' });
    }
    res.json({ success: true, data: zone });
  } catch (err) {
    next(err);
  }
};

// GET /api/road-segments?district=
export const getRoadSegments = async (req, res, next) => {
  try {
    const { district } = req.query;
    const filter = {};
    if (district && district !== 'ALL') {
      filter.districtId = district;
    }
    const roads = await RoadSegment.find(filter);
    res.json({ success: true, count: roads.length, data: roads });
  } catch (err) {
    next(err);
  }
};

// GET /api/jurisdictions
export const getJurisdictions = async (req, res, next) => {
  try {
    const jurisdictions = await Jurisdiction.find();
    res.json({ success: true, data: jurisdictions });
  } catch (err) {
    next(err);
  }
};

// GET /api/risk-zones/history?days=7
export const getRiskZoneHistory = async (req, res, next) => {
  try {
    const numDays = Math.min(14, Math.max(1, parseInt(req.query.days || '7', 10)));
    const district = req.query.district;
    const filter = {};
    if (district && district !== 'ALL') {
      filter.districtId = district;
    }

    const zones = await RiskZone.find(filter);

    const timeline = [];
    const now = new Date();

    for (let dayOffset = numDays - 1; dayOffset >= 0; dayOffset--) {
      const pointDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const label =
        dayOffset === 0
          ? 'Live (Today)'
          : dayOffset === 1
          ? '1 Day Ago'
          : `${dayOffset} Days Ago`;

      const zoneSnapshots = zones.map((z) => {
        const susScore = z.susceptibility?.score || 50;
        const baseRain = z.currentTelemetry?.rainfall24h || 30;

        // Realistic historical precipitation curve across past 7 days
        // Day -3 to -1 represents monsoon surge period
        const waveFactor = 0.6 + 0.4 * Math.sin(((7 - dayOffset) / 7) * Math.PI * 1.5);
        const histRain = dayOffset === 0 ? baseRain : Math.max(5, Math.round(baseRain * waveFactor));
        const histSoil = Math.min(100, Math.max(20, Math.round(histRain * 0.9 + 15)));

        const r24Score = Math.min(40, (histRain / 140) * 40);
        const soilScore = Math.min(25, (histSoil / 100) * 25);
        const triggerScore = Math.min(100, r24Score + soilScore + 10);

        const susFactor = susScore / 100;
        const combinedScore =
          dayOffset === 0
            ? z.combinedRisk?.score || 25
            : Math.min(
                100,
                Number(
                  (
                    susScore * 0.4 +
                    triggerScore * 0.6 +
                    susFactor * triggerScore * 0.15
                  ).toFixed(1)
                )
              );

        let tier = 'SAFE';
        if (combinedScore >= 75) tier = 'DANGER';
        else if (combinedScore >= 50) tier = 'WARNING';
        else if (combinedScore >= 30) tier = 'WATCH';

        const floodExtentSqKm = Number(Math.max(0.1, (histRain * 0.025)).toFixed(1));
        const flashFloodScore = Math.min(95, Math.round(histRain * 0.6));

        return {
          _id: z._id,
          name: z.name,
          districtId: z.districtId,
          districtName: z.districtName,
          stateName: z.stateName || (z.districtId === 'DH' ? 'Assam' : 'Meghalaya'),
          blockName: z.blockName || 'Central Block',
          populationEstimate: z.populationEstimate || 4200,
          location: z.location,
          rainfall24h: histRain,
          soilMoisture: histSoil,
          currentTelemetry: {
            rainfall24h: histRain,
            soilMoisture: histSoil,
            forecastNext24hMm: Math.round(histRain * 0.85),
            tiltCreepRateMmPerHr: Number((0.2 + (combinedScore > 50 ? combinedScore / 30 : 0)).toFixed(1)),
            riverStageMeters: Number((1.2 + (histRain > 70 ? histRain / 50 : 0)).toFixed(1)),
            lastUpdated: pointDate,
          },
          susceptibility: z.susceptibility || {
            score: susScore,
            slopeAngle: 38,
            elevationMeters: 1430,
            nearestFaultLineName: 'Dauki Fault Line',
            distanceToFaultLineKm: 4.2,
          },
          drainageDensityKmPerSqKm: z.drainageDensityKmPerSqKm || 2.4,
          soilType: z.soilType || 'Clay Loam (Moderate Infiltration)',
          curveNumber: z.curveNumber || 78,
          combinedRisk: {
            score: combinedScore,
            tier,
            confidence: z.combinedRisk?.confidence || 85,
            landslideScore: combinedScore,
            flashFloodScore,
            flashFloodWindow: histRain > 60 ? '2–4 hours' : '4–8 hours',
            floodExtentSqKm,
            runoffMm: Number((histRain * 0.35).toFixed(1)),
          },
        };
      });

      timeline.push({
        dayOffset,
        date: pointDate.toISOString().split('T')[0],
        dateFormatted: pointDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        label,
        zones: zoneSnapshots,
      });
    }

    res.json({
      success: true,
      days: numDays,
      timeline,
    });
  } catch (err) {
    next(err);
  }
};
