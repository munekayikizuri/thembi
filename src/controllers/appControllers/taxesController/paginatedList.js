const mongoose = require('mongoose');

// Reference to the Client model
const Model = mongoose.model('Taxes');

const paginatedList = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = (page - 1) * limit;

  try {
    const resultsPromise = Model.find({
      removed: false,
      createdBy: req.admin._id, // Filter by admin-specific taxes
    })
      .skip(skip)
      .limit(limit)
      .sort({ enabled: -1 }) // Example default sorting
      .exec();

    const countPromise = Model.countDocuments({
      removed: false,
      createdBy: req.admin._id, // Ensure the count is admin-specific
    });

    const [result, count] = await Promise.all([resultsPromise, countPromise]);
    const pages = Math.ceil(count / limit);

    if (count > 0) {
      return res.status(200).json({
        success: true,
        result,
        pagination: { page, pages, count },
        message: 'Taxes retrieved successfully',
      });
    } else {
      return res.status(204).json({
        success: true,
        result: [],
        pagination: { page, pages, count },
        message: 'No taxes found',
      });
    }
  } catch (error) {
    console.error('Error retrieving taxes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = paginatedList;
