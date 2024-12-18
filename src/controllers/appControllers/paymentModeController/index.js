const mongoose = require('mongoose');
const Model = mongoose.model('PaymentMode');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('PaymentMode');
const paginatedList = require('./paginatedList'); // Import the paginatedList function
delete methods['delete'];

methods.create = async (req, res) => {
  try {
    const { isDefault } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.id); // Ensure admin-specific filtering

    // If `isDefault` is true, update all other payment modes for the admin
    if (isDefault) {
      await Model.updateMany({ createdBy: userId }, { isDefault: false });
    }

    const countDefault = await Model.countDocuments({
      createdBy: userId,
      isDefault: true,
    });

    const result = await new Model({
      ...req.body,
      createdBy: userId, // Ensure the payment mode is associated with the current admin
      isDefault: countDefault < 1 ? true : false,
    }).save();

    return res.status(200).json({
      success: true,
      result: result,
      message: 'Payment mode created successfully',
    });
  } catch (error) {
    console.error('Error creating payment mode:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
methods.list = paginatedList;
methods.delete = async (req, res) => {
  return res.status(403).json({
    success: false,
    result: null,
    message: "You can't delete a payment mode after it has been created",
  });
};

methods.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id); // Ensure admin-specific filtering

    const paymentMode = await Model.findOne({
      _id: id,
      createdBy: userId, // Ensure the payment mode belongs to the current admin
      removed: false,
    }).exec();

    if (!paymentMode) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Payment mode not found',
      });
    }

    const { isDefault = paymentMode.isDefault, enabled = paymentMode.enabled } = req.body;

    // If `isDefault` is being set to `false`, ensure another payment mode is set to `true`
    if (!isDefault || (!enabled && isDefault)) {
      await Model.findOneAndUpdate(
        { _id: { $ne: id }, createdBy: userId, enabled: true },
        { isDefault: true }
      );
    }

    // If `isDefault` is `true` and `enabled` is `true`, set other payment modes' `isDefault` to `false`
    if (isDefault && enabled) {
      await Model.updateMany(
        { _id: { $ne: id }, createdBy: userId },
        { isDefault: false }
      );
    }

    const paymentModeCount = await Model.countDocuments({ createdBy: userId });

    // Prevent disabling the only existing payment mode
    if ((!enabled || !isDefault) && paymentModeCount <= 1) {
      return res.status(422).json({
        success: false,
        result: null,
        message: 'You cannot disable the payment mode because it is the only existing one',
      });
    }

    const result = await Model.findOneAndUpdate(
      { _id: id, createdBy: userId },
      req.body,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Payment mode updated successfully',
      result,
    });
  } catch (error) {
    console.error('Error updating payment mode:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = methods;
