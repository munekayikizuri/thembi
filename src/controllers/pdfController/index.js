const pug = require('pug');
const fs = require('fs');
const moment = require('moment');
let pdf = require('html-pdf');
const { getData } = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney } = require('@/settings');
const { settings_list } = require('@/locale/translation/en_us');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// Function to load admin-specific settings
const loadAdminSettings = async (adminId) => {
  const UserSettings = require('@/models/coreModels/UserSettings');
  const settingsArray = await UserSettings.find({ user: adminId, enabled: true }).exec();

  if (!settingsArray || settingsArray.length === 0) {
    throw new Error('Admin settings not found or empty');
  }

  // Transform settings array into a key-value object
  const settings = settingsArray.reduce((acc, item) => {
    acc[item.settingKey] = item.settingValue;
    return acc;
  }, {});

  console.log("Transformed Settings:", settings);
  return settings;
};


exports.generatePdf = async (modelName, info, result, callback, adminId) => {
  try {
    const { targetLocation } = info;

    // Delete existing PDF if it exists
    if (fs.existsSync(targetLocation)) {
      fs.unlinkSync(targetLocation);
    }

    // Fetch and simplify admin-specific settings
    const settings = await loadAdminSettings(adminId);

    // Use settings directly
    const selectedLang = settings['idurar_app_language'];
    const translate = useLanguage({ selectedLang });

    const {
      currency_symbol,
      currency_position,
      decimal_sep,
      thousand_sep,
      cent_precision,
      zero_format,
    } = {
      currency_symbol: settings['currency_symbol'],
      currency_position: settings['currency_position'],
      decimal_sep: settings['decimal_sep'],
      thousand_sep: settings['thousand_sep'],
      cent_precision: settings['cent_precision'],
      zero_format: settings['zero_format'],
    };

    // Pass settings to the useMoney function
    const { moneyFormatter, amountFormatter } = useMoney({
      settings: {
        currency_symbol,
        currency_position,
        decimal_sep,
        thousand_sep,
        cent_precision,
        zero_format,
      },
    });

    settings.public_server_file = process.env.PUBLIC_SERVER_FILE;

    // Generate HTML content using pug
    const htmlContent = pug.renderFile('src/pdf/' + modelName + '.pug', {
      model: result,
      settings,
      translate,
      amountFormatter,
      moneyFormatter,
      moment: moment,
      dateFormat: settings.idurar_app_date_format, // Pass the dateFormat here
    });

    // Create PDF from the rendered HTML
    pdf
      .create(htmlContent, {
        format: info.format,
        orientation: 'portrait',
        border: '10mm',
      })
      .toFile(targetLocation, function (error) {
        if (error) throw new Error(error);
        if (callback) callback();
      });
  } catch (error) {
    throw new Error(error);
  }
};
