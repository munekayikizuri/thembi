const mongoose = require('mongoose');

const SettingModel = mongoose.model('Setting');
const UserSettingsModel = mongoose.model('UserSettings');

const listBySettingKey = async ({ settingKeyArray = [], userId }) => {
  try {
    if (!userId) {
      throw new Error('User ID is required.');
    }

    if (settingKeyArray.length === 0) {
      return [];
    }

    // Build queries for user-specific and global settings
    const userSettingsQuery = {
      user: userId,
      removed: false,
      $or: settingKeyArray.map((settingKey) => ({ settingKey })),
    };

    const globalSettingsQuery = {
      removed: false,
      $or: settingKeyArray.map((settingKey) => ({ settingKey })),
    };

    // Fetch user-specific and global settings
    const [userSettings, globalSettings] = await Promise.all([
      UserSettingsModel.find(userSettingsQuery),
      SettingModel.find(globalSettingsQuery),
    ]);

    // Combine and return results
    const allSettings = [...userSettings, ...globalSettings];

    return allSettings;
  } catch (error) {
    console.error('Error in listBySettingKey:', error);
    return [];
  }
};

module.exports = listBySettingKey;
