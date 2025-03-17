const pug = require('pug');
const fs = require('fs');
const moment = require('moment');
let pdf = require('html-pdf');
const { getData } = require('@/middlewares/serverData');
const PdfStorage = require('@/models/appModels/PdfStorage');
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

  return settings;
};


exports.generatePdf = async (modelName, info, result, callback, adminId) => {
  try {
    const settings = await loadAdminSettings(adminId);
    const selectedLang = settings['idurar_app_language'];
    const translate = useLanguage({ selectedLang });
    console.log('PDF Generation for:', modelName);  // Should show 'quote' or 'invoice'
    console.log('PDF Generation:', {
      modelName,
      hasLogo: !!settings.company_logo,
      logoPath: settings.company_logo,
      publicPath: process.env.PUBLIC_SERVER_FILE
    });
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

    const htmlContent = pug.renderFile('src/pdf/' + modelName + '.pug', {
      model: result,
      settings,
      translate,
      amountFormatter,
      moneyFormatter,
      moment: moment,
      dateFormat: settings.idurar_app_date_format,
    });

    return new Promise((resolve, reject) => {
      pdf.create(htmlContent, {
        format: info.format,
        orientation: 'portrait',
        border: '10mm',
      }).toBuffer(async (err, buffer) => {
        if (err) reject(err);

        try {
          const filename = `${modelName.toLowerCase()}-${result._id}.pdf`;
          const pdfDoc = new PdfStorage({
            modelName,
            documentId: result._id,
            pdfData: buffer,
            filename,
            createdBy: adminId
          });

          await pdfDoc.save();
          if (callback) callback();
          resolve(pdfDoc);
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    throw new Error(error);
  }
};
