export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your account role (${req.user?.role || 'Guest'}) does not have permission to perform this operation.`,
      });
    }
    next();
  };
};
