import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import FieldTask from '../models/FieldTask.js';
import User from '../models/User.js';
import RiskZone from '../models/RiskZone.js';
import AlertAccuracyLog from '../models/AlertAccuracyLog.js';
import AuditLog from '../models/AuditLog.js';
import { dispatchMultiChannelAlert } from '../services/alertDispatcher.js';
import { emitEvent } from '../services/socketService.js';
import { createNotification } from '../services/notificationService.js';

// GET /api/alerts?status=&tier=&district=
export const getAlerts = async (req, res, next) => {
  try {
    const { status, tier, district } = req.query;
    const filter = {};

    if (district && district !== 'ALL') {
      filter.districtId = String(district).trim();
    }
    if (status && status !== 'ALL') {
      filter.status = String(status).trim();
    }
    if (tier && tier !== 'ALL') {
      filter.tier = String(tier).trim();
    }

    const alerts = await Alert.find(filter)
      .populate('riskZoneId')
      .populate('fieldVerification.fieldTaskId')
      .populate('fieldVerification.assignedFieldOfficerId', 'name phone officerDetails')
      .sort({ createdAt: -1 });

    const summary = {
      total: alerts.length,
      pendingVerification: alerts.filter(a => a.status === 'PENDING_OFFICER_REVIEW').length,
      danger: alerts.filter(a => a.tier === 'DANGER').length,
      warning: alerts.filter(a => a.tier === 'WARNING').length,
      watch: alerts.filter(a => a.tier === 'WATCH').length,
    };

    res.json({
      success: true,
      summary,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/alerts/:id
export const getAlertById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert identifier.' });
    }

    const alert = await Alert.findById(id)
      .populate('riskZoneId')
      .populate('fieldVerification.fieldTaskId')
      .populate('fieldVerification.assignedFieldOfficerId', 'name phone officerDetails');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Fetch related audit trail
    const auditTrail = await AuditLog.find({
      $or: [
        { 'metadata.alertId': alert._id },
        { details: { $regex: alert.alertCode, $options: 'i' } }
      ]
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      data: alert,
      auditTrail,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/alerts/:id/confirm (Officer Confirms & Dispatches Alert)
export const confirmAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert identifier.' });
    }

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Role & Jurisdiction check
    if (req.user.role !== 'OFFICER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only District/State Disaster Officers are authorized to confirm and dispatch Danger alerts.',
      });
    }

    // IDOR Jurisdiction enforcement
    if (req.user.role !== 'SUPER_ADMIN' && req.user.jurisdiction?.districtId && req.user.jurisdiction.districtId !== alert.districtId) {
      return res.status(403).json({
        success: false,
        message: `Jurisdiction violation: Officer from district '${req.user.jurisdiction.districtId}' cannot dispatch alerts for district '${alert.districtId}'.`,
      });
    }

    const targetZone = await RiskZone.findById(alert.riskZoneId);
    const reliability = targetZone?.networkReliability || 'UNKNOWN';

    alert.status = 'CONFIRMED_DISPATCHED';
    alert.officerDecision = {
      officerId: req.user._id,
      officerName: req.user.name,
      action: 'CONFIRMED',
      notes: req.body.notes ? String(req.body.notes).trim() : 'Hazard verified by EOC in-charge; emergency public dispatch authorized.',
      timestamp: new Date(),
    };
    alert.dispatchChannels = {
      inAppPush: true,
      smsBroadcast: true,
      voiceBroadcast: reliability !== 'WEAK',
      cellBroadcastSachet: true,
      dispatchedAt: new Date(),
    };
    alert.updatedAt = new Date();

    await alert.save();

    // Trigger Multi-Channel Broadcast & Socket Events
    await dispatchMultiChannelAlert({
      alert,
      riskZone: targetZone,
      officerUser: req.user,
    });

    res.json({
      success: true,
      message: `Alert ${alert.alertCode} confirmed and dispatched across all emergency channels.`,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/alerts/:id/dismiss (Officer Dismisses Alert as False Positive)
export const dismissAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert identifier.' });
    }

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (req.user.role !== 'OFFICER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    // IDOR Jurisdiction enforcement
    if (req.user.role !== 'SUPER_ADMIN' && req.user.jurisdiction?.districtId && req.user.jurisdiction.districtId !== alert.districtId) {
      return res.status(403).json({
        success: false,
        message: `Jurisdiction violation: Officer from district '${req.user.jurisdiction.districtId}' cannot dismiss alerts for district '${alert.districtId}'.`,
      });
    }


    const reason = req.body.reason || 'Sensor fluctuation / physical inspection reported no imminent slope movement.';

    alert.status = 'DISMISSED_FALSE_POSITIVE';
    alert.officerDecision = {
      officerId: req.user._id,
      officerName: req.user.name,
      action: 'DISMISSED',
      notes: reason,
      timestamp: new Date(),
    };
    alert.updatedAt = new Date();
    await alert.save();

    // Log to AlertAccuracyLog for ML feedback loop
    await AlertAccuracyLog.create({
      alertId: alert._id,
      alertCode: alert.alertCode,
      districtId: alert.districtId,
      villageName: alert.villageName,
      predictedTier: alert.tier,
      actualOutcome: 'FALSE_ALARM',
      isAccurate: false,
      groundEvidenceNotes: reason,
    });

    // Write audit log
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      districtId: alert.districtId,
      action: 'ALERT_DISMISSED',
      details: `Alert ${alert.alertCode} dismissed as False Positive: ${reason}`,
      metadata: { alertId: alert._id },
    });

    emitEvent('ALERT_DISMISSED_FALSE_POSITIVE', {
      alertId: alert._id,
      alertCode: alert.alertCode,
      villageName: alert.villageName,
      dismissedBy: req.user.name,
    }, alert.districtId);

    res.json({
      success: true,
      message: `Alert ${alert.alertCode} dismissed as false positive. Recorded in accuracy feedback system.`,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/alerts/:id/request-field-verification
export const requestFieldVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert identifier.' });
    }

    const alert = await Alert.findById(id).populate('riskZoneId');
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // IDOR Jurisdiction enforcement
    if (req.user.role !== 'SUPER_ADMIN' && req.user.jurisdiction?.districtId && req.user.jurisdiction.districtId !== alert.districtId) {
      return res.status(403).json({
        success: false,
        message: `Jurisdiction violation: Officer from district '${req.user.jurisdiction.districtId}' cannot dispatch verification for district '${alert.districtId}'.`,
      });
    }

    // Find available field officer in this district
    let fieldOfficer = await User.findOne({
      role: 'FIELD_OFFICER',
      'jurisdiction.districtId': alert.districtId,
      status: 'ACTIVE',
    });

    if (!fieldOfficer) {
      // Fallback to any active field officer
      fieldOfficer = await User.findOne({ role: 'FIELD_OFFICER', status: 'ACTIVE' });
    }

    const taskCode = `TASK-${Date.now().toString().slice(-6)}`;
    const task = await FieldTask.create({
      taskCode,
      fieldOfficerId: fieldOfficer ? fieldOfficer._id : req.user._id,
      fieldOfficerName: fieldOfficer ? fieldOfficer.name : 'Duty Field Officer',
      districtId: alert.districtId,
      districtName: alert.districtName,
      villageName: alert.villageName,
      riskZoneId: alert.riskZoneId?._id,
      alertId: alert._id,
      title: `On-Ground Hazard Verification: ${alert.villageName}`,
      reason: `AI flagged ${alert.tier} ${alert.hazardType} (${alert.confidencePct}% conf) — physical inspection required before public dispatch`,
      priority: 'CRITICAL',
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      location: alert.riskZoneId?.location || { type: 'Point', coordinates: [91.7324, 25.2986] },
      checklist: [
        { label: 'Check for visible ground/retaining wall cracks', checked: false },
        { label: 'Inspect toe of slope and drainage channels', checked: false },
        { label: 'Measure stream/water level markers', checked: false },
        { label: 'Verify road passability for evacuation vehicles', checked: false },
      ],
    });

    alert.fieldVerification = {
      isRequested: true,
      requestedAt: new Date(),
      assignedFieldOfficerId: fieldOfficer ? fieldOfficer._id : req.user._id,
      assignedFieldOfficerName: fieldOfficer ? fieldOfficer.name : 'Duty Field Officer',
      status: 'PENDING',
      fieldTaskId: task._id,
    };
    await alert.save();

    await createNotification({
      userId: fieldOfficer ? fieldOfficer._id : null,
      role: 'FIELD_OFFICER',
      type: 'FIELD_TASK_ASSIGNED',
      relatedEntityId: task._id.toString(),
      title: `📋 Field Task: ${alert.villageName}`,
      message: `Emergency verification task ${task.taskCode} assigned for ${alert.villageName}. Verify physical slope conditions.`,
      villageName: alert.villageName,
    });

    emitEvent('FIELD_TASK_ASSIGNED', {
      task,
      alertId: alert._id,
      assignedTo: task.fieldOfficerName,
    }, alert.districtId);

    res.json({
      success: true,
      message: `Field verification task assigned to ${task.fieldOfficerName}.`,
      task,
      alert,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/alerts/:id/citizen-feedback (Feedback Loop)
export const submitCitizenAlertFeedback = async (req, res, next) => {
  try {
    const { isAccurate, notes } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert identifier.' });
    }

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.citizenFeedback.totalResponses += 1;
    if (isAccurate) {
      alert.citizenFeedback.confirmedAccurateCount += 1;
    } else {
      alert.citizenFeedback.falseAlarmCount += 1;
    }
    await alert.save();

    // Log to accuracy collection
    await AlertAccuracyLog.create({
      alertId: alert._id,
      alertCode: alert.alertCode,
      districtId: alert.districtId,
      villageName: alert.villageName,
      predictedTier: alert.tier,
      actualOutcome: isAccurate ? 'ACCURATE_HAZARD_OCCURRED' : 'FALSE_ALARM',
      isAccurate,
      groundEvidenceNotes: notes ? String(notes).trim().slice(0, 300) : 'Citizen ground validation vote',
      contributingCitizenVotes: {
        accurate: alert.citizenFeedback.confirmedAccurateCount,
        inaccurate: alert.citizenFeedback.falseAlarmCount,
      },
    });

    res.json({
      success: true,
      message: 'Thank you for ground-truth feedback. Your response helps improve the AI early-warning model.',
      citizenFeedback: alert.citizenFeedback,
    });
  } catch (err) {
    next(err);
  }
};

