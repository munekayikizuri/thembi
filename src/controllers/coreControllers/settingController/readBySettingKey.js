const mongoose = require('mongoose');
const SettingModel = mongoose.model('Setting');
const UserSettingsModel = mongoose.model('UserSettings');

const readBySettingKey = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user's ID
    const settingKey = req.params.settingKey;

    if (!settingKey) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No settingKey provided',
      });
    }

    // Check for user-specific settings first
    const userSetting = await UserSettingsModel.findOne({
      settingKey,
      user: userId, // Ensure the setting belongs to the authenticated user
      removed: false,
    });

    if (userSetting) {
      return res.status(200).json({
        success: true,
        result: userSetting,
        message: `Found user-specific setting for settingKey: ${settingKey}`,
      });
    }

    // If no user-specific setting is found, check for global settings
    const globalSetting = await SettingModel.findOne({
      settingKey,
      removed: false,
    });

    if (globalSetting) {
      return res.status(200).json({
        success: true,
        result: globalSetting,
        message: `Found global setting for settingKey: ${settingKey}`,
      });
    }

    // If neither user-specific nor global setting is found, return a 404
    return res.status(404).json({
      success: false,
      result: null,
      message: `No document found for settingKey: ${settingKey}`,
    });
  } catch (error) {
    console.error('Error reading setting by key:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'An error occurred while fetching the setting',
    });
  }
};

module.exports = readBySettingKey;
