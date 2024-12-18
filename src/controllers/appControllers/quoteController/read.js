const mongoose = require('mongoose');
const Model = mongoose.model('Quote');

const read = async (req, res) => {
  try {
    // Find document by id and restrict access to the admin's documents
    const result = await Model.findOne({
      _id: req.params.id,
      createdBy: new mongoose.Types.ObjectId(req.admin._id),
      removed: false,
    })
      .populate('createdBy', 'name')
      .exec();

    // If no results found, return document not found
    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No document found or you do not have access to it.',
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      result,
      message: 'We found this document.',
    });
  } catch (error) {
    console.error('Error reading document:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = read;
