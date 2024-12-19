const mongoose = require('mongoose');
const UserSettingsModel = mongoose.model('UserSettings');

const listAll = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user ID from middleware
    const adminId = req.user.adminId; // Admin ID from the authenticated user's context
    const sort = parseInt(req.query.sort) || 'desc';

    // Fetch user-specific settings tied to both user and admin (from the UserSettings model)
    const userSettings = await UserSettingsModel.find({
      user: userId, // Match settings specific to the authenticated user
    }).sort({ created: sort });

    if (userSettings.length > 0) {
      return res.status(200).json({
        success: true,
        result: userSettings,
        message: 'Successfully retrieved all user settings',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        message: 'No user settings found',
      });
    }
  } catch (error) {
    console.error('Error listing all user settings:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user settings',
    });
  }
};

module.exports = listAll;
