const Joi = require('joi');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { globSync } = require('glob');
require('dotenv').config({ path: '.env' });

const register = async (req, res, { userModel }) => {
  const UserPasswordModel = mongoose.model(userModel + 'Password');
  const UserModel = mongoose.model(userModel);
  const UserSettings = mongoose.model('UserSettings');
  const Taxes = mongoose.model('Taxes');
  const PaymentMode = mongoose.model('PaymentMode');

  const { email, password, name, timezone, country, language } = req.body;

  // Validate input
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().required(),
    name: Joi.string().required(),
    country: Joi.string().required(),
    timezone: Joi.string().optional(),
    language: Joi.string().optional(),
  });

  const { error } = objectSchema.validate({ email, password, name, timezone, country, language });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Invalid/Missing credentials.',
      errorMessage: error.message,
    });
  }

  // Check if user already exists
  const existingUser = await UserModel.findOne({ email: email, removed: false });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'An account with this email already exists.',
    });
  }

  // Hash the password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  // Create a new user
  const newUser = new UserModel({
    email,
    name,
    country,
    role: 'owner', // Default role
    enabled: true,
    removed: false,
  });

  await newUser.save();

  // Create and save the password record
  const newUserPassword = new UserPasswordModel({
    user: newUser._id,
    password: hashedPassword,
    salt: salt,
  });

  await newUserPassword.save();

  // Load and configure default settings
  const settingsFiles = globSync('./src/setup/defaultSettings/**/*.json');
  const settingData = [];

  for (const filePath of settingsFiles) {
    const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const settingsToUpdate = {
      idurar_app_email: email,
      idurar_app_company_email: email,
      idurar_app_timezone: timezone,
      idurar_app_country: country,
      idurar_app_language: language || 'en_us',
    };

    const newSettings = file.map((x) => {
      const settingValue = settingsToUpdate[x.settingKey];
      return {
        ...x,
        settingValue: settingValue || x.settingValue,
        user: newUser._id,
      };
    });

    settingData.push(...newSettings);
  }

  // Insert all user settings in one operation
  if (settingData.length > 0) {
    await UserSettings.insertMany(settingData);
  }

  // Create default taxes for the user
  const existingTaxes = await Taxes.find({ createdBy: newUser._id });
  if (existingTaxes.length === 0) {
    await Taxes.insertMany([
      {
        taxName: 'Tax 0%',
        taxValue: '0',
        isDefault: true,
        createdBy: newUser._id,
      },
    ]);
    console.log('👍 Taxes created for the user: Done!');
  } else {
    console.log('⚠️ Taxes already exist for this user.');
  }

  // Create default payment mode for the user
  const existingPaymentModes = await PaymentMode.find({ createdBy: newUser._id });
  if (existingPaymentModes.length === 0) {
    await PaymentMode.insertMany([
      {
        name: 'Default Payment',
        description: 'Default Payment Mode (Cash, Wire Transfer)',
        isDefault: true,
        createdBy: newUser._id,
      },
    ]);
    console.log('👍 Payment modes created for the user: Done!');
  } else {
    console.log('⚠️ Payment modes already exist for this user.');
  }

  // Generate JWT token for the registered user
  const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Respond with success
  return res.status(201).json({
    success: true,
    message: 'User registered successfully, default settings, taxes, and payment modes applied!',
    result: {
      user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        country: newUser.country,
        role: newUser.role,
      },
      token: token,
    },
  });
};

module.exports = register;
