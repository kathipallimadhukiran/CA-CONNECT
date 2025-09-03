const mongoose = require('mongoose');

const filingSchema = new mongoose.Schema({
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['GST', 'ITR', 'TDS', 'TDS-24Q', 'TDS-26Q', 'GSTR-1', 'GSTR-3B', 'GSTR-9'], 
    required: true 
  },
  month: { 
    type: String, 
    required: true,
    match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Please enter a valid month in YYYY-MM format']
  },
  status: { 
    type: String, 
    enum: ['pending', 'filed', 'not-applicable'], 
    default: 'pending' 
  },
  fee: { 
    type: Number, 
    default: 0,
    min: 0
  },
  filedAt: { 
    type: Date 
  },
  filedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add index for faster queries
filingSchema.index({ clientId: 1, type: 1, month: 1 }, { unique: true });

// Pre-save hook to handle status changes
filingSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'filed' && !this.filedAt) {
    this.filedAt = new Date();
  }
  next();
});

// Static method to get filings for a client
filingSchema.statics.getClientFilings = async function(clientId) {
  return this.find({ clientId })
    .sort({ month: -1, type: 1 })
    .populate('filedBy', 'name email');
};

// Static method to mark a filing as filed
filingSchema.statics.markAsFiled = async function(filingId, userId, notes = '') {
  const filing = await this.findById(filingId);
  if (!filing) {
    throw new Error('Filing not found');
  }
  
  filing.status = 'filed';
  filing.filedBy = userId;
  filing.notes = notes;
  
  return filing.save();
};

// Method to generate description for payment
filingSchema.methods.getPaymentDescription = function() {
  return `${this.type} filing for ${this.month}`;
};

const Filing = mongoose.model('Filing', filingSchema);

module.exports = Filing;
