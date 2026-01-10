const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Return = require('../models/Return');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Filing = require('../models/Filing');

const { check, validationResult } = require('express-validator');

// Helper function to update client balance and create payment record
const updateClientBalance = async (clientId, amount, description) => {
  try {
    // Update client's outstanding balance
    const client = await Client.findById(clientId);
    if (!client) {
      console.error(`Client not found: ${clientId}`);
      return false;
    }

    // Update client's outstanding balance
    client.totalOutstanding = (client.totalOutstanding || 0) + amount;
    client.lastPaymentDate = new Date();
    await client.save();

    // Create payment record
    const payment = new Payment({
      clientId: client._id,
      amount,
      description,
      paymentMethod: 'bank-transfer', // Using a valid payment method
      status: 'pending', // Using valid status 'pending' instead of 'unpaid'
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
      createdBy: new mongoose.Types.ObjectId('000000000000000000000001'), // System user
      type: 'regular' // Explicitly set type to 'regular' as it's required
    });

    await payment.save();
    return true;
  } catch (error) {
    console.error('Error updating client balance:', error);
    return false;
  }
};

// Input validation rules
const updateStatusValidation = [
  check('clientId')
    .notEmpty().withMessage('Client ID is required')
    .custom(id => mongoose.Types.ObjectId.isValid(id)).withMessage('Invalid client ID format'),
  check('monthNumber')
    .notEmpty().withMessage('Month number is required')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  check('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'in-progress', 'completed', 'filed', 'not_filed']).withMessage('Invalid status value'),
  check('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
  check('gstNumber')
    .notEmpty().withMessage('GST number is required')
];

// Format validation errors
const formatValidationErrors = (errors) => {
  return errors.array().map(err => ({
    field: err.param,
    message: err.msg
  }));
};

// Helper function to get month name
const getMonthName = (monthNumber) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[monthNumber - 1] || '';
};

// @route   GET api/returns/all
// @desc    Get all clients with their return statuses
router.get('/all', async (req, res) => {
  // Disable caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Accel-Expires', '0');

  try {
    const {
      year = new Date().getFullYear(),
      month,
      status,
      search,
      caUserName,
      isActive
    } = req.query;

    // Get all clients with optional isActive filter
    const clientQuery = {};

    // Add caUserName filter if provided
    if (caUserName) {
      clientQuery.caUserName = caUserName;
    }

    // Add isActive filter if specified
    if (isActive !== undefined) {
      clientQuery.isActive = isActive === 'true';
    }

    if (search) {
      clientQuery.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(
      clientQuery,
      'businessName email phone gstNumber gstType frequency isActive firstName lastName'
    ).lean();
    clients.forEach(client => {
      client.gstType = (client.gstType || 'Regular').toLowerCase();
    });


    // Get all returns for the current year for these clients
    const returns = await Return.find({
      year: parseInt(year),
      client: { $in: clients.map(c => c._id) }
    }).lean();

    // Create a map of clientId to their return data
    const returnMap = {};
    returns.forEach(ret => {
      if (!returnMap[ret.client.toString()]) {
        returnMap[ret.client.toString()] = {
          year: parseInt(year),
          months: {}
        };
      }
      // Merge months from all returns for this client
      Object.entries(ret.months || {}).forEach(([m, data]) => {
        returnMap[ret.client.toString()].months[m] = data;
      });
    });

    // Prepare response with all clients and their return statuses
    const responseData = clients.map(client => {
      const clientReturn = returnMap[client._id.toString()] || {
        year: parseInt(year),
        months: {}
      };

      // Initialize all months with 'not_filed' status
      const allMonths = {};

      const quarterMonths = [3, 6, 9, 12];

      // In the GET /all route, update the month data normalization
      for (let m = 1; m <= 12; m++) {
        const raw = clientReturn.months?.[m] || {};

        allMonths[m] = {
          gstr1: {
            status: raw?.gstr1?.status || 'not_filed',
            fee: raw?.gstr1?.fee || 0
          },
          gstr3b: {
            status: raw?.gstr3b?.status || 'not_filed',
            fee: raw?.gstr3b?.fee || 0
          }
        };
      }

      // Apply month filter if provided
      let filteredMonths = { ...allMonths };
      if (month) {
        const monthNum = parseInt(month);
        if (monthNum >= 1 && monthNum <= 12) {
          filteredMonths = { [monthNum]: allMonths[monthNum] };
        }
      }

      // Apply status filter if provided
      if (status && status !== 'all') {
        const filteredByStatus = {};
        Object.entries(filteredMonths).forEach(([m, data]) => {
          if (data.status === status) {
            filteredByStatus[m] = data;
          }
        });
        return {
          client,
          gstNumber: client.gstNumber,
          year: parseInt(year),
          months: filteredByStatus,
          isActive: client.isActive !== false // Default to true if not set
        };
      }

      return {
        client,
        gstNumber: client.gstNumber,
        year: parseInt(year),
        months: filteredMonths,
        isActive: client.isActive !== false // Default to true if not set
      };
    });

    // Only filter out clients if we have a status filter and no search
    const filteredData = (status && status !== 'all' && !search)
      ? responseData.filter(item => Object.values(item.months).some(m => m.status === status))
      : responseData;

    res.json({
      success: true,
      data: filteredData,
      pagination: {
        total: responseData.length,
        totalPages: 1,
        currentPage: 1,
        limit: responseData.length
      }
    });

  } catch (error) {
    console.error('Error fetching return filings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching return filings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET api/returns
// @desc    Get all returns for a client
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { clientId, gstNumber, year } = req.query;

    if (!clientId || !gstNumber || !year) {
      return res.status(400).json({
        success: false,
        message: 'clientId, gstNumber, and year are required query parameters'
      });
    }

    console.log(`Fetching returns for client ${clientId}, GST ${gstNumber}, year ${year}`);

    // Find or create return document for the client, GST, and year
    const returnDoc = await Return.findOne({
      client: clientId,
      gstNumber,
      year: parseInt(year, 10)
    }).populate('client', 'name email phoneNumber gstNumber');

    if (!returnDoc) {
      // If no document exists, create a default structure with all months as pending
      const defaultMonths = {};
      for (let month = 1; month <= 12; month++) {
        defaultMonths[month] = {
          month,
          status: 'pending',
          monthName: getMonthName(month)
        };
      }

      return res.json({
        success: true,
        data: {
          _id: null,
          client: clientId,
          gstNumber,
          year: parseInt(year, 10),
          months: defaultMonths,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // Convert to the required format
    const formattedData = returnDoc.getFormattedData();

    res.json({
      success: true,
      data: formattedData
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

// @route   GET api/returns/client/:clientId
// @desc    Get all returns for a client
// @access  Public
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID format'
      });
    }

    console.log(`Fetching all returns for client ${clientId}`);

    // Get client details
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get all returns for this client
    const returns = await Return.find({ client: clientId })
      .sort({ year: -1 });

    // Group by GST and year
    const result = {
      client: {
        _id: client._id,
        name: client.firstName + ' ' + client.lastName,
        email: client.email,
        phone: client.phone,
        businessName: client.businessName,
        gstNumber: client.gstNumber
      },
      gst: {}
    };

    // Process each return document
    for (const returnDoc of returns) {
      if (!result.gst[returnDoc.gstNumber]) {
        result.gst[returnDoc.gstNumber] = {};
      }

      if (!result.gst[returnDoc.gstNumber][returnDoc.year]) {
        result.gst[returnDoc.gstNumber][returnDoc.year] = {
          pending: [],
          completed: [],
          overdue: []
        };
      }

      // Process each month in the return document if months exists and is iterable
      if (returnDoc.months && typeof returnDoc.months.entries === 'function') {
        for (const [month, data] of returnDoc.months.entries()) {
          // Skip if data is null or undefined
          if (!data) continue;

          const monthData = {
            month: parseInt(month, 10),
            monthName: getMonthName(parseInt(month, 10)),
            year: returnDoc.year,
            status: data.status || 'pending', // Default to 'pending' if status is not set
            remarks: data.remarks || '',
            documents: data.documents || [],
            updatedAt: data.updatedAt || new Date(),
            updatedBy: data.updatedBy || null
          };

          // Categorize by status
          const status = data.status === 'filed' ? 'overdue' : data.status;
          if (result.gst[returnDoc.gstNumber][returnDoc.year][status]) {
            result.gst[returnDoc.gstNumber][returnDoc.year][status].push(monthData);
          }
        }
      }
    } // End of for...of loop

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Error fetching client returns:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


// @route   PUT /api/returns/update-status
// @desc    Update return status for a client, GST, year, and month
// @access  Public
// In Backend_CA_CONNECT_APP\routes\returns.js
router.put('/update-status', async (req, res) => {
  try {
    const {
      clientId,
      year,
      monthNumber,
      returnType, // 'gstr1', 'gstr3b', or 'both'
      status,
      fee = 0,
      gstNumber
    } = req.body;

    /* ===============================
       IFF / COMPOSITION (SINGLE RETURN)
       =============================== */
    if (returnType === 'both') {

      await Return.updateOne(
        { client: clientId, gstNumber, year },
        {
          $set: {
            [`months.${monthNumber}.gstr1.status`]: status,
            [`months.${monthNumber}.gstr1.fee`]: fee,
            [`months.${monthNumber}.gstr1.filedAt`]: status === 'filed' ? new Date() : null,

            [`months.${monthNumber}.gstr3b.status`]: status,
            [`months.${monthNumber}.gstr3b.fee`]: fee,
            [`months.${monthNumber}.gstr3b.filedAt`]: status === 'filed' ? new Date() : null,
          }
        },
        { upsert: true }
      );

      // ONE payment for IFF / Composition
      if (status === 'filed' && fee > 0) {
        const payment = await Payment.create({
          clientId,
          amount: fee,
          description: `GST Return (IFF/Composition) for ${monthNumber}/${year}`,
          paymentMethod: 'bank-transfer',
          status: 'pending',
          dueDate: new Date(year, monthNumber, 20),
          type: 'outstanding',
          createdBy: req.user?._id || new mongoose.Types.ObjectId('000000000000000000000001')
        });


      }
    }

    /* ===============================
       REGULAR GST (GSTR-1 / GSTR-3B)
       =============================== */
    else {

      await Return.updateOne(
        { client: clientId, gstNumber, year },
        {
          $set: {
            [`months.${monthNumber}.${returnType}.status`]: status,
            [`months.${monthNumber}.${returnType}.fee`]: fee,
            [`months.${monthNumber}.${returnType}.filedAt`]:
              status === 'filed' ? new Date() : null
          }
        },
        { upsert: true }
      );

      // ONE payment per return
      if (status === 'filed' && fee > 0) {
        const payment = await Payment.create({
          clientId,
          amount: fee,
          description: `GSTR-${returnType === 'gstr1' ? '1' : '3B'} for ${monthNumber}/${year}`,
          paymentMethod: 'bank-transfer',
          status: 'pending',
          dueDate: new Date(
            year,
            monthNumber,
            returnType === 'gstr1' ? 11 : 20
          ),
          type: 'outstanding',
          createdBy: req.user?._id || new mongoose.Types.ObjectId('000000000000000000000001')
        });

        // Payment record created - no manual client total updates needed
        // totals are now derived from payments aggregation
      }
    }

    return res.json({ success: true });

  } catch (err) {
    console.error('Error updating return status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update return status'
    });
  }
});


// ... rest of the code ...


module.exports = router;