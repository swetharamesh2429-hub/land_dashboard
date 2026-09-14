import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

// JWT Token generation (24 hours expiration)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'raksha_secret_dev_key_2026', {
    expiresIn: '24h',
  });
};

// Helper: Hash password reset token with SHA-256
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      role, // OFFICER, FIELD_OFFICER, CITIZEN
      preferredLanguage,
      jurisdiction,
      officerDetails,
      fieldOfficerDetails,
      citizenDetails,
    } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, phone number, password, and portal role.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number.',
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { phone: cleanPhone },
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this phone number or email already exists.',
      });
    }

    // Role-specific validation
    if (role === 'OFFICER') {
      if (!officerDetails?.officialId || !jurisdiction?.district) {
        return res.status(400).json({
          success: false,
          message: 'Official ID and District Jurisdiction are mandatory for Disaster Officer registration.',
        });
      }
    } else if (role === 'FIELD_OFFICER') {
      if (!fieldOfficerDetails?.employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is mandatory for Field Officer registration.',
        });
      }
    }

    const user = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : undefined,
      password,
      role,
      preferredLanguage: preferredLanguage || 'en',
      jurisdiction: jurisdiction || {
        state: 'Meghalaya',
        district: 'East Khasi Hills',
        districtId: 'EKH',
      },
      officerDetails: role === 'OFFICER' ? officerDetails : undefined,
      fieldOfficerDetails: role === 'FIELD_OFFICER' ? fieldOfficerDetails : undefined,
      citizenDetails: role === 'CITIZEN' ? citizenDetails : undefined,
    });

    const isPending = user.status === 'PENDING_APPROVAL';

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      districtId: user.jurisdiction?.districtId,
      action: 'USER_REGISTERED',
      details: `${user.role} registration for ${user.name} (${user.phone}). Status: ${user.status}.`,
    });

    res.status(201).json({
      success: true,
      message: isPending
        ? 'Official account registered successfully. Pending Super-Admin verification before activation.'
        : 'Citizen account registered successfully. You may now login.',
      status: user.status,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        jurisdiction: user.jurisdiction,
      },
      token: isPending ? null : generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { identifier, phone, email, password, portalRole } = req.body;
    const loginId = (identifier || phone || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered phone/email and password.',
      });
    }

    // Find user by phone or email
    const user = await User.findOne({
      $or: [{ phone: loginId }, { email: loginId.toLowerCase() }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No registered account found with these details.',
      });
    }

    // Check account lockout status (5 failed attempts = 15 min lock)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`,
        isLocked: true,
        lockExpiresAt: user.lockUntil,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed login count
      const updatedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockUntilDate = user.lockUntil;

      if (updatedAttempts >= 5) {
        lockUntilDate = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
        await AuditLog.create({
          userId: user._id,
          userName: user.name,
          userRole: user.role,
          districtId: user.jurisdiction?.districtId,
          action: 'ACCOUNT_LOCKED',
          details: `Account for ${user.name} locked for 15 minutes following 5 consecutive failed login attempts.`,
        });
      }

      await User.findByIdAndUpdate(user._id, {
        failedLoginAttempts: updatedAttempts >= 5 ? 0 : updatedAttempts,
        lockUntil: lockUntilDate,
      });

      return res.status(401).json({
        success: false,
        message: updatedAttempts >= 5
          ? 'Account locked for 15 minutes due to 5 failed login attempts. You may use "Forgot password?" to reset credentials.'
          : `Invalid password. Attempt ${updatedAttempts} of 5 before temporary lockout.`,
      });
    }

    // Reset failed attempts on successful password verification
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Portal mismatch validation (CRITICAL ROLE-BASED ACCESS CONTROL)
    if (portalRole && user.role !== portalRole && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: `This account is registered as '${user.role}', not '${portalRole}'. Please select the correct portal.`,
      });
    }

    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Your official account is currently pending administrative verification.',
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Contact EOC District Control Room.',
      });
    }

    const token = generateToken(user._id);

    // Audit log
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      districtId: user.jurisdiction?.districtId,
      action: 'USER_LOGIN',
      details: `${user.role} ${user.name} logged into ${portalRole || user.role} portal.`,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        jurisdiction: user.jurisdiction,
        preferredLanguage: user.preferredLanguage,
        officerDetails: user.officerDetails,
        fieldOfficerDetails: user.fieldOfficerDetails,
        citizenDetails: user.citizenDetails,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = req.body;
    const cleanId = (identifier || '').trim();

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered phone number or email address.',
      });
    }

    const user = await User.findOne({
      $or: [{ phone: cleanId }, { email: cleanId.toLowerCase() }],
    });

    if (!user) {
      // Prevent user enumeration: respond with generic confirmation
      return res.json({
        success: true,
        message: 'If an account exists with this identifier, a password reset authorization has been generated.',
      });
    }

    // Generate single-use reset token & 6-digit verification code
    const rawResetToken = crypto.randomBytes(24).toString('hex');
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(rawResetToken);

    user.passwordResetToken = tokenHash;
    user.passwordResetOtp = resetOtp;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes single-use expiry
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      districtId: user.jurisdiction?.districtId,
      action: 'PASSWORD_RESET_REQUESTED',
      details: `Password reset OTP generated for ${user.name} (${user.phone}). Valid for 15 minutes.`,
    });

    console.log(`\n🔑 [PASSWORD RESET GENERATED]: User: ${user.name} (${user.phone}) | OTP: ${resetOtp} | Token: ${rawResetToken}\n`);

    res.json({
      success: true,
      message: 'Password reset authorization dispatched. Valid for 15 minutes.',
      // Provided in development payload for seamless demo execution
      devResetToken: rawResetToken,
      devResetOtp: resetOtp,
      expiresInMinutes: 15,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, otp, identifier, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.',
      });
    }

    let query = {
      passwordResetExpires: { $gt: new Date() },
    };

    if (token) {
      query.passwordResetToken = hashToken(token.trim());
    } else if (otp && identifier) {
      query.passwordResetOtp = otp.trim();
      query.$or = [{ phone: identifier.trim() }, { email: identifier.toLowerCase().trim() }];
    } else if (otp) {
      query.passwordResetOtp = otp.trim();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Reset authorization token or OTP code is required.',
      });
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token. Please request a fresh authorization.',
      });
    }

    // Set new password (will be re-hashed by pre-save hook with salt 12)
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      districtId: user.jurisdiction?.districtId,
      action: 'PASSWORD_RESET_COMPLETED',
      details: `Password successfully updated for ${user.name} (${user.phone}). Security token invalidated.`,
    });

    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password successfully updated! You are now securely authenticated.',
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        jurisdiction: user.jurisdiction,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

