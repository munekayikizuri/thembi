const mongoose = require('mongoose');
const SettingModel = mongoose.model('UserSettings');

const updateBySettingKey = async (req, res) => {
  try {
    const userId = req.user?.id; // Authenticated user's ID
    const { id: settingKey, settingValue, fileUrl } = req.body;
    console.log("The req Body:", req.body);

    if (!settingKey) {
      console.warn('[ERROR] No settingKey provided.');
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No settingKey provided',
      });
    }

    let updatedValue = settingValue;
    console.log("The Updated Value:", updatedValue);

    // Prioritize fileUrl if present (for file uploads)
    if (fileUrl) {
      const isValidUrl = (url) => {
        try {
          new URL(url);
          return true;
        } catch (_) {
          return false;
        }
      };

      if (!isValidUrl(fileUrl)) {
        console.warn('[ERROR] Invalid file URL.');
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Invalid file URL provided',
        });
      }

      updatedValue = fileUrl; // Use the file URL for this setting
    }

    if (!updatedValue) {
      console.warn('[ERROR] No settingValue or fileUrl provided.');
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No settingValue or fileUrl provided',
      });
    }

    // Update the setting in the database for the specific userId (admin)
    const updatedSetting = await SettingModel.findOneAndUpdate(
      { 
        settingKey, 
        user: userId,  // Filter by userId (admin)
      },
      { settingValue: updatedValue },
      { new: true }
    );

    console.log("Updated setting in database:", updatedSetting);  // Check the result after updating

    console.log(`[DEBUG] Successfully updated setting: ${settingKey} with value: ${updatedValue}`);

    return res.status(200).json({
      success: true,
      result: updatedSetting,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    console.error('[ERROR] Error updating setting:', error.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'An error occurred while updating the setting',
    });
  }
};

module.exports = updateBySettingKey;
