const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const authRoutes = require('./routes/auth');
const caRoutes = require('./routes/ca');
const taskRoutes = require('./routes/task');
const paymentRoutes = require('./routes/payment');
const clientRoutes = require('./routes/client');

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'CA Connect App Backend is running with updated authentication',
    timestamp: new Date().toISOString(),
    authSystem: 'credential-based'
  });
});

// Test authentication endpoint - NEW ENDPOINT
app.post('/api/test-auth', async (req, res) => {
  try {
    console.log('=== TEST AUTH ENDPOINT CALLED ===');
    const { email, password } = req.body;
    
    console.log('Test auth endpoint - Testing credentials:', { email, password: password ? '***' : null });
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Test the User model directly
    const User = require('./models/User');
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('Test auth: User not found for email:', email);
      return res.status(400).json({ message: 'User not found' });
    }

    console.log('Test auth: User found, checking password...');
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('Test auth: Invalid password for user:', email);
      return res.status(400).json({ message: 'Invalid password' });
    }

    console.log('Test auth: Authentication successful for user:', email);
    res.json({
      message: 'Test authentication successful',
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Test auth endpoint error:', error);
    res.status(500).json({ message: 'Server error during test', error: error.message });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/ca', caRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/clients', clientRoutes);

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://kathipallimadhu:5YQE4RGlnP2zm9pS@userdata.gxuwo.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  console.log('=== BACKEND SERVER STARTING WITH UPDATED AUTH SYSTEM ===');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Test auth endpoint: POST http://localhost:${PORT}/api/test-auth`);

  });
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

module.exports = app; 