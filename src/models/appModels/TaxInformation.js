// First, create a TaxInformation model in a separate file
// models/taxInformation.model.js
const mongoose = require('mongoose');

const taxInformationSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.ObjectId, 
    ref: 'Admin',
    required: true
  },
  country: {
    type: String,
    required: true
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
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TaxInformation', taxInformationSchema);