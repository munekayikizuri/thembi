const mongoose = require('mongoose');

const SettingModel = mongoose.model('Setting');
const UserSettingsModel = mongoose.model('UserSettings');

const increaseBySettingKey = async ({ settingKey, userId }) => {
  try {
    if (!settingKey || !userId) {
      return null;
    }

    // Attempt to increment the user-specific setting
    const userResult = await UserSettingsModel.findOneAndUpdate(
      { settingKey, user: userId },
      { $inc: { settingValue: 1 } },
      { new: true, runValidators: true } // Return the updated document
    ).exec();

    if (userResult) {
      return userResult; // Return the updated user-specific setting if found and incremented
    }

    // If no user-specific setting exists, attempt to increment the global setting
    const globalResult = await SettingModel.findOneAndUpdate(
      { settingKey, removed: false },
      { $inc: { settingValue: 1 } },
      { new: true, runValidators: true } // Return the updated document
    ).exec();

    if (globalResult) {
      return globalResult; // Return the updated global setting if found and incremented
    }

    // Return null if neither user-specific nor global settings were found
    return null;
  } catch (error) {
    console.error('Error in increaseBySettingKey:', error);
    return null;
  }
};

module.exports = increaseBySettingKey;
