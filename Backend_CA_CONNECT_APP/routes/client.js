// routes/client.js
const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Task = require('../models/Task');

// @route   POST /api/clients/add
// @desc    Add a new client (no auth required)
// @access  Public
router.post('/add', async (req, res) => {
  const { email, firstName, lastName, phone, businessName, gstNumber, panNumber, whatsappNumber, gstType } = req.body;

  if (!email || !firstName || !lastName || !phone || !businessName) {
    return res.status(400).json({ message: 'Please provide email, name, phone, and business name.' });
  }

  try {
    const newClient = new Client({
      email,
      firstName,
      lastName,
      phone,
      businessName,
      gstNumber,
      panNumber,
      whatsappNumber,
      gstType
    });

    const savedClient = await newClient.save();

    res.status(201).json({
      message: 'Client added successfully.',
      client: savedClient
    });
  } catch (error) {
    console.error('Error adding client:', error);
    res.status(500).json({ message: 'Server error while adding client.' });
  }
});


// @route   GET /api/clients
// @desc    Get all clients (no auth required)
// @access  Public
router.get('/', async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;

  try {
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Map to frontend format
    const clientsList = clients.map(c => ({
      _id: c._id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phoneNumber: c.phone,
      address: c.businessName,
      gstType: c.gstType,
      gstNumber: c.gstNumber,
      panNumber: c.panNumber,
      pendingFiles: 0,
      totalOutstanding: 0
    }));

    res.json({ clients: clientsList });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error while fetching clients.' });
  }
});


// @route   GET /api/clients/:id
// @desc    Get a single client by ID (no auth required)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    // Aggregate payments - separate added amounts from recorded payments
    const paymentSummary = await Payment.aggregate([
      { $match: { clientId: client._id } },
      {
        $group: {
          _id: "$clientId",
          totalAdded: { $sum: { $cond: [{ $eq: ["$type", "outstanding"] }, "$amount", 0] } },
          totalPaid: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $eq: ["$type", "outstanding"] }] }, "$amount", 0] } },
          manualPayments: { $sum: { $cond: [{ $eq: ["$type", "manual"] }, "$amount", 0] } },
        }
      }
    ]);

    const lastPayment = await Payment.findOne({ clientId: client._id, status: 'completed' })
      .sort({ paidAt: -1 });

    // Aggregate files from tasks
    const fileAggregation = await Task.aggregate([
      { $match: { clientId: client._id } },
      { $project: { fileCount: { $size: "$files" } } },
      { $group: { _id: null, totalFiles: { $sum: "$fileCount" } } }
    ]);
    const fileCount = fileAggregation.length > 0 ? fileAggregation[0].totalFiles : 0;

    const summary = paymentSummary[0] || {};
    const totalAdded = summary.totalAdded || 0;
    const totalPaidFromBalance = summary.totalPaid || 0;
    const manualPayments = summary.manualPayments || 0;
    const totalPaidOverall = totalPaidFromBalance + manualPayments;
    const balance = totalAdded - totalPaidOverall;

    const clientDetails = {
      id: client._id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phoneNumber: client.phone,
      address: client.businessName,
      gstType: client.gstType,
      gstNumber: client.gstNumber,
      panNumber: client.panNumber,
      totalAdded: totalAdded,
      totalPaid: totalPaidOverall,
      totalOutstanding: balance,
      lastPaymentDate: lastPayment?.paidAt || null,
      fileCount
    };

    res.json(clientDetails);
  } catch (error) {
    console.error('Error fetching client details:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Client not found.' });
    }
    res.status(500).json({ message: 'Server error while fetching client details.' });
  }
});

module.exports = router;
