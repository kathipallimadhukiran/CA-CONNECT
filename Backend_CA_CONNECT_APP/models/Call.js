const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  caId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CA',
    required: true
  },
  type: {
    type: String,
    enum: ['incoming', 'outgoing', 'missed'],
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'voicemail'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Add index for faster queries
callSchema.index({ clientId: 1, createdAt: -1 });
callSchema.index({ caId: 1, createdAt: -1 });

// Method to calculate call duration
callSchema.methods.endCall = function() {
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime - this.startTime) / 1000); // in seconds
  return this.save();
};

const Call = mongoose.model('Call', callSchema);

module.exports = Call;
