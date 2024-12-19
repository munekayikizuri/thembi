const mongoose = require('mongoose');
const UserSettingsModel = mongoose.model('UserSettings');

const listBySettingKey = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user ID from middleware
    const adminId = req.user.adminId; // Admin ID from the authenticated user's context
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

    // Query user-specific settings filtered by adminId and userId
    const userSettings = await UserSettingsModel.find({
      settingKey: { $in: settingKeyArray },
      user: userId, // Ensure settings belong to the authenticated user
      removed: false,
    });

    if (userSettings.length > 0) {
      return res.status(200).json({
        success: true,
        result: userSettings,
        message: 'Successfully found all requested settings',
      });
    } else {
      return res.status(202).json({
        success: false,
        result: [],
        message: 'No settings found for the given keys',
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
