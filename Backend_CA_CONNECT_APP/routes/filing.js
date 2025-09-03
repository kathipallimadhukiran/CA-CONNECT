const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Filing = require('../models/Filing');
const Payment = require('../models/Payment');
const Client = require('../models/Client');

// @route   GET /api/filings/client/:clientId
// @desc    Get all filings for a client
// @access  Public (auth removed)
router.get('/client/:clientId', async (req, res) => {
  try {
    const filings = await Filing.find({ clientId: req.params.clientId })
      .sort({ month: -1, type: 1 })
      .populate('filedBy', 'name email');
    
    return res.json(filings);
  } catch (err) {
    console.error('Error in GET /api/filings/client/:clientId:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/filings
// @desc    Create or update a filing
// @access  Public (auth & validation removed)
router.post('/', async (req, res) => {
  const { clientId, type, month, fee, status, notes } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let filing = await Filing.findOne({ clientId, type, month });

    if (filing) {
      // Update existing filing
      const updateFields = {};
      if (fee !== undefined) updateFields.fee = fee;
      if (status) updateFields.status = status;
      if (notes !== undefined) updateFields.notes = notes;
      
      filing = await Filing.findByIdAndUpdate(
        filing._id,
        { $set: updateFields },
        { new: true, session }
      );
      
      await session.commitTransaction();
      session.endSession();
      
      return res.json(filing);
    } else {
      // Create new filing
      filing = new Filing({
        clientId,
        type,
        month,
        fee: fee || 0,
        status: status || 'pending',
        notes
      });
      
      await filing.save({ session });
      
      // Create a payment record for the filing
      const payment = new Payment({
        clientId: new mongoose.Types.ObjectId(clientId),
        amount: filing.fee,
        status: 'pending',
        paymentMethod: 'bank-transfer',
        description: `Filing for ${filing.type} (${filing.month})`,
        dueDate: new Date(),
        type: 'outstanding',
        notes: 'Automatically generated from filing creation'
      });
      
      await payment.save({ session });
      
      // Update client's outstanding balance
      await Client.findByIdAndUpdate(
        clientId,
        { 
          $inc: { totalOutstanding: filing.fee },
          $set: { lastPaymentDate: new Date() }
        },
        { session }
      );
      
      // Add payment reference to filing
      filing.paymentId = payment._id;
      await filing.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.status(201).json({
        ...filing.toObject(),
        paymentId: payment._id
      });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in filing creation:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   PUT /api/filings/:filingId/filed
// @desc    Mark a filing as filed and create payment if needed
// @access  Public
router.put('/:filingId/filed', async (req, res) => {
  try {
    const filing = await Filing.findById(req.params.filingId);
    if (!filing) {
      return res.status(404).json({ msg: 'Filing not found' });
    }

    if (filing.status !== 'filed') {
      filing.status = 'filed';
      filing.filedAt = new Date();
      
      if (req.body.notes) {
        filing.notes = req.body.notes;
      }

      await filing.save();

      // Create payment record if fee > 0
      if (filing.fee > 0) {
        const payment = new Payment({
          clientId: filing.clientId,
          amount: filing.fee,
          type: 'debit',
          description: `${filing.type} filing for ${filing.month}`,
          paymentDate: new Date(),
          paymentMethod: 'filing',
          status: 'completed',
          reference: `FILING-${filing._id}`
        });
        
        await payment.save();
      }
    }

    res.json(filing);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/filings/:id
// @desc    Delete a filing
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const filing = await Filing.findById(req.params.id);
    if (!filing) {
      return res.status(404).json({ msg: 'Filing not found' });
    }

    if (filing.status === 'filed') {
      return res.status(400).json({ msg: 'Cannot delete a filed document' });
    }

    await filing.remove();
    res.json({ msg: 'Filing removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
