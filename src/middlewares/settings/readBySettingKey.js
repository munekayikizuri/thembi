const mongoose = require('mongoose');
const SettingModel = mongoose.model('Setting');
const UserSettingsModel = mongoose.model('UserSettings');

const readBySettingKey = async ({ settingKey, userId }) => {
  try {
    // Check for user-specific settings first
    let setting = null;

    if (userId) {
      setting = await UserSettingsModel.findOne({ settingKey, user: userId, removed: false });
    }

    // If no user-specific setting found, fall back to global settings
    if (!setting) {
      setting = await SettingModel.findOne({ settingKey, removed: false });
    }

    return setting;
  } catch (error) {
    console.error('Error in readBySettingKey:', error);
    return null;
  }
};

module.exports = readBySettingKey;
