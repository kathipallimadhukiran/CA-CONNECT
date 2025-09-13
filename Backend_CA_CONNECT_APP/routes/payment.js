const express = require('express');
const { body, validationResult } = require('express-validator');
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

    // ✅ Update client outstanding
    await Client.findByIdAndUpdate(task.clientId, {
      $inc: { totalOutstanding: amount }
    });

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

      // ✅ update client totals
      await Client.findByIdAndUpdate(payment.clientId, {
        $inc: { totalPaid: payment.amount, totalOutstanding: -payment.amount },
        $set: { lastPaymentDate: payment.paidAt }
      });
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

    // ✅ adjust client totals
    await Client.findByIdAndUpdate(payment.clientId, {
      $inc: { totalPaid: -amount }
    });

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

module.exports = router;
