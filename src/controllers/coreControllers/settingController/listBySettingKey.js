const mongoose = require('mongoose');
const SettingModel = mongoose.model('Setting');
const UserSettingsModel = mongoose.model('UserSettings');

const listBySettingKey = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user ID from middleware
    const settingKeyArray = req.query.settingKeyArray
      ? req.query.settingKeyArray.split(',')
      : [];

    if (settingKeyArray.length === 0) {
      return res.status(202).json({
        success: false,
        result: [],
        message: 'Please provide the settings you need',
      });
    }

    // Query for global settings
    const globalSettings = await SettingModel.find({
      settingKey: { $in: settingKeyArray },
      removed: false,
    });

    // Query for user-specific settings
    const userSettings = await UserSettingsModel.find({
      settingKey: { $in: settingKeyArray },
      user: userId, // Ensure settings belong to the authenticated user
      removed: false,
    });

    // Create a map of user-specific settings for easy lookup
    const userSettingsMap = {};
    userSettings.forEach((setting) => {
      userSettingsMap[setting.settingKey] = setting;
    });

    // Combine global and user-specific settings
    const combinedSettings = globalSettings.map((globalSetting) => {
      if (userSettingsMap[globalSetting.settingKey]) {
        // Override global setting with user-specific setting
        return {
          ...globalSetting._doc, // Spread global setting data
          ...userSettingsMap[globalSetting.settingKey]._doc, // Override with user-specific data
        };
      }
      return globalSetting._doc; // Use global setting if no user-specific override
    });

    // Include any user-specific settings not in global settings
    userSettings.forEach((userSetting) => {
      if (!globalSettings.some((gs) => gs.settingKey === userSetting.settingKey)) {
        combinedSettings.push(userSetting._doc);
      }
    });

    if (combinedSettings.length > 0) {
      return res.status(200).json({
        success: true,
        result: combinedSettings,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(202).json({
        success: false,
        result: [],
        message: 'No document found by this request',
      });
    }
  } catch (error) {
    console.error('Error fetching settings by key:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching settings',
    });
  }
};

module.exports = listBySettingKey;
