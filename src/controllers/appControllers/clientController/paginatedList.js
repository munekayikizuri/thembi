const mongoose = require('mongoose');

// Reference to the Client model
const Model = mongoose.model('Client');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  const { sortBy = 'name', sortValue = 1, filter, equal } = req.query;

  const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

  let fields;
  
  fields = fieldsArray.length === 0 ? {} : { $or: [] };

  // Add search fields conditions if present
  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
  }

  try {
    // Query the database for a list of clients created by the authenticated admin
    const resultsPromise = Model.find({
      removed: false, // Ensure clients are not removed
      createdBy: req.user.id, // Ensure the client is created by the current admin
      [filter]: equal, // Apply filter condition if provided
      ...fields,
    })
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortValue })
      .populate('createdBy', 'name') // Populating the creator admin's name
      .exec();

    // Counting the total documents for pagination
    const countPromise = Model.countDocuments({
      removed: false, // Ensure clients are not removed
      createdBy: req.user.id, // Count only the clients created by the current admin
      [filter]: equal, // Apply filter condition if provided
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
        message: 'Successfully found all clients',
      });
    } else {
      return res.status(203).json({
        success: true,
        result: [],
        pagination,
        message: 'No clients found',
      });
    }
  } catch (error) {
    console.error('Error retrieving paginated list of clients:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = paginatedList;
