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
  const { page = 1, limit = 50, search = '', caUserName } = req.query;

  try {
    let matchQuery = {};

    if (caUserName) {
      matchQuery.caUserName = caUserName;
    }

    if (search) {
      matchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "clientId",
          as: "payments"
        }
      },
      {
        $addFields: {
          totalAdded: {
            $sum: {
              $map: {
                input: "$payments",
                as: "p",
                in: {
                  $cond: [
                    { $eq: ["$$p.type", "outstanding"] },
                    "$$p.amount",
                    0
                  ]
                }
              }
            }
          },
          totalPaidOutstanding: {
            $sum: {
              $map: {
                input: "$payments",
                as: "p",
                in: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$$p.type", "outstanding"] },
                        { $eq: ["$$p.status", "completed"] }
                      ]
                    },
                    "$$p.amount",
                    0
                  ]
                }
              }
            }
          },
          manualPaid: {
            $sum: {
              $map: {
                input: "$payments",
                as: "p",
                in: {
                  $cond: [
                    { $eq: ["$$p.type", "manual"] },
                    "$$p.amount",
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          totalOutstanding: {
            $subtract: [
              "$totalAdded",
              { $add: ["$totalPaidOutstanding", "$manualPaid"] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          phoneNumber: "$phone",
          address: "$businessName",
          caUserName: 1,
          gstType: 1,
          gstNumber: 1,
          panNumber: 1,
          totalOutstanding: 1
        }
      },
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) }
    ]);
    res.json({ clients });
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

    // If defaultFee is provided, ensure it's a number
    if (defaultFee !== undefined) {
      updateData.defaultFee = Number(defaultFee) || 0;
    }

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    res.json({
      message: 'Client updated successfully.',
      client: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error while updating client.' });
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
      businessName: client.businessName,
      address: client.businessName, // Keeping this for backward compatibility
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
