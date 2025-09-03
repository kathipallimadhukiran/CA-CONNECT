const User = require('../models/User');

// Middleware to protect routes using stored credentials
const protect = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE CALLED ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    
    // Debug: Log all headers to see what's being sent
    console.log('Auth middleware - All headers:', req.headers);
    console.log('Auth middleware - X-User-Email:', req.headers['x-user-email']);
    console.log('Auth middleware - X-User-Password:', req.headers['x-user-password']);
    
    const userEmail = req.headers['x-user-email'];
    const userPassword = req.headers['x-user-password'];

    if (!userEmail || !userPassword) {
      console.log('Auth middleware - Missing credentials');
      return res.status(401).json({ 
        message: 'Access denied. No credentials provided.',
        required: ['X-User-Email', 'X-User-Password'],
        received: {
          email: userEmail ? 'provided' : 'missing',
          password: userPassword ? 'provided' : 'missing'
        }
      });
    }

    console.log('Auth middleware - Looking up user with email:', userEmail);
    // Find user by email and verify password
    const user = await User.findOne({ email: userEmail.toLowerCase() });
    
    if (!user) {
      console.log('Auth middleware - User not found for email:', userEmail);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    console.log('Auth middleware - User found, verifying password...');
    // Verify password (assuming you have a method to compare passwords)
    const isPasswordValid = await user.comparePassword(userPassword);
    
    if (!isPasswordValid) {
      console.log('Auth middleware - Invalid password for user:', userEmail);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      console.log('Auth middleware - User account deactivated:', userEmail);
      return res.status(401).json({ message: 'User account is deactivated.' });
    }

    console.log('Auth middleware - Authentication successful for user:', userEmail);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed.' });
  }
};

// Optional auth middleware (doesn't fail if no credentials)
const optionalAuth = async (req, res, next) => {
  try {
    const userEmail = req.headers['x-user-email'];
    const userPassword = req.headers['x-user-password'];

    if (userEmail && userPassword) {
      const user = await User.findOne({ email: userEmail.toLowerCase() });
      
      if (user) {
        const isPasswordValid = await user.comparePassword(userPassword);
        if (isPasswordValid && user.isActive) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without user if authentication fails
    next();
  }
};

module.exports = {
  protect,
  optionalAuth
}; 