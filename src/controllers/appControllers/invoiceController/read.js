const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');

const read = async (req, res) => {
  try {
    // Find invoice by ID and ensure it belongs to the current authenticated admin
    const result = await Model.findOne({
      _id: req.params.id,
      removed: false,
      createdBy: req.admin._id  // Changed from req.user.id to match other controllers
    })
      .populate('createdBy', 'name')
      .populate('client')  // Also populate client data
      .exec();

    // If no result found, return an error
    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No document found for this admin',
      });
    }

    console.log("The Read Results:", result);

    // Return the found result
    return res.status(200).json({
      success: true,
      result,
      message: 'Invoice found',
    });
  } catch (error) {
    // Handle invalid ObjectId format error specifically
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid invoice ID format',
      });
    }

    console.error('Error reading invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = read;