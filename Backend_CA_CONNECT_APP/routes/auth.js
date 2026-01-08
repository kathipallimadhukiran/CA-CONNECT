const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const CA = require('../models/CA');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { resetPasswordEmail, passwordResetConfirmationEmail } = require('../utils/emailTemplates');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user (CA, client, or staff)
// @access  Public
router.post('/register', [
  body('email')
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail(),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
  body('qualification')
    .trim()
    .notEmpty()
    .withMessage('Qualification is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { email, name, phone, qualification, password } = req.body;

    // Check if user already exists by email or phone
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone.trim() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase()
          ? 'Email already registered'
          : 'Phone number already registered'
      });
    }

    // Split name into first and last name
    const nameParts = name.trim().split(' ').filter(part => part.trim() !== '');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

    // Create user
    const user = new User({
      email: email.toLowerCase().trim(),
      password: password,
      firstName,
      lastName,
      phone: phone.trim(),
      userType: 'ca'
    });

    await user.save();
    let caProfileData;

    // Create CA profile
    try {
      const caToSave = new CA({
        userId: user._id,
        caNumber: `CA${Date.now()}`,
        specialization: [],
        experience: 0, // Default experience
        qualification: qualification.trim(),
        company: '',
        address: {},
        services: [],
        availability: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '09:00', end: '13:00', available: false },
          sunday: { start: '09:00', end: '17:00', available: false }
        },
        isVerified: false
      });
      caProfileData = await caToSave.save();
    } catch (error) {
      // If CA profile creation fails, delete the created user
      await User.findByIdAndDelete(user._id);
      throw error; // Rethrow to be caught by the main catch block
    }

    // Prepare response without token
    const userProfile = user.getProfile();
    userProfile.caProfile = caProfileData;

    return res.status(201).json({
      success: true,
      message: 'CA registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType,
        phone: user.phone
      },
      caProfile: caProfileData
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login CA user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data without token
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType,
        phone: user.phone,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current CA profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    // Get CA profile
    const caProfile = await CA.findOne({ userId: user._id });
    const profile = { ...user.toObject(), caProfile };

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update CA profile
// @access  Private
router.put('/profile', protect, [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone } = req.body;
    const updateFields = {};

    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (phone) updateFields.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change CA password
// @access  Private
router.post('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout CA user
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // Get user from middleware
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update lastLogout timestamp
    user.lastLogout = new Date();
    await user.save();

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// @route   POST /api/auth/debug
// @desc    Debug endpoint to test authentication
// @access  Public
router.post('/debug', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Debug endpoint - Received credentials:', { email, password: password ? '***' : null });

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('Debug endpoint - User found:', !!user);

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log('Debug endpoint - Password match:', isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    res.json({
      message: 'Debug authentication successful',
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Server error during debug', error: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Forgot password - Send verification code to email
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Don't reveal if user doesn't exist (for security)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification code has been sent.'
      });
    }

    // Generate and save verification code
    const verificationCode = user.generateVerificationCode();
    await user.save({ validateBeforeSave: false });

    try {
      // Send email with verification code
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Verification Code',
        ...resetPasswordEmail(`${user.firstName} ${user.lastName}`, verificationCode)
      });

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification code has been sent.'
      });
    } catch (error) {
      console.error('Email sending error:', error);
      user.resetVerificationCode = undefined;
      user.resetVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
});

// @route   POST /api/auth/verify-reset-code
// @desc    Verify reset code and update password
// @access  Public
router.post('/verify-reset-code', [
  body('email')
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail(),
  body('code')
    .notEmpty()
    .withMessage('Verification code is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, code, newPassword } = req.body;

    // Find user by email with valid verification code
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Verify the code
    if (!user.verifyResetCode(code)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Update password and clear verification code
    user.password = newPassword;
    user.resetVerificationCode = undefined;
    user.resetVerificationExpires = undefined;

    await user.save();

    // Send confirmation email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Successful',
        ...passwordResetConfirmationEmail(`${user.firstName} ${user.lastName}`)
      });
    } catch (emailError) {
      console.error('Confirmation email error:', emailError);
      // Don't fail the request if the confirmation email fails
    }

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

module.exports = router;