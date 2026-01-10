const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  businessName: { type: String, required: true },
  gstNumber: { type: String },
  caUserName: { type: String },
  panNumber: { type: String },
  whatsappNumber: { type: String },

  gstType: {
    type: String,
    enum: ['Regular', 'Composition', 'IFF', 'Other'],
    default: 'Regular'
  },

  frequency: {
    type: String,
    enum: ['1', '3'],
    default: '1'
  },

  totalOutstanding: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  defaultFee: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }

}, { timestamps: true });

// 🔐 DATABASE INDEXES FOR DUPLICATE PREVENTION
clientSchema.index({ businessName: 1, caUserName: 1 }, { unique: true });
clientSchema.index({ email: 1, caUserName: 1 }, { unique: true });
clientSchema.index({ phone: 1, caUserName: 1 }, { unique: true });
clientSchema.index({ whatsappNumber: 1, caUserName: 1 }, { unique: true });
clientSchema.index({ gstNumber: 1, caUserName: 1 }, { unique: true, sparse: true });
clientSchema.index({ panNumber: 1, caUserName: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Client', clientSchema);
