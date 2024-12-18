const listAllSettings = require('./listAllSettings');

const loadSettings = async (userId) => {
  const allSettings = {};

  // Retrieve both global and user-specific settings
  const datas = await listAllSettings(userId);

  // Merge settings, prioritizing user-specific settings
  datas.forEach(({ settingKey, settingValue }) => {
    allSettings[settingKey] = settingValue;
  });

  return allSettings;
};

module.exports = loadSettings;
