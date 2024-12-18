const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  const { sortBy = 'enabled', sortValue = -1, filter, equal } = req.query;

  const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

  let fields;
  
  fields = fieldsArray.length === 0 ? {} : { $or: [] };

  // Add search fields conditions if present
  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
  }

  try {
    // Query the database for a list of invoices created by the authenticated admin
    const resultsPromise = Model.find({
      removed: false,
      createdBy: req.user.id, // Ensure the invoice is created by the current admin
      [filter]: equal,
      ...fields,
    })
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortValue })
      .populate('createdBy', 'name')
      .exec();

    // Counting the total documents for pagination
    const countPromise = Model.countDocuments({
      removed: false,
      createdBy: req.user.id, // Count only the invoices created by the current admin
      [filter]: equal,
      ...fields,
    });

    // Resolving both promises
    const [result, count] = await Promise.all([resultsPromise, countPromise]);

    // Calculating total pages
    const pages = Math.ceil(count / limit);

    // Constructing pagination object
    const pagination = { page, pages, count };

    if (count > 0) {
      return res.status(200).json({
        success: true,
        result,
        pagination,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(203).json({
        success: true,
        result: [],
        pagination,
        message: 'Collection is Empty',
      });
    }
  } catch (error) {
    console.error('Error retrieving paginated list of invoices:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = paginatedList;
