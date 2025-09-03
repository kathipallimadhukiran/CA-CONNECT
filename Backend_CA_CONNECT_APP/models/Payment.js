const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'upi', 'card', 'cash', 'bank-transfer'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  dueDate: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  type: {
    type: String,
    enum: ['outstanding', 'manual', 'regular'],
    default: 'outstanding'
  },
  transactionId: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// 🔹 Virtual field to check overdue
paymentSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.dueDate < new Date() && this.status === 'pending';
});

// 🔹 Mark as paid method
paymentSchema.methods.markCompleted = function () {
  this.status = 'completed';
  this.paidAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
