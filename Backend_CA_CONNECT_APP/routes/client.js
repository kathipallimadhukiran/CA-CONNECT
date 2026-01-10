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
  const {
    email,
    firstName,
    lastName,
    phone,
    businessName,
    caUserName,
    gstNumber,
    panNumber,
    whatsappNumber,
    gstType,
    frequency,
    defaultFee
  } = req.body;

  console.log("Received client data:", req.body);
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
      caUserName,
      panNumber,
      whatsappNumber,
      gstType,
      frequency: gstType === 'IFF' ? frequency : '1',
      defaultFee: Number(defaultFee) || 0
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
// @route   PUT /api/clients/:id/update-balance
// @desc    Update client's balance
// @access  Public
router.put('/:id/update-balance', async (req, res) => {
  try {
    const { totalOutstanding } = req.body;

    if (typeof totalOutstanding !== 'number') {
      return res.status(400).json({ success: false, message: 'Total outstanding must be a number' });
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { totalOutstanding },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.json({
      success: true,
      message: 'Client total outstanding updated successfully',
      data: { totalOutstanding: client.totalOutstanding }
    });
  } catch (error) {
    console.error('Error updating client balance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating client balance',
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  const { page = 1, limit = 50, search = '', caUserName, isActive } = req.query;

  try {
    let matchQuery = {};

    if (caUserName) {
      matchQuery.caUserName = caUserName;
    }

    // Add isActive filter if specified
    if (isActive !== undefined) {
      matchQuery.isActive = isActive === 'true';
    }

    if (search) {
      matchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const getPaymentSummary = require('../utils/paymentSummary');

    // Get clients without payment aggregation first
    const clients = await Client.find(matchQuery)
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Get payment summary for each client
    const finalClients = await Promise.all(
      clients.map(async (c) => {
        const summary = await getPaymentSummary(c._id);
        return {
          _id: c._id,
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
          phoneNumber: c.phone,
          address: c.businessName,
          caUserName: c.caUserName,
          gstType: c.gstType,
          gstNumber: c.gstNumber,
          panNumber: c.panNumber,
          isActive: c.isActive,
          totalAdded: summary.totalAdded,
          totalPaid: summary.totalPaid,
          totalOutstanding: summary.totalOutstanding
        };
      })
    );

    res.json({ clients: finalClients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Server error while fetching clients." });
  }
});


// @route   GET /api/clients/active
// @desc    Get all active clients
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const { search } = req.query;
    const query = { isActive: true };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { businessName: searchRegex },
        { email: searchRegex },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query).sort({ businessName: 1 });
    res.json({ success: true, data: clients });
  } catch (error) {
    console.error('Error fetching active clients:', error);
    res.status(500).json({ success: false, message: 'Error fetching active clients' });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update a client's information
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const { defaultFee, ...updateData } = req.body;

    // Backend enforcement: Block deactivation if client has outstanding amounts
    if (updateData.isActive === false) {
      console.log('Attempting to deactivate client:', req.params.id);

      const client = await Client.findById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: 'Client not found.' });
      }

      // Get current payment summary to check outstanding balance
      const getPaymentSummary = require('../utils/paymentSummary');
      const summary = await getPaymentSummary(client._id);

      console.log('Payment summary for client:', summary);

      if (summary.totalOutstanding > 0) {
        console.log('Blocking deactivation due to outstanding balance:', summary.totalOutstanding);
        return res.status(400).json({
          message: `Cannot deactivate client. Outstanding balance of ₹${summary.totalOutstanding} must be cleared first.`
        });
      } else {
        console.log('No outstanding balance, allowing deactivation');
      }
    }

    // If defaultFee is provided, ensure it's a number
    if (updateData.defaultFee !== undefined) {
      updateData.defaultFee = Number(updateData.defaultFee) || 0;
    }

    console.log('Update data being sent to database:', updateData);

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    console.log('Updated client result:', updatedClient);

    res.json({
      message: 'Client updated successfully.',
      client: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error while updating client.' });
  }
});

// @route   GET /api/clients/check-duplicate
// @desc    Check if a client field value already exists
// @access  Public
router.get('/check-duplicate', async (req, res) => {
  try {
    const { field, value, caUserName } = req.query;

    if (!field || !value || !caUserName) {
      return res.status(400).json({ exists: false });
    }

    let query = { caUserName };

    // Normalize value
    const normalized = value.trim();

    switch (field) {
      case 'businessName':
      case 'email':
      case 'firstName':
      case 'lastName':
        query[field] = { $regex: `^${normalized}$`, $options: 'i' };
        break;

      case 'phone':
      case 'whatsappNumber':
        query.$or = [
          { phone: normalized },
          { whatsappNumber: normalized }
        ];
        break;

      case 'gstNumber':
      case 'panNumber':
        query[field] = normalized.toUpperCase();
        break;

      case 'fullName': {
        const [firstName, lastName] = normalized.split(' ');
        if (firstName && lastName) {
          query.firstName = { $regex: `^${firstName}$`, $options: 'i' };
          query.lastName = { $regex: `^${lastName}$`, $options: 'i' };
        } else {
          query.firstName = { $regex: `^${normalized}$`, $options: 'i' };
        }
        break;
      }

      default:
        return res.json({ exists: false });
    }

    const exists = await Client.exists(query);

    console.log(`Duplicate check - Field: ${field}, Value: ${value}, Query:`, query, 'Exists:', !!exists);

    return res.json({ exists: !!exists });

  } catch (error) {
    console.error('Duplicate check error:', error);
    return res.status(500).json({ exists: false });
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

    const getPaymentSummary = require('../utils/paymentSummary');

    const summary = await getPaymentSummary(client._id);

    const lastPayment = await Payment.findOne({ clientId: client._id, status: 'completed' })
      .sort({ paidAt: -1 });

    // Aggregate files from tasks
    const fileAggregation = await Task.aggregate([
      { $match: { clientId: client._id } },
      { $project: { fileCount: { $size: "$files" } } },
      { $group: { _id: null, totalFiles: { $sum: "$fileCount" } } }
    ]);
    const fileCount = fileAggregation.length > 0 ? fileAggregation[0].totalFiles : 0;

    const clientDetails = {
      id: client._id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phoneNumber: client.phone,
      businessName: client.businessName,
      address: client.businessName, // Keeping this for backward compatibility
      gstType: client.gstType,
      gstNumber: client.gstNumber,
      panNumber: client.panNumber,
      isActive: client.isActive,
      totalAdded: summary.totalAdded,
      totalPaid: summary.totalPaid,
      totalOutstanding: summary.totalOutstanding,
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
