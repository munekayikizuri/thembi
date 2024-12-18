const mongoose = require('mongoose');
const UserSettings = mongoose.model('UserSettings');  // Change to UserSettings model

const updateBySettingKey = async ({ settingKey, adminId, updateData }) => {
  try {
    // Ensure that the updateData is valid for the fields you're updating
    const result = await UserSettings.findOneAndUpdate(
      { settingKey, user: adminId },  // Matching by admin ID (user field) and setting key
      updateData,
      { new: true, runValidators: true }  // Return the updated document and validate the update
    ).exec();

    // If no record is found for the adminId and settingKey, return null
    if (!result) {
      console.error(`No setting found for settingKey: ${settingKey} and adminId: ${adminId}`);
      return null;
    }

    // Return the updated result (user's setting)
    return result;
  } catch (error) {
    console.error('Error in updateBySettingKey:', error);
    return null;
  }
};

module.exports = updateBySettingKey;
