const listAll = async (Model, req, res) => {
  try {
    const sort = req.query.sort || 'desc';
    const page = req.query.page || 1;
    const limit = req.query.items || 10;
    const enabled = req.query.enabled || undefined;

    // Build the query object
    let query = {
      removed: false,
      createdBy: req.admin._id,
    };

    // Add enabled condition if specified
    if (enabled !== undefined) {
      query.enabled = enabled;
    }

    // For Invoice model, include draft status
    if (Model.modelName === 'Invoice') {
      query = {
        ...query,
        $or: [
          { status: { $ne: 'draft' } },
          { status: 'draft' }
        ]
      };
    }

    // Add debug logging
    console.log('Model name:', Model.modelName);
    console.log('Query:', JSON.stringify(query, null, 2));

    const result = await Model.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created: sort })
      .populate()
      .exec();

    console.log('Found results:', result.length); // Debug log

    const count = await Model.countDocuments(query);

    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        result,
        pagination: {
          page,
          count,
        },
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        pagination: {
          page,
          count: 0,
        },
        message: 'Collection is Empty',
      });
    }
  } catch (error) {
    console.error('ListAll Error:', error);
    return res.status(500).json({
      success: false,
      result: [],
      message: error.message,
    });
  }
};

module.exports = listAll;
