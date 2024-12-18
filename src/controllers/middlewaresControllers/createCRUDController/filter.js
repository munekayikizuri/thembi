const filter = async (Model, req, res) => {
  // Ensure both 'filter' and 'equal' parameters are provided
  if (req.query.filter === undefined || req.query.equal === undefined) {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Filter not provided correctly',
    });
  }

  try {
    // Add admin-specific filtering
    const adminFilter = { createdBy: req.admin._id, removed: false };

    // Apply the query filters
    const result = await Model.find(adminFilter)
      .where(req.query.filter)
      .equals(req.query.equal)
      .exec();

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No documents found',
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found all documents',
    });
  } catch (error) {
    console.error('Error in admin-specific filtering:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = filter;
