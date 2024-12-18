require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { globSync } = require('glob');
const fs = require('fs');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE);

async function setupApp() {
  try {
    const Admin = require('../models/coreModels/Admin');
    const AdminPassword = require('../models/coreModels/AdminPassword');
    const Setting = require('../models/coreModels/Setting');
    const PaymentMode = require('../models/appModels/PaymentMode');
    const Taxes = require('../models/appModels/Taxes');

    // Step 1: Create default admin
    const demoAdmin = {
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@demo.com',
      name: 'IDURAR',
      surname: 'Admin',
      enabled: true,
      role: 'owner',
    };

    // Generate password hash using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', saltRounds);

    const adminResult = await new Admin(demoAdmin).save();
    const adminId = adminResult._id;

    // Step 2: Create AdminPassword with the generated hash and salt
    const adminPasswordData = {
      password: passwordHash,
      emailVerified: true,
      salt: bcrypt.genSaltSync(saltRounds),  // Generate salt using bcrypt
      user: adminId,
    };

    await new AdminPassword(adminPasswordData).save();
    console.log('👍 Admin created : Done!');

    // Step 3: Import default settings and associate with admin
    const settingFiles = [];
    const settingsFiles = globSync('./src/setup/defaultSettings/**/*.json');

    for (const filePath of settingsFiles) {
      const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      file.forEach((setting) => {
        setting.adminId = adminId; // Associate setting with admin
      });
      settingFiles.push(...file);
    }

    const existingSettings = await Setting.find({ adminId });
    const existingSettingKeys = existingSettings.map((s) => s.settingKey);

    const uniqueSettings = settingFiles.filter((setting) => 
      !existingSettingKeys.includes(setting.settingKey)
    );

    if (uniqueSettings.length > 0) {
      await Setting.insertMany(uniqueSettings);
      console.log('👍 Settings created : Done!');
    } else {
      console.log('⚠️ No new settings to insert.');
    }

    // Step 4: Create default taxes and set createdBy field
    const existingTaxes = await Taxes.find();
    if (existingTaxes.length === 0) {
      await Taxes.insertMany([
        {
          taxName: 'Tax 0%',
          taxValue: '0',
          isDefault: true,
          createdBy: adminId, // Set createdBy to the admin's ID
        },
      ]);
      console.log('👍 Taxes created : Done!');
    } else {
      console.log('⚠️ Taxes already exist.');
    }

    // Step 5: Create default payment mode and set createdBy field
    const existingPaymentModes = await PaymentMode.find();
    if (existingPaymentModes.length === 0) {
      await PaymentMode.insertMany([
        {
          name: 'Default Payment',
          description: 'Default Payment Mode (Cash, Wire Transfer)',
          isDefault: true,
          createdBy: adminId, // Set createdBy to the admin's ID
        },
      ]);
      console.log('👍 PaymentMode created : Done!');
    } else {
      console.log('⚠️ Payment Modes already exist.');
    }

    console.log('🥳 Setup completed : Success!');
    process.exit();
  } catch (e) {
    console.log('\n🚫 Error! The Error info is below');
    console.log(e);
    process.exit(1);
  }
}

setupApp();
