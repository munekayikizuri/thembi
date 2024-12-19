const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',  // Reference to the user model
    required: true,
  },
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed, // The value can be of any type
  },
  settingCategory: {
    type: String,
    required: true,
    lowercase: true,
  },
  settingKey: {
    type: String,
    lowercase: true,
    required: true,
  },
  valueType: {
    type: String,
    default: 'String',
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  isCoreSetting: {
    type: Boolean,
    default: false,
  },
  logo: {
    type: String,  // Store the logo file path here
    default: '',
  },
});

const UserSettings = mongoose.model('UserSettings', UserSettingsSchema);
module.exports = UserSettings;
