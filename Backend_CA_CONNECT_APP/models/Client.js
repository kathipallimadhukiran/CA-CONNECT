const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
  caId: { type: mongoose.Schema.Types.ObjectId, ref: 'CA' },
  email: { type: String, required: true, trim: true, lowercase: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  businessName: { type: String, required: true, trim: true },
  gstNumber: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  whatsappNumber: { type: String, trim: true },
  gstType: {
    type: String,
    enum: ['Regular', 'Composition', 'IFF', 'Other'],
    default: 'Regular'
  },
  // Filing preferences
  filingPreferences: {
    gst: { type: Boolean, default: false },
    itr: { type: Boolean, default: false },
    tds: { type: Boolean, default: false },
    gstFilingDay: { type: Number, min: 1, max: 28, default: 20 },
    gstReturnType: { type: String, enum: ['GSTR-1', 'GSTR-3B', 'GSTR-9'], default: 'GSTR-3B' },
    tdsFilingType: { type: String, enum: ['24Q', '26Q', '27Q', '27EQ'], default: '24Q' }
  },
totalOutstanding: {
    type: Number,
    default: 0
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  lastPaymentDate: {
    type: Date
  }

}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
