const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Task = require('../models/Task');
const CA = require('../models/CA');
const Client = require('../models/Client');

const router = express.Router();

// All routes in this file are prefixed with /api/payments

// Test route to verify payment router is working
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment routes are working',
    timestamp: new Date().toISOString(),
    routes: [
      'GET    /test',
      'GET    /client/:clientId/history',
      'GET    /',
      'GET    /task/:taskId',
      'POST   /outstanding',
      'POST   /manual',
      'PUT    /:paymentId/mark-paid'
    ]
  });
});

// @route   GET /client/:clientId/history
// @desc    Get payment history for a specific client
// @access  Private
// Full path: /api/payments/client/:clientId/history
router.get('/client/:clientId/history', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    // Validate client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const query = { clientId };

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalPayments = await Payment.countDocuments(query);

    res.json({
      payments,
      pagination: {
        total: totalPayments,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalPayments / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error while fetching payment history' });
  }
});

// @route   GET /
// @desc    Get all payments (with pagination & summary)
// @access  Public (or protect with auth if needed)
// Full path: /api/payments/
router.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;

    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalPayments = await Payment.countDocuments();
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });

    res.json({
      payments,
      pagination: {
        total: totalPayments,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalPayments / parseInt(limit))
      },
      summary: {
        totalPayments,
        pendingPayments,
        completedPayments: totalPayments - pendingPayments
      }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ message: 'Server error while fetching all payments' });
  }
});


// @route   GET /task/:taskId
// Full path: /api/payments/task/:taskId
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const payment = await Payment.findOne({ taskId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error while fetching payment' });
  }
});

// @route   POST /api/payment/create
router.post('/create', [
  body('taskId').isMongoId(),
  body('amount').isFloat({ min: 0 }),
  body('paymentMethod').isIn(['online', 'bank-transfer', 'upi', 'card', 'cash']),
  body('description').notEmpty().trim(),
  body('dueDate').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, amount, paymentMethod, description, dueDate } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const existingPayment = await Payment.findOne({ taskId });
    if (existingPayment) {
      return res.status(400).json({ message: 'Payment already exists for this task' });
    }

    const payment = new Payment({
      taskId,
      clientId: task.clientId, // ✅ link client
      amount,
      paymentMethod,
      description,
      dueDate: new Date(dueDate),
      currency: 'INR'
    });

    await payment.save();

    // Payment record created - totals are now derived from payments aggregation

    res.status(201).json({
      message: 'Payment created successfully',
      payment
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Server error while creating payment' });
  }
});

// @route   PUT /api/payment/:paymentId/status
router.put('/:paymentId/status', [
  body('status').isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']),
  body('transactionId').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId } = req.params;
    const { status, transactionId, notes } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const oldStatus = payment.status;

    payment.status = status;
    if (transactionId) payment.transactionId = transactionId;
    if (notes) payment.notes = notes;
    if (status === 'completed') {
      payment.paidAt = new Date();

      // Payment status updated - totals are now derived from payments aggregation
    }

    await payment.save();

    res.json({
      message: 'Payment status updated successfully',
      payment
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Server error while updating payment status' });
  }
});

// @route   POST /api/payment/:paymentId/refund
router.post('/:paymentId/refund', [
  body('amount').isFloat({ min: 0 }),
  body('reason').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ message: 'Can only refund completed payments' });
    }

    if (amount > payment.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed payment amount' });
    }

    await payment.processRefund(amount, reason);

    // Refund processed - totals are now derived from payments aggregation

    res.json({
      message: 'Refund processed successfully',
      payment
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Server error while processing refund' });
  }
});

// @route   POST /api/payment/outstanding
router.post('/outstanding', [
  body('clientId').isMongoId(),
  body('amount').isFloat({ min: 0 }),
  body('description').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clientId, amount, description } = req.body;

    const payment = new Payment({
      clientId,
      amount,
      description,
      status: 'pending',
      paymentMethod: 'cash',
      type: 'outstanding',
      dueDate: new Date(),
    });

    await payment.save();

    res.status(201).json({
      message: 'Outstanding payment request added successfully',
      payment,
    });
  } catch (error) {
    console.error('Create outstanding payment error:', error);
    res.status(500).json({ message: 'Server error while creating outstanding payment' });
  }
});

// @route   POST /api/payment/manual
router.post('/manual', async (req, res) => {
  try {
    const { clientId, amount, paymentMethod, description, paidAt } = req.body;

    const payment = new Payment({
      clientId,
      amount,
      paymentMethod,
      description,
      status: 'completed',
      type: 'manual',
      paidAt: new Date(paidAt)
    });

    await payment.save();

    res.status(201).json({ message: 'Manual payment recorded successfully', payment });
  } catch (err) {
    console.error('Manual payment error:', err);
    res.status(500).json({ message: 'Server error while saving manual payment' });
  }
});

// @route   GET /api/payment/client/:clientId/history
router.get('/client/:clientId/history', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const payments = await Payment.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalPayments = await Payment.countDocuments({ clientId });
    const pendingPayments = await Payment.countDocuments({ clientId, status: 'pending' });

    res.json({
      payments,
      pagination: {
        total: totalPayments,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalPayments / parseInt(limit))
      },
      summary: {
        totalPayments,
        pendingPayments,
        completedPayments: totalPayments - pendingPayments
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error while fetching payment history' });
  }
});

