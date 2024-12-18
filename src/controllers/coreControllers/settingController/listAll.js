const mongoose = require('mongoose');
const SettingModel = mongoose.model('Setting');
const UserSettingsModel = mongoose.model('UserSettings');

const listAll = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user ID from middleware
    const sort = parseInt(req.query.sort) || 'desc';

    // Fetch global settings (from the Setting model)
    const globalSettings = await SettingModel.find({
      removed: false,
      isPrivate: false, // Fetch non-private settings only
    }).sort({ created: sort });

    // Fetch user-specific settings (from the UserSettings model)
    const userSettings = await UserSettingsModel.find({
      user: userId, // Match settings specific to the authenticated user
    }).sort({ created: sort });

    // Create a map for user-specific settings to enable overriding global settings
    const userSettingsMap = {};
    userSettings.forEach((setting) => {
      userSettingsMap[setting.settingKey] = setting;
    });

    // Combine global settings and user-specific settings
    const combinedSettings = globalSettings.map((globalSetting) => {
      if (userSettingsMap[globalSetting.settingKey]) {
        // If user-specific setting exists, override global setting
        return {
          ...globalSetting._doc, // Spread global setting data
          ...userSettingsMap[globalSetting.settingKey]._doc, // Override with user-specific data
        };
      }
      return globalSetting._doc; // Use global setting if no user-specific override
    });

    // Include any additional user-specific settings not in global settings
    userSettings.forEach((userSetting) => {
      if (!globalSettings.some((gs) => gs.settingKey === userSetting.settingKey)) {
        combinedSettings.push(userSetting._doc);
      }
    });

    if (combinedSettings.length > 0) {
      return res.status(200).json({
        success: true,
        result: combinedSettings,
        message: 'Successfully retrieved all settings',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        message: 'No settings found',
      });
    }
  } catch (error) {
    console.error('Error listing all settings:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching settings',
    });
  }
};

module.exports = listAll;
