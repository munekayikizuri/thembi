const mongoose = require('mongoose');
const Model = mongoose.model('PaymentMode');

const paginatedList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.items) || 10;
    const skip = (page - 1) * limit;

    // Extract query parameters
    const { sortBy = 'enabled', sortValue = -1, filter, equal } = req.query;

    // Handle search fields
    const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];
    let fields = fieldsArray.length === 0 ? {} : { $or: [] };

    for (const field of fieldsArray) {
      fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
    }

    // Ensure the query is admin-specific
    const adminFilter = { 
      createdBy: new mongoose.Types.ObjectId(req.admin._id), // Restrict by admin ID
      removed: false, // Exclude removed entries
    };

    // Fetch paginated results
    const resultsPromise = Model.find({
      ...adminFilter,
      [filter]: equal, // Apply filter if provided
      ...fields, // Apply search fields if present
    })
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortValue }) // Default sorting
      .populate('createdBy', 'name') // Populate admin details if needed
      .exec();

    // Count total matching documents
    const countPromise = Model.countDocuments({
      ...adminFilter,
      [filter]: equal,
      ...fields,
    });

    // Resolve promises
    const [result, count] = await Promise.all([resultsPromise, countPromise]);

    // Calculate total pages
    const pages = Math.ceil(count / limit);

    // Prepare pagination response
    const pagination = { page, pages, count };

    if (count > 0) {
      return res.status(200).json({
        success: true,
        result,
        pagination,
        message: 'Successfully found all payment modes',
      });
    } else {
      return res.status(204).json({
        success: true,
        result: [],
        pagination,
        message: 'No payment modes found',
      });
    }
  } catch (error) {
    console.error('Error fetching payment modes:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = paginatedList;
