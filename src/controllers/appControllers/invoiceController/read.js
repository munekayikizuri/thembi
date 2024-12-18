const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const read = async (req, res) => {
  try {
    // Find invoice by ID and ensure it belongs to the current authenticated admin
    const result = await Model.findOne({
      _id: req.params.id,
      removed: false,
      createdBy: req.user.id, // Ensure the invoice belongs to the current admin
    })
      .populate('createdBy', 'name')
      .exec();

    // If no result found, return an error
    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No document found for this admin',
      });
    }
    console.log("The Read Results:",result);
    // Return the found result
    return res.status(200).json({
      success: true,
      result,
      message: 'Invoice found',
    });
  } catch (error) {
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
