const mongoose = require('mongoose');

const search = async (Model, req, res) => {
  console.log("req:",req.query);
  try {
    // Check for the presence of a query string
    if (!req.query.q || req.query.q.trim() === '') {
      return res.status(202).json({
        success: false,
        result: [],
        message: 'No query string provided',
      });
    }

    // Extract fields to search
    const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['name'];

    // Build search conditions
    const fields = { $or: [] };
    for (const field of fieldsArray) {
      fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
    }

    // Verify admin ID
    console.log('Admin ID:', req.admin._id);

    // Cast admin ID to ObjectId if necessary
    const adminId = new mongoose.Types.ObjectId(req.admin._id);

    // Log the query to debug
    console.log('Query:', {
      ...fields,
      removed: false,
      createdBy: adminId,
    });

    // Fetch results filtered by admin-specific conditions
    const results = await Model.find({
      ...fields,
      removed: false, // Exclude removed documents
      createdBy: adminId, // Restrict to documents created by the current admin
    })
      .limit(20)
      .exec();

    // Return results
    if (results.length > 0) {
      return res.status(200).json({
        success: true,
        result: results,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(202).json({
        success: false,
        result: [],
        message: 'No documents found by this request',
      });
    }
  } catch (error) {
    console.error('Error in search:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
    });
  }
};

module.exports = search;