// @route   PUT /api/payment/:paymentId/mark-paid
router.put('/:paymentId/mark-paid', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId, notes } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({ message: 'Payment already marked as paid' });
    }

    payment.status = 'completed';
    payment.paidAt = new Date();
    if (transactionId) payment.transactionId = transactionId;
    if (notes) payment.notes = notes;

    await payment.save();

    res.json({
      message: 'Payment marked as paid successfully',
      payment
    });
  } catch (error) {
    console.error('Mark payment as paid error:', error);
    res.status(500).json({ message: 'Server error while marking payment as paid' });
  }
});

// Add a test route to verify the payment router is working
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment routes are working',
    timestamp: new Date().toISOString()
  });
});

// @route   GET /monthly-aggregation
// @desc    Get payment aggregation per month for all clients (including inactive)
// @access  Public
// Full path: /api/payments/monthly-aggregation
router.get('/monthly-aggregation', async (req, res) => {
  try {
    const { year, clientId, caEmail } = req.query;

    // Build match stage
    let matchStage = {};

    // 🔥 CA FILTER (CRITICAL)
    if (caEmail) {
      const clients = await Client.find({ caUserName: caEmail }).select('_id');
      const clientIds = clients.map(c => c._id);
      matchStage.clientId = { $in: clientIds };
    }

    // Filter by specific year if provided
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Filter by specific client if provided
    if (clientId) {
      matchStage.clientId = mongoose.Types.ObjectId(clientId);
    }

    const monthlyAggregation = await Payment.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          earnedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0]
            }
          },
          totalDue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "outstanding"] },
                    { $eq: ["$status", "pending"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0]
            }
          },
          totalAmount: { $sum: "$amount" },
          totalPayments: {
            $sum: {
              $cond: [{ $ne: ["$type", "outstanding"] }, 1, 0]
            }
          },
          completedPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
            }
          },
          outstandingPayments: {
            $sum: {
              $cond: [{ $eq: ["$type", "outstanding"] }, 1, 0]
            }
          },
          manualPayments: {
            $sum: {
              $cond: [{ $eq: ["$type", "manual"] }, 1, 0]
            }
          },
          regularPayments: {
            $sum: {
              $cond: [{ $eq: ["$type", "regular"] }, 1, 0]
            }
          },
          averagePaymentAmount: { $avg: "$amount" },
          maxPaymentAmount: { $max: "$amount" },
          minPaymentAmount: { $min: "$amount" }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          monthName: {
            $arrayElemAt: [
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              "$_id.month"
            ]
          },
          pendingAmount: "$totalDue",
          totalDue: 1,
          totalPaid: 1,
          totalAmount: 1,
          totalPayments: 1,
          completedPayments: 1,
          pendingPayments: 1,
          outstandingPayments: 1,
          manualPayments: 1,
          regularPayments: 1,
          averagePaymentAmount: { $round: ["$averagePaymentAmount", 2] },
          maxPaymentAmount: 1,
          minPaymentAmount: 1,
          completionRate: {
            $cond: [
              { $eq: ["$completedPayments", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$completedPayments", "$totalPayments"] },
                      100
                    ]
                  },
                  2
                ]
              }
            ]
          }
        }
      }
    ]);

    // Get overall summary
    const overallSummary = await Payment.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: null,
          earnedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0]
            }
          },
          totalDue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "outstanding"] },
                    { $eq: ["$status", "pending"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0]
            }
          },
          totalAmount: { $sum: "$amount" },
          totalPayments: {
            $sum: {
              $cond: [{ $ne: ["$type", "outstanding"] }, 1, 0]
            }
          },
          completedPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        monthlyAggregation,
        summary: overallSummary[0] ? {
          ...overallSummary[0],
          pendingAmount: overallSummary[0].totalDue
        } : {
          earnedAmount: 0,
          totalDue: 0,
          totalPaid: 0,
          pendingAmount: 0,
          totalAmount: 0,
          totalPayments: 0,
          completedPayments: 0,
          pendingPayments: 0,
          outstandingPayments: 0,
          manualPayments: 0,
          regularPayments: 0,
          averagePaymentAmount: 0,
          maxPaymentAmount: 0,
          minPaymentAmount: 0,
          completionRate: 0
        }
      }
    });

  } catch (error) {
    console.error('Monthly aggregation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly payment aggregation'
    });
  }
});

// @route   GET /client/:clientId/monthly-payments
// @desc    Get monthly payment history for a specific client (including if inactive)
// @access  Public
// Full path: /api/payments/client/:clientId/monthly-payments
router.get('/client/:clientId/monthly-payments', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year } = req.query;

    // Validate client exists (but don't filter by active status)
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Build match stage
    let matchStage = { clientId: mongoose.Types.ObjectId(clientId) };

    // Filter by specific year if provided
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    const monthlyPayments = await Payment.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          payments: {
            $push: {
              _id: "$_id",
              amount: "$amount",
              status: "$status",
              type: "$type",
              paymentMethod: "$paymentMethod",
              description: "$description",
              dueDate: "$dueDate",
              paidAt: "$paidAt",
              createdAt: "$createdAt",
              transactionId: "$transactionId",
              notes: "$notes"
            }
          },
          totalAmount: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
          completedPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          monthName: {
            $arrayElemAt: [
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              "$_id.month"
            ]
          },
          payments: 1,
          totalAmount: 1,
          totalPayments: 1,
          completedPayments: 1,
          pendingPayments: 1,
          completionRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$completedPayments", "$totalPayments"] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    // Get client info
    const clientInfo = {
      _id: client._id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      businessName: client.businessName,
      isActive: client.isActive
    };

    res.json({
      success: true,
      client: clientInfo,
      data: monthlyPayments
    });

  } catch (error) {
    console.error('Client monthly payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching client monthly payments'
    });
  }
});

module.exports = router;
