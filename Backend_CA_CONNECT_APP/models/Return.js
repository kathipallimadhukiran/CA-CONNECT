const mongoose = require('mongoose');

const ReturnSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required'],
    index: true
  },
  month: {
    type: String,
    required: [true, 'Month is required'],
    trim: true
  },
  monthNumber: {
    type: Number,
    required: [true, 'Month number is required'],
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 2000,
    max: 2100
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in-progress', 'completed', 'filed'],
      message: 'Status must be one of: pending, in-progress, completed, filed'
    },
    default: 'pending',
    required: true
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  documents: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
    ref: 'User',
    required: [true, 'Updated by user ID is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster querying
ReturnSchema.index({ client: 1, month: 1, year: 1 }, { unique: true });

// Add text index for search
ReturnSchema.index(
  { 
    'client.name': 'text',
    month: 'text',
    status: 'text',
    remarks: 'text'
  },
  { 
    weights: {
      'client.name': 5,
      month: 3,
      status: 2,
      remarks: 1
    }
  }
);

module.exports = mongoose.model('Return', ReturnSchema);
