// businessInfo.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const businessInfoSchema = new Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  businessName: { 
    type: String,
    required: true 
  },
  businessRegistrationNumber: { 
    type: String 
  },
  businessType: { 
    type: String,
    enum: ['individual', 'small_business', 'standard', 'foreign', 'npo'],
    required: true
  },
  industry: { 
    type: String,
    enum: ['retail', 'services', 'manufacturing', 'construction', 'agriculture', 
           'hospitality', 'technology', 'healthcare', 'education', 'other']
  },
  created: {
    type: Date,
    default: Date.now
  },
  removed: {
    type: Boolean,
    default: false
  }
});
// Create indexes for faster queries
businessInfoSchema.index({ admin: 1 });

// Create models
const BusinessInfo = mongoose.model('BusinessInfo', businessInfoSchema);

module.exports = {
  BusinessInfo,
};
