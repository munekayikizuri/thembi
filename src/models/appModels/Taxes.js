const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', autopopulate: true, required: true },

  taxName: {
    type: String,
    required: true,
  },
  taxValue: {
    type: Number,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  country: {
    type: String,
    required: false, //In production it must be changed to true
  },
  vatRegistered: {
    type: Boolean,
    default: false
  },
  vatNumber: {
    type: String
  },
  taxReferenceNumber: {
    type: String
  },
  beeStatus: {
    type: String,
    enum: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 
           'Level 6', 'Level 7', 'Level 8', 'Non-Compliant', 'Exempt', '']
  },
  updated: {
    type: Date,
    default: Date.now
  },
  removed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Taxes', schema);
