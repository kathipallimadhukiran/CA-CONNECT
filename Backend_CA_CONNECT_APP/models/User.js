const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  userType: {
    type: String,
    enum: ['ca', 'client', 'staff'],
    required: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  resetVerificationCode: String,
  resetVerificationExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user profile (without password)
userSchema.methods.getProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.resetVerificationCode;
  delete userObject.resetVerificationExpires;
  return userObject;
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate and hash verification code
userSchema.methods.generateVerificationCode = function () {
  // Generate a 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the code and set to resetVerificationCode field
  this.resetVerificationCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  // Set expiry (10 minutes)
  this.resetVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return code;
};

// Verify the reset code
userSchema.methods.verifyResetCode = function (code) {
  if (!code || !this.resetVerificationCode || !this.resetVerificationExpires) {
    return false;
  }

  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  return this.resetVerificationCode === hashedCode &&
    this.resetVerificationExpires > Date.now();
};

module.exports = mongoose.model('User', userSchema);