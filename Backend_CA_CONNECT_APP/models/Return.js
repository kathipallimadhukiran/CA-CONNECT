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
      gstr1: {
        status: {
          type: String,
          enum: ['pending', 'filed', 'not_filed'],
          default: 'not_filed',
          required: true
        },
        filedAt: Date,
        filedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        fee: {
          type: Number,
          default: 0
        }
      },
      gstr3b: {
        status: {
          type: String,
          enum: ['pending', 'filed', 'not_filed'],
          default: 'not_filed',
          required: true
        },
        filedAt: Date,
        filedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        fee: {
          type: Number,
          default: 0
        }
      },
      // Legacy status field for backward compatibility
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'filed', 'not_filed'],
        default: 'not_filed'
      }
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
ReturnSchema.statics.findOrCreate = async function (clientId, gstNumber, year, createdBy) {
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
ReturnSchema.methods.updateMonthStatus = async function (month, status, remarks = '', documents = [], updatedBy) {
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
ReturnSchema.methods.getFormattedData = function () {
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
        // Determine the overall status based on GSTR-1 and GSTR-3B
        let overallStatus = 'pending';

        if (data.gstr1 && data.gstr3b) {
          // Both GSTR-1 and GSTR-3B are present (Regular GST)
          const gstr1Status = data.gstr1.status;
          const gstr3bStatus = data.gstr3b.status;

          // For regular GST: BOTH must be filed or not-applicable to be considered complete
          if ((gstr1Status === 'filed' || gstr1Status === 'not-applicable') &&
            (gstr3bStatus === 'filed' || gstr3bStatus === 'not-applicable')) {
            overallStatus = gstr1Status === 'not-applicable' && gstr3bStatus === 'not-applicable' ? 'not-applicable' : 'filed';
          } else {
            overallStatus = 'not_filed';
          }
        } else if (data.gstr1 && !data.gstr3b) {
          // Only GSTR-1 is present (Composition/ISF)
          const gstr1Status = data.gstr1.status;
          if (gstr1Status === 'filed' || gstr1Status === 'not-applicable') {
            overallStatus = gstr1Status;
          } else {
            overallStatus = 'not_filed';
          }
        } else if (!data.gstr1 && data.gstr3b) {
          // Only GSTR-3B is present (edge case)
          const gstr3bStatus = data.gstr3b.status;
          if (gstr3bStatus === 'filed' || gstr3bStatus === 'not-applicable') {
            overallStatus = gstr3bStatus;
          } else {
            overallStatus = 'not_filed';
          }
        } else if (data.status) {
          // Fallback to legacy status if GSTR-1/GSTR-3B are not present
          overallStatus = data.status;
        }

        result.months[month] = {
          month: data.month || monthNum,
          status: overallStatus,
          monthName: data.monthName || new Date(2023, monthNum - 1, 1).toLocaleString('default', { month: 'short' }),
          remarks: data.remarks || '',
          documents: Array.isArray(data.documents) ? data.documents : [],
          updatedAt: data.updatedAt || new Date(),
          updatedBy: data.updatedBy || null,
          // Include detailed GSTR-1 and GSTR-3B status for frontend
          gstr1: data.gstr1 || null,
          gstr3b: data.gstr3b || null
        };
      }
    }
  }

  return result;
};

module.exports = mongoose.model('Return', ReturnSchema);
