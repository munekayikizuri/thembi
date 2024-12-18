const setup = async (req, res) => {
  try {
    // Check if the user is an admin (ensure you have some form of authentication here)
    if (!req.admin || req.admin.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Admin access required.',
      });
    }

    // Models
    const Admin = mongoose.model('Admin');
    const AdminPassword = mongoose.model('AdminPassword');
    const Setting = mongoose.model('Setting');
    const PaymentMode = mongoose.model('PaymentMode');
    const Taxes = mongoose.model('Taxes');

    // Extract the request body
    const { name, email, password, language, timezone, country, config = {} } = req.body;

    // Validate input
    const objectSchema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email({ tlds: { allow: true } }).required(),
      password: Joi.string().required(),
    });

    const { error, value } = objectSchema.validate({ name, email, password });
    if (error) {
      return res.status(409).json({
        success: false,
        result: null,
        error: error,
        message: 'Invalid/Missing credentials.',
        errorMessage: error.message,
      });
    }

    // Generate password hash
    const salt = uniqueId();
    const passwordHash = new AdminPassword().generateHash(salt, password);

    // Admin account data
    const accountOwner = {
      email,
      name,
      role: 'owner', // Default owner role
    };

    // Save new admin to the Admin model
    const result = await new Admin(accountOwner).save();

    // Save password data for the new admin
    const AdminPasswordData = {
      password: passwordHash,
      emailVerified: true,
      salt: salt,
      user: result._id,
    };
    await new AdminPassword(AdminPasswordData).save();

    // Load and configure default settings
    const settingData = [];
    const settingsFiles = globSync('./src/setup/defaultSettings/**/*.json');
    
    // Update settings with provided values, associating them with the adminId
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
        return settingValue ? { ...x, settingValue, adminId: result._id } : { ...x, adminId: result._id };
      });

      settingData.push(...newSettings);
    }

    // Insert settings into the database
    await Setting.insertMany(settingData);

    // Insert default taxes and payment modes
    await Taxes.insertMany([{ taxName: 'Tax 0%', taxValue: '0', isDefault: true }]);
    await PaymentMode.insertMany([{
      name: 'Default Payment',
      description: 'Default Payment Mode (Cash , Wire Transfer)',
      isDefault: true,
    }]);

    return res.status(200).json({
      success: true,
      result: {},
      message: 'Successfully completed IDURAR App Setup for admin',
    });
  } catch (error) {
    console.error('Error during setup:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
    });
  }
};
