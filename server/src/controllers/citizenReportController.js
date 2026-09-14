import mongoose from 'mongoose';
import CitizenReport from '../models/CitizenReport.js';
import RiskZone from '../models/RiskZone.js';
import AuditLog from '../models/AuditLog.js';
import { emitEvent } from '../services/socketService.js';

// POST /api/citizen-reports (Supports queued sync from offline PWA)
export const createCitizenReport = async (req, res, next) => {
  try {
    const {
      villageName,
      districtId,
      districtName,
      category,
      description,
      photoUrl,
      coordinates,
      reporterName,
      reporterPhone,
    } = req.body;

    // Validate photo payload size (10MB limit)
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Photo payload exceeds 10MB limit. Please compress photo before submitting.',
      });
    }

    const reportCode = `REP-${Date.now().toString().slice(-6)}`;

    // AI Mock CNN Image Pre-Screening Classifier
    let aiPreScreening = {
      confidencePct: 78,
      label: 'Likely genuine shear crack / ground displacement',
      isVerifiedLikely: true,
    };

    if (category === 'RISING_WATER') {
      aiPreScreening = {
        confidencePct: 84,
        label: 'Rapid surface water accumulation detected',
        isVerifiedLikely: true,
      };
    } else if (category === 'BLOCKED_ROAD') {
      aiPreScreening = {
        confidencePct: 91,
        label: 'Rockfall debris / mud deposition obstructing vehicular path',
        isVerifiedLikely: true,
      };
    }

    const report = await CitizenReport.create({
      reportCode,
      reporterId: req.user?._id,
      reporterName: reporterName ? String(reporterName).trim().slice(0, 80) : (req.user?.name || 'Village Resident'),
      reporterPhone: reporterPhone ? String(reporterPhone).trim().slice(0, 20) : (req.user?.phone || 'Citizen App'),
      districtId: districtId ? String(districtId).trim().slice(0, 10) : 'EKH',
      districtName: districtName ? String(districtName).trim().slice(0, 60) : 'East Khasi Hills',
      villageName: villageName ? String(villageName).trim().slice(0, 60) : 'Sohra',
      category: category || 'CRACK_LANDSLIDE_SIGN',
      description: description ? String(description).trim().slice(0, 1000) : '',
      photoUrl: photoUrl || '',
      location: {
        type: 'Point',
        coordinates: Array.isArray(coordinates) && coordinates.length === 2
          ? [Number(coordinates[0]), Number(coordinates[1])]
          : [91.7324, 25.2986],
      },
      aiPreScreening,
      verificationStatus: 'PENDING',
    });

    emitEvent('CITIZEN_REPORT_SUBMITTED', report, report.districtId);

    res.status(201).json({
      success: true,
      message: 'Ground report submitted and queued for EOC review.',
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/citizen-reports?district=&status=
export const getCitizenReports = async (req, res, next) => {
  try {
    const { district, status, category } = req.query;
    const filter = {};

    if (district && district !== 'ALL') filter.districtId = String(district).trim();
    if (status && status !== 'ALL') filter.verificationStatus = String(status).trim();
    if (category && category !== 'ALL') filter.category = String(category).trim();

    const reports = await CitizenReport.find(filter)
      .populate('reporterId', 'name phone')
      .sort({ submittedAt: -1 });

    const summary = {
      total: reports.length,
      pending: reports.filter(r => r.verificationStatus === 'PENDING').length,
      verified: reports.filter(r => r.verificationStatus === 'VERIFIED').length,
      rejected: reports.filter(r => r.verificationStatus === 'REJECTED').length,
    };

    res.json({
      success: true,
      summary,
      count: reports.length,
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/citizen-reports/:id/verify
export const verifyCitizenReport = async (req, res, next) => {
  try {
    const { status, officerNotes } = req.body; // VERIFIED, REJECTED, ASSIGNED_TO_FIELD
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report identifier.' });
    }

    const report = await CitizenReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // IDOR Jurisdiction check: Officer must belong to the report's district or be SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN' && req.user.jurisdiction?.districtId && req.user.jurisdiction.districtId !== report.districtId) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Officer from '${req.user.jurisdiction.districtId}' cannot verify reports for district '${report.districtId}'.`,
      });
    }

    const validStatuses = ['VERIFIED', 'REJECTED', 'ASSIGNED_TO_FIELD', 'PENDING'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status.' });
    }

    report.verificationStatus = status;
    report.verifiedByOfficerId = req.user?._id;
    report.officerNotes = officerNotes ? String(officerNotes).trim().slice(0, 500) : '';
    await report.save();

    await AuditLog.create({
      userId: req.user?._id,
      userName: req.user?.name || 'Officer',
      userRole: req.user?.role || 'OFFICER',
      districtId: report.districtId,
      action: status === 'VERIFIED' ? 'CITIZEN_REPORT_VERIFIED' : 'CITIZEN_REPORT_REJECTED',
      details: `Citizen report ${report.reportCode} (${report.villageName}) marked as ${status}.`,
      metadata: { reportId: report._id },
    });

    emitEvent('CITIZEN_REPORT_VERIFIED', report, report.districtId);

    res.json({
      success: true,
      message: `Report ${report.reportCode} status updated to ${status}.`,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

