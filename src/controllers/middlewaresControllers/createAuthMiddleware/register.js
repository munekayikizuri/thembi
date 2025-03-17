const Joi = require('joi');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { globSync } = require('glob');
require('dotenv').config({ path: '.env' });

const register = async (req, res, { userModel }) => {

    // Add debug logs to see what's coming in
    console.log('Registration request received');
    console.log('Request body:', req.body);
    console.log('Email field:', req.body.email);

  const UserPasswordModel = mongoose.model(userModel + 'Password');
  const UserModel = mongoose.model(userModel);
  const UserSettings = mongoose.model('UserSettings');
  const Taxes = mongoose.model('Taxes');
  const BusinessInfo = mongoose.model('BusinessInfo');
  const PaymentMode = mongoose.model('PaymentMode');

  const { email,
    password,
    name,
    timezone,
    country,
    language,
    businessName,
    businessType,
    businessRegistrationNumber,
    vatRegistered,
    vatNumber,
    taxReferenceNumber,
    industry,
      } = req.body;

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

  const { error } = objectSchema.validate({ email,
    password,
    name,
    timezone,
    country,
    language,
   });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Invalid/Missing credentials.',
      errorMessage: error.message,
    });
  }
  // Additional validation for business info if provided
  if (businessName) {
    const businessSchema = Joi.object({
      businessName: Joi.string().required(),
      businessType: Joi.string().required(),
      businessRegistrationNumber: Joi.string().optional().allow(''),
      industry: Joi.string().optional().allow(''),
    });

    const businessError = businessSchema.validate({ 
      businessName, businessType, businessRegistrationNumber, industry 
    }).error;
    
    if (businessError) {
      return res.status(409).json({
        success: false,
        result: null,
        message: 'Invalid business information.',
        errorMessage: businessError.message,
      });
    }
  }

  // Additional validation for South Africa tax info
  if (country === 'ZA' && vatRegistered) {
    // Validate VAT number format for South Africa
    const vatSchema = Joi.object({
      vatNumber: Joi.string().pattern(/^4\d{9}$/).required().messages({
        'string.pattern.base': 'VAT number should be 10 digits starting with 4',
        'any.required': 'VAT number is required for VAT registered businesses',
      }),
    });

    const vatError = vatSchema.validate({ vatNumber }).error;
    
    if (vatError) {
      return res.status(409).json({
        success: false,
        result: null,
        message: 'Invalid VAT information.',
        errorMessage: vatError.message,
      });
    }
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

  // Start a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

    await newUser.save({ session });

    // Create and save the password record
    const newUserPassword = new UserPasswordModel({
      user: newUser._id,
      password: hashedPassword,
      salt: salt,
    });

    await newUserPassword.save({ session });

    // Create business info if provided
    if (businessName) {
      const newBusinessInfo = new BusinessInfo({
        admin: newUser._id,
        businessName,
        businessType,
        businessRegistrationNumber,
        industry,
      });
      
      await newBusinessInfo.save({ session });
    }

    // Create tax information if South Africa
// Create tax information if South Africa
if (country === 'ZA') {
  const TaxInformation = mongoose.model('TaxInformation');
  const newTaxInfo = new TaxInformation({
    admin: newUser._id,
    country,
    vatRegistered: !!vatRegistered,
    vatNumber: vatRegistered ? vatNumber : undefined,
    taxReferenceNumber,
  });
  
  await newTaxInfo.save({ session });
}

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
    // Add South Africa tax settings if applicable
    if (country === 'ZA') {
      settingData.push({
        user: newUser._id,
        settingCategory: 'taxes',
        settingKey: 'standardVatRate',
        settingValue: 15, // 15% for South Africa
        valueType: 'Number',
        isCoreSetting: true
      });
    }
  // Insert all user settings in one operation
  if (settingData.length > 0) {
    await UserSettings.insertMany(settingData, { session });
  }

// Create default taxes (tax rates) for the user
const existingTaxes = await Taxes.find({ createdBy: newUser._id });
if (existingTaxes.length === 0) {
  const taxesToCreate = [
    {
      taxName: 'Tax 0%',
      taxValue: 0,
      isDefault: true,
      createdBy: newUser._id,
      country: country || 'ZA'
    }
  ];
    
  // Add standard VAT for South African VAT registered businesses
  if (country === 'ZA' && vatRegistered) {
    taxesToCreate.push({
      taxName: 'Tax 15%',
      taxValue: 15,
      isDefault: false,
      createdBy: newUser._id,
      country: 'ZA'
    });
  }
      await Taxes.insertMany(taxesToCreate, { session });

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
    ], { session });
    console.log('👍 Payment modes created for the user: Done!');
  } else {
    console.log('⚠️ Payment modes already exist for this user.');
  }
 // Commit the transaction
  await session.commitTransaction();
  session.endSession();

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
}catch (error) {
  // Abort the transaction on error
  await session.abortTransaction();
  session.endSession();
  
  console.error('Registration error:', error);
  
  return res.status(500).json({
    success: false,
    result: null,
    message: 'Registration failed. Please try again later.',
    errorMessage: error.message,
  });
}
};

module.exports = register;
