const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Return = require('../models/Return');
const { check, validationResult } = require('express-validator');

// Input validation rules
const updateStatusValidation = [
  check('clientId')
    .notEmpty().withMessage('Client ID is required')
    .custom(id => mongoose.Types.ObjectId.isValid(id)).withMessage('Invalid client ID format'),
  check('month').notEmpty().withMessage('Month is required'),
  check('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'in-progress', 'completed', 'filed']).withMessage('Invalid status value'),
  check('monthNumber')
    .notEmpty().withMessage('Month number is required')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  check('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100')
];

// Format validation errors
const formatValidationErrors = (errors) => {
  return errors.array().map(err => ({
    field: err.param,
    message: err.msg
  }));
};

// @route   GET api/returns
// @desc    Get all returns
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('Fetching returns from database...');
    const returns = await Return.find().populate('client', 'name email phoneNumber');
    console.log(`Found ${returns.length} return records`);
    
    // Normalize month format to match frontend expectation
    const normalizedReturns = returns.map(returnItem => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[returnItem.monthNumber - 1];
      const year = returnItem.year;
      const normalizedMonth = `${monthName} '${year.toString().slice(-2)}`;
      
      return {
        ...returnItem.toObject(),
        month: normalizedMonth // Ensure consistent format
      };
    });
    
    console.log('Normalized returns (first 3):', normalizedReturns.slice(0, 3));
    
    res.json({
      success: true,
      count: normalizedReturns.length,
      returns: normalizedReturns, // Changed from 'data' to 'returns' to match frontend expectation
      data: normalizedReturns // Keep both for backward compatibility
    });
  } catch (err) {
    console.error('Error fetching returns:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// @route   GET api/returns/debug
// @desc    Debug endpoint to check database state
// @access  Public
router.get('/debug', async (req, res) => {
  try {
    console.log('=== DEBUG ENDPOINT CALLED ===');
    
    // Check if Return model exists
    const ReturnModel = require('../models/Return');
    console.log('Return model loaded:', !!ReturnModel);
    
    // Check database connection
    const dbState = mongoose.connection.readyState;
    console.log('Database connection state:', dbState);
    
    // Count total returns
    const totalReturns = await Return.countDocuments();
    console.log('Total returns in database:', totalReturns);
    
    // Get all returns without population
    const rawReturns = await Return.find();
    console.log('Raw returns (first 3):', rawReturns.slice(0, 3));
    
    // Get all returns with population
    const populatedReturns = await Return.find().populate('client', 'name email phoneNumber');
    console.log('Populated returns (first 3):', populatedReturns.slice(0, 3));
    
    res.json({
      success: true,
      debug: {
        modelLoaded: !!ReturnModel,
        dbState: dbState,
        totalReturns: totalReturns,
        rawReturns: rawReturns.slice(0, 3),
        populatedReturns: populatedReturns.slice(0, 3)
      }
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// @route   POST api/returns/test-create
// @desc    Create a test return record for debugging
// @access  Public
router.post('/test-create', async (req, res) => {
  try {
    console.log('=== TEST CREATE ENDPOINT CALLED ===');
    
    // Get the first client to create a test return
    const Client = mongoose.model('Client');
    const firstClient = await Client.findOne();
    
    if (!firstClient) {
      return res.status(400).json({
        success: false,
        message: 'No clients found. Please create a client first.'
      });
    }
    
    console.log('Using client for test:', firstClient._id, firstClient.name);
    
    // Create a test return record
    const testReturn = new Return({
      client: firstClient._id,
      month: 'September',
      monthNumber: 9,
      year: 2025,
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId('000000000000000000000001'),
      updatedBy: new mongoose.Types.ObjectId('000000000000000000000001')
    });
    
    const savedReturn = await testReturn.save();
    console.log('Test return created:', savedReturn);
    
    res.json({
      success: true,
      message: 'Test return record created successfully',
      data: savedReturn
    });
  } catch (err) {
    console.error('Test create error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Update return status
// @access  Public
router.put('/update-status', ...updateStatusValidation, async (req, res) => {
  const requestTime = new Date();
  
  try {
    // Log the incoming request with detailed information
    console.log('\n=== INCOMING REQUEST ===');
    console.log('Time:', requestTime.toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Params:', JSON.stringify(req.params, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('==========================\n');

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorData = {
        success: false,
        message: 'Validation failed',
        errors: formatValidationErrors(errors)
      };
      console.error('Validation errors:', errorData);
      return res.status(400).json(errorData);
    }

    const { clientId, month, status, monthNumber, year } = req.body;
    
    // For now, we'll use a default user ID since auth isn't fully implemented
    const userId = req.user?._id || new mongoose.Types.ObjectId('000000000000000000000001');
    
    // Normalize month name to short format (e.g., 'September 2025' -> 'Sep '25')
    const normalizeMonth = (monthStr, monthNumber, year) => {
      if (!monthStr) return '';
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[monthNumber - 1];
      return `${monthName} '${year.toString().slice(-2)}`;
    };
    
    const normalizedMonth = normalizeMonth(month, parseInt(monthNumber, 10), parseInt(year, 10));

    // Check if client exists - using findOne to avoid potential cast errors
    const client = await mongoose.model('Client').findById(clientId).lean();
    if (!client) {
      const error = { success: false, message: 'Client not found' };
      console.error('Client not found:', { clientId });
      return res.status(404).json(error);
    }

    // Prepare update data with proper types
    const updateData = {
      status: status.toLowerCase(),
      month: normalizedMonth,
      monthNumber: parseInt(monthNumber, 10),
      year: parseInt(year, 10),
      updatedBy: userId,
      updatedAt: requestTime
    };
    
    console.log('Processing update with data:', {
      clientId,
      originalMonth: month,
      normalizedMonth,
      status,
      monthNumber,
      year,
      updateData
    });
    
    // Prepare the update operation
    const updateOperation = {
      $set: updateData,
      $setOnInsert: {
        client: new mongoose.Types.ObjectId(clientId),
        createdBy: userId,
        createdAt: requestTime
      }
    };

    // Find and update or create the return record
    const query = { 
      client: new mongoose.Types.ObjectId(clientId),
      month: normalizedMonth,
      year: parseInt(year, 10)
    };
    
    console.log('Database query:', JSON.stringify(query, null, 2));
    
    const options = {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    };
    
    const returnDoc = await Return.findOneAndUpdate(
      query,
      updateOperation,
      options
    ).populate('client', 'name email phoneNumber');

    // Format the response
    const response = {
      success: true,
      message: 'Return status updated successfully',
      data: {
        id: returnDoc._id,
        client: {
          id: returnDoc.client._id,
          name: returnDoc.client.name,
          email: returnDoc.client.email,
          phone: returnDoc.client.phoneNumber
        },
        month: returnDoc.month,
        monthNumber: returnDoc.monthNumber,
        year: returnDoc.year,
        status: returnDoc.status,
        updatedAt: returnDoc.updatedAt,
        updatedBy: returnDoc.updatedBy
      }
    };

    // Log the response
    console.log('\n=== SERVER RESPONSE ===');
    console.log('Time:', new Date().toISOString());
    console.log('Status Code:', 200);
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('======================\n');

    return res.json(response);
    
  } catch (err) {
    const errorTime = new Date();
    console.error('\n=== ERROR OCCURRED ===');
    console.error('Time:', errorTime.toISOString());
    console.error('Error:', err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack:', err.stack);
    }
    console.error('Request Details:', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    });
    console.error('==================\n');

    return res.status(500).json({
      success: false,
      message: 'Failed to update return status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;