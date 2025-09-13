const mongoose = require('mongoose');

const ReturnSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required'],
    index: true
  },
  gstNumber: {
    type: String,
    trim: true,
    required: [true, 'GST number is required'],
    index: true
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 2000,
    max: 2100,
    index: true
  },
  months: {
    type: Map,
    of: new mongoose.Schema({
      month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
      },
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'filed', 'not_filed'],
        default: 'pending',
        required: true
      }
      // Removed all optional fields to keep the document clean
    }, { _id: false, timestamps: false })
  },
  createdBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster querying
ReturnSchema.index({ client: 1, gstNumber: 1, year: 1 }, { unique: true });

// Add text index for search
ReturnSchema.index(
  { 
    'gstNumber': 'text',
    'months.$*.status': 'text',
    'months.$*.remarks': 'text'
  },
  { 
    weights: {
      'gstNumber': 5,
      'months.$*.status': 2,
      'months.$*.remarks': 1
    }
  }
);

// Static method to get or create return document
ReturnSchema.statics.findOrCreate = async function(clientId, gstNumber, year, createdBy) {
  let returnDoc = await this.findOne({ client: clientId, gstNumber, year });
  if (!returnDoc) {
    returnDoc = new this({
      client: clientId,
      gstNumber,
      year,
      createdBy,
      months: new Map()
    });
    await returnDoc.save();
  }
  return returnDoc;
};

// Method to update month status
ReturnSchema.methods.updateMonthStatus = async function(month, status, remarks = '', documents = [], updatedBy) {
  const monthData = {
    month,
    status,
    remarks,
    documents,
    updatedBy,
    updatedAt: new Date()
  };
  
  this.months.set(month.toString(), monthData);
  this.markModified('months');
  return this.save();
};

// Method to get formatted return data
ReturnSchema.methods.getFormattedData = function() {
  const result = {
    _id: this._id,
    client: this.client,
    gstNumber: this.gstNumber,
    year: this.year,
    months: {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  // Initialize all months with default 'pending' status
  for (let month = 1; month <= 12; month++) {
    result.months[month] = {
      month: month,
      status: 'pending',
      monthName: new Date(2023, month - 1, 1).toLocaleString('default', { month: 'short' })
    };
  }

  // Update with actual data from the database
  if (this.months && this.months instanceof Map) {
    for (const [month, data] of this.months.entries()) {
      if (!data) continue;
      
      const monthNum = parseInt(month, 10);
      if (monthNum >= 1 && monthNum <= 12) {
        result.months[month] = {
          month: data.month || monthNum,
          status: data.status || 'pending',
          monthName: data.monthName || new Date(2023, monthNum - 1, 1).toLocaleString('default', { month: 'short' }),
          remarks: data.remarks || '',
          documents: Array.isArray(data.documents) ? data.documents : [],
          updatedAt: data.updatedAt || new Date(),
          updatedBy: data.updatedBy || null
        };
      }
    }
  }

  return result;
};

module.exports = mongoose.model('Return', ReturnSchema);
