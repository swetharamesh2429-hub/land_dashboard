import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['OFFICER', 'FIELD_OFFICER', 'CITIZEN', 'SUPER_ADMIN'],
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'],
    default: function () {
      return this.role === 'CITIZEN' ? 'ACTIVE' : 'PENDING_APPROVAL';
    },
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'hi', 'as', 'bn', 'ne', 'kha'],
    default: 'en',
  },
  // Jurisdiction / Regional Binding
  jurisdiction: {
    state: { type: String, default: 'Meghalaya' },
    district: { type: String, default: 'East Khasi Hills' },
    districtId: { type: String, default: 'EKH' },
    village: { type: String },
    block: { type: String },
  },
  // Role Specific Details
  officerDetails: {
    officialId: { type: String },
    department: { type: String, enum: ['SDMA', 'DDMA', 'MDoNER', 'NDMA', 'OTHER'] },
    designation: { type: String },
    officeContact: { type: String },
  },
  fieldOfficerDetails: {
    employeeId: { type: String },
    assignedBlock: { type: String },
    subRole: { type: String, enum: ['ROAD_INSPECTOR', 'VILLAGE_LIAISON', 'RESCUE_TEAM'] },
    reportingOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  citizenDetails: {
    village: { type: String },
    approxLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [91.7324, 25.2986],
      },
    },
  },
  // Security & Account Lockout
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  passwordResetOtp: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ 'citizenDetails.approxLocation': '2dsphere' });
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ passwordResetToken: 1 });

// Password hashing with strong cost factor
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;

