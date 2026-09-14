import mongoose from 'mongoose';
import FieldTask from '../models/FieldTask.js';
import Alert from '../models/Alert.js';
import RoadSegment from '../models/RoadSegment.js';
import AuditLog from '../models/AuditLog.js';
import { emitEvent } from '../services/socketService.js';

// GET /api/field-tasks/my
export const getMyTasks = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'FIELD_OFFICER') {
      filter.$or = [
        { fieldOfficerId: req.user._id },
        { districtId: req.user.jurisdiction?.districtId },
      ];
    } else if (req.query.district) {
      filter.districtId = String(req.query.district).trim();
    }

    const tasks = await FieldTask.find(filter)
      .populate('alertId')
      .populate('riskZoneId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/field-tasks/:id/submit
export const submitFieldTaskReport = async (req, res, next) => {
  try {
    const { checklist, evidence, notes } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task identifier format.' });
    }

    const task = await FieldTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Field task not found' });
    }

    // IDOR Protection: Enforce task ownership / jurisdiction authorization
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const isAssignedInspector = task.fieldOfficerId && task.fieldOfficerId.toString() === req.user._id.toString();
    const isDistrictOfficer = req.user.role === 'OFFICER' && req.user.jurisdiction?.districtId === task.districtId;
    const isDistrictInspector = req.user.role === 'FIELD_OFFICER' && req.user.jurisdiction?.districtId === task.districtId;

    if (!isSuperAdmin && !isAssignedInspector && !isDistrictOfficer && !isDistrictInspector) {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        districtId: req.user.jurisdiction?.districtId,
        action: 'UNAUTHORIZED_IDOR_ATTEMPT',
        details: `User attempted to submit inspection on task ${task.taskCode} outside assigned jurisdiction (${task.districtId}).`,
      });

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to submit verification data for tasks outside your assigned jurisdiction.',
      });
    }

    // Photo size validation (Limit to 10MB base64)
    if (evidence?.photoUrl && typeof evidence.photoUrl === 'string' && evidence.photoUrl.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Evidence photo payload exceeds 10MB size limit. Please compress image before transmitting.',
      });
    }

    if (checklist && Array.isArray(checklist)) task.checklist = checklist;
    if (evidence) {
      task.evidence = {
        ...task.evidence,
        ...evidence,
        notes: notes ? String(notes).trim() : (evidence.notes ? String(evidence.notes).trim() : ''),
      };
    }
    task.status = 'COMPLETED';
    task.submittedAt = new Date();
    await task.save();

    // If attached to an Alert, update the alert's field verification status
    if (task.alertId && mongoose.Types.ObjectId.isValid(task.alertId)) {
      const alert = await Alert.findById(task.alertId);
      if (alert) {
        alert.fieldVerification.status = 'SUBMITTED';
        alert.fieldVerification.reportSummary = evidence?.notes || 'Field verification inspection completed.';
        alert.fieldVerification.evidencePhotoUrl = evidence?.photoUrl || '';
        alert.fieldVerification.submittedAt = new Date();
        await alert.save();

        emitEvent('FIELD_VERIFICATION_SUBMITTED', {
          alertId: alert._id,
          taskId: task._id,
          villageName: task.villageName,
          fieldOfficerName: task.fieldOfficerName,
          evidence: task.evidence,
          submittedAt: task.submittedAt,
        }, task.districtId);
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      districtId: task.districtId,
      action: 'FIELD_VERIFICATION_SUBMITTED',
      details: `Field Officer ${req.user.name} submitted inspection report for ${task.villageName} (${task.evidence?.observedSeverity}).`,
      metadata: { taskId: task._id, alertId: task.alertId },
    });

    res.json({
      success: true,
      message: 'Field verification submitted and transmitted to District EOC in real time.',
      task,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/field-tasks/road-status
export const updateRoadStatus = async (req, res, next) => {
  try {
    const { roadSegmentId, status, alternateRoute } = req.body;

    if (!roadSegmentId || !mongoose.Types.ObjectId.isValid(roadSegmentId)) {
      return res.status(400).json({ success: false, message: 'Valid road segment identifier required.' });
    }

    const road = await RoadSegment.findById(roadSegmentId);
    if (!road) {
      return res.status(404).json({ success: false, message: 'Road segment not found' });
    }

    // Enforce District Jurisdiction
    if (req.user.role !== 'SUPER_ADMIN' && req.user.jurisdiction?.districtId && req.user.jurisdiction.districtId !== road.districtId) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You cannot alter lifeline road status for district '${road.districtId}' from your jurisdiction '${req.user.jurisdiction.districtId}'.`,
      });
    }

    const allowedStatuses = ['CLEAR', 'CAUTION', 'BLOCKED', 'CLOSED'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid road status value.' });
    }

    road.status = status;
    if (alternateRoute) road.alternateRouteDescription = String(alternateRoute).trim();
    road.lastInspectionTime = new Date();
    await road.save();

    emitEvent('ROAD_STATUS_UPDATED', road, road.districtId);

    res.json({
      success: true,
      message: `Road ${road.name} status updated to ${status}.`,
      road,
    });
  } catch (err) {
    next(err);
  }
};

