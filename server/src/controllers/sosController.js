import SOS from '../models/SOS.js';
import AuditLog from '../models/AuditLog.js';
import { emitEvent } from '../services/socketService.js';
import { createNotification } from '../services/notificationService.js';

// POST /api/sos (Citizen Triggers Distress Emergency)
export const triggerSOS = async (req, res, next) => {
  try {
    const {
      citizenName,
      citizenPhone,
      villageName,
      districtId,
      coordinates,
      emergencyType,
    } = req.body;

    const sosCode = `SOS-${Date.now().toString().slice(-6)}`;

    const sos = await SOS.create({
      sosCode,
      citizenId: req.user?._id,
      citizenName: citizenName || req.user?.name || 'Distressed Citizen',
      citizenPhone: citizenPhone || req.user?.phone || 'Unknown',
      districtId: districtId || 'EKH',
      villageName: villageName || 'Sohra',
      location: {
        type: 'Point',
        coordinates: coordinates || [91.7324, 25.2986],
      },
      emergencyType: emergencyType || 'LANDSLIDE_TRAP_HAZARD',
      status: 'ACTIVE',
      dispatchedAt: new Date(),
    });

    // Create durable persistent Notification for Officers
    await createNotification({
      role: 'OFFICER',
      type: 'SOS_BEACON',
      relatedEntityId: sos._id.toString(),
      title: `🆘 SOS Distress Beacon: ${sos.villageName}`,
      message: `${sos.citizenName} (${sos.citizenPhone}) triggered SOS for ${sos.emergencyType.replace(/_/g, ' ')}.`,
      villageName: sos.villageName,
    });

    // Broadcast High-Priority SOS Beacon to all Officer Dashboards
    emitEvent('CITIZEN_SOS_TRIGGERED', {
      sosId: sos._id,
      sosCode: sos.sosCode,
      citizenName: sos.citizenName,
      citizenPhone: sos.citizenPhone,
      villageName: sos.villageName,
      districtId: sos.districtId,
      location: sos.location,
      emergencyType: sos.emergencyType,
      dispatchedAt: sos.dispatchedAt,
    }, sos.districtId);

    await AuditLog.create({
      userId: req.user?._id,
      userName: sos.citizenName,
      userRole: 'CITIZEN',
      districtId: sos.districtId,
      action: 'SOS_DISPATCHED',
      details: `EMERGENCY SOS Triggered: ${sos.sosCode} from ${sos.villageName} (${coordinates ? coordinates.join(', ') : 'GPS'}).`,
      metadata: { sosId: sos._id },
    });

    res.status(201).json({
      success: true,
      message: 'SOS distress beacon broadcasted to District EOC and nearby rescue units.',
      data: sos,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/sos?district=
export const getActiveSOS = async (req, res, next) => {
  try {
    const { district } = req.query;
    const filter = {};
    if (district && district !== 'ALL') filter.districtId = district;

    const sosList = await SOS.find(filter).sort({ dispatchedAt: -1 });
    res.json({
      success: true,
      count: sosList.length,
      data: sosList,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/sos/:id/resolve
export const resolveSOS = async (req, res, next) => {
  try {
    const sos = await SOS.findById(req.params.id);
    if (!sos) return res.status(404).json({ success: false, message: 'SOS not found' });

    sos.status = 'RESOLVED';
    sos.resolvedAt = new Date();
    await sos.save();

    emitEvent('SOS_RESOLVED', sos, sos.districtId);

    res.json({ success: true, message: 'SOS marked resolved', data: sos });
  } catch (err) {
    next(err);
  }
};
