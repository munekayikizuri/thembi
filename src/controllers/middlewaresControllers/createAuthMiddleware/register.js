const Joi = require('joi');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' });

const register = async (req, res, { userModel }) => {
  const UserPasswordModel = mongoose.model(userModel + 'Password');
  const UserModel = mongoose.model(userModel);
  const Setting = mongoose.model('Setting');
  const UserSettings = mongoose.model('UserSettings');
  const Taxes = mongoose.model('Taxes'); // Assuming a Taxes model
  const PaymentMode = mongoose.model('PaymentMode'); // Assuming a PaymentMode model

  const { email, password, name, country } = req.body;

  // Validate input
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().required(),
    name: Joi.string().required(),
    country: Joi.string().required(),
  });

  const { error } = objectSchema.validate({ email, password, name, country });
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

  // Fetch the default settings for this new user
  const defaultSettings = await Setting.find({ removed: false, isPrivate: false });

  const userSettings = defaultSettings
    .filter(setting => setting.settingValue !== null && setting.settingValue !== undefined)
    .map(setting => ({
      user: newUser._id,
      settingKey: setting.settingKey,
      settingValue: setting.settingValue,
      settingCategory: setting.settingCategory,
      valueType: setting.valueType,
      isCoreSetting: setting.isCoreSetting || false,
    }));

  if (userSettings.length > 0) {
    await UserSettings.insertMany(userSettings);
  }

  // Step 4: Create default taxes for the user
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

  // Step 5: Create default payment mode for the user
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
