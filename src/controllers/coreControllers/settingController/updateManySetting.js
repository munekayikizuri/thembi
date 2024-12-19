const mongoose = require('mongoose');
const UserSettingsModel = mongoose.model('UserSettings');

const updateManySetting = async (req, res) => {
  try {
    const userId = req.user.id; // Get the authenticated user's ID from the auth middleware
    const adminId = req.user.adminId; // Admin ID from the authenticated user's context
    const { settings } = req.body;

    // Validate input
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No settings provided',
      });
    }

    let settingsHasError = false;
    const userUpdates = [];

    for (const setting of settings) {
      if (!setting.hasOwnProperty('settingKey') || !setting.hasOwnProperty('settingValue')) {
        settingsHasError = true;
        break;
      }

      const { settingKey, settingValue } = setting;

      // Add update for user-specific settings tied to both user and admin
      userUpdates.push({
        updateOne: {
          filter: { settingKey, user: userId, adminId }, // Restrict to user-specific settings
          update: { settingValue },
          upsert: true, // Create if not exists
        },
      });
    }

    if (settingsHasError) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Settings provided contain errors',
      });
    }

    if (userUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No valid settings provided for update',
      });
    }

    // Perform bulk updates
    const userResults = await UserSettingsModel.bulkWrite(userUpdates);

    const totalModified = userResults.modifiedCount || 0;

    if (totalModified < 1) {
      return res.status(200).json({
        success: true,
        result: null,
        message: 'Nothing was updated',
      });
    } else {
      return res.status(200).json({
        success: true,
        result: totalModified, // Return the number of documents updated
        message: `Successfully updated ${totalModified} settings`,
      });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'An error occurred while updating settings',
    });
  }
};

module.exports = updateManySetting;
