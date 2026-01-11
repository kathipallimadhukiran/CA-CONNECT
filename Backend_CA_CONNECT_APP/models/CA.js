const mongoose = require('mongoose');

const caSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  caNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  specialization: [{
    type: String,
    enum: ['tax', 'audit', 'accounting', 'consulting', 'compliance', 'other']
  }],
  experience: {
    type: Number,
    min: 0,
    default: 0
  },
  qualification: {
    type: String,
    default: 'CA'
  },
  company: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  services: [{
    name: String,
    description: String,
    price: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  availability: {
    monday: { start: String, end: String, available: Boolean },
    tuesday: { start: String, end: String, available: Boolean },
    wednesday: { start: String, end: String, available: Boolean },
    thursday: { start: String, end: String, available: Boolean },
    friday: { start: String, end: String, available: Boolean },
    saturday: { start: String, end: String, available: Boolean },
    sunday: { start: String, end: String, available: Boolean }
  },
  bio: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for search functionality
caSchema.index({
  specialization: 1,
  experience: 1,
  rating: 1,
  'address.city': 1,
  'address.state': 1
});

module.exports = mongoose.model('CA', caSchema); 