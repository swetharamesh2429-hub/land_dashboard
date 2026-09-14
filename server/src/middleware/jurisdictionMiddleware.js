export const enforceJurisdiction = (req, res, next) => {
  // Super admins have state/multi-district clearance
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const targetDistrictId = req.params.districtId || req.query.districtId || req.body.districtId;

  // If endpoint doesn't specify district or if user is citizen/field operating in assigned zone
  if (!targetDistrictId) {
    return next();
  }

  const userDistrictId = req.user.jurisdiction?.districtId;
  if (userDistrictId && userDistrictId !== targetDistrictId && req.user.role === 'OFFICER') {
    return res.status(403).json({
      success: false,
      message: `Jurisdiction violation: Officer from district '${userDistrictId}' cannot alter emergency states for district '${targetDistrictId}'.`,
    });
  }

  next();
};
