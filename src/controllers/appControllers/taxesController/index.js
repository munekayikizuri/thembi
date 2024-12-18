const mongoose = require('mongoose');
const Model = mongoose.model('Taxes');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const paginatedList = require('./paginatedList'); // Import the paginatedList function

const methods = createCRUDController('Taxes');
// const summary = require('./summary');

// Remove delete method to prevent accidental deletion
delete methods['delete'];

// Admin-specific create method
methods.create = async (req, res) => {
  try {
    const { isDefault } = req.body;

    // If the new tax is marked as default, reset others
    if (isDefault) {
      await Model.updateMany({}, { isDefault: false });
    }

    // Check if no default tax exists
    const countDefault = await Model.countDocuments({ isDefault: true });

    // Create a new tax
    const result = await new Model({
      ...req.body,
      createdBy: req.admin._id, // Tie tax creation to the admin
      isDefault: countDefault < 1 ? true : isDefault,
    }).save();

    return res.status(200).json({
      success: true,
      result,
      message: 'Tax created successfully',
    });
  } catch (error) {
    console.error('Error creating tax:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error creating tax',
      error: error.message,
    });
  }
};

// Prevent deletion of taxes
methods.delete = async (req, res) => {
  return res.status(403).json({
    success: false,
    result: null,
    message: "You can't delete a tax after it has been created",
  });
};

// Admin-specific update method
methods.update = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the tax being updated
    const tax = await Model.findOne({
      _id: id,
      removed: false,
      createdBy: req.admin._id, // Restrict to the admin who created it
    }).exec();

    if (!tax) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Tax not found or unauthorized access',
      });
    }

    const { isDefault = tax.isDefault, enabled = tax.enabled } = req.body;

    // Handle isDefault:false or enabled:false with constraints
    if (!isDefault || (!enabled && isDefault)) {
      await Model.findOneAndUpdate(
        { _id: { $ne: id }, enabled: true },
        { isDefault: true }
      );
    }

    // Handle isDefault:true and enabled:true by resetting others
    if (isDefault && enabled) {
      await Model.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    const taxesCount = await Model.countDocuments({});

    // Prevent disabling the only tax
    if ((!enabled || !isDefault) && taxesCount <= 1) {
      return res.status(422).json({
        success: false,
        result: null,
        message: 'You cannot disable the tax because it is the only existing one',
      });
    }

    // Update the tax
    const result = await Model.findOneAndUpdate({ _id: id }, req.body, {
      new: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Tax updated successfully',
      result,
    });
  } catch (error) {
    console.error('Error updating tax:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error updating tax',
      error: error.message,
    });
  }
};

// Add the paginated list method for Taxes
methods.list = paginatedList;
// methods.summary = (req, res) => summary(Model, req, res);

module.exports = methods;
