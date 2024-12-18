const mongoose = require('mongoose');

const SettingModel = mongoose.model('Setting');
const UserSettingsModel = mongoose.model('UserSettings');

const listAllSettings = async (userId) => {
  try {
    if (!userId) {
      console.error('No userId provided');
      return [];
    }

    // Fetch user-specific settings
    const userSettings = await UserSettingsModel.find({ user: userId, removed: false });

    // Fetch global settings
    const globalSettings = await SettingModel.find({ removed: false });

    // Convert user-specific settings to a map for quick lookup
    const userSettingsMap = userSettings.reduce((acc, { settingKey, settingValue }) => {
      acc[settingKey] = settingValue;
      return acc;
    }, {});

    // Merge global settings, giving priority to user-specific settings
    const allSettings = globalSettings.map((globalSetting) => {
      const { settingKey, settingValue } = globalSetting;

      return {
        settingKey,
        settingValue: userSettingsMap[settingKey] ?? settingValue, // Use user-specific if available, otherwise global
      };
    });

    return allSettings;
  } catch (error) {
    console.error('Error in listAllSettings:', error);
    return [];
  }
};

module.exports = listAllSettings;
