const paginatedList = async (Model, req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = parseInt(req.query.items) || 10;
    const skip = page * limit - limit;
    const { sortBy = 'created', sortValue = -1, filter, equal } = req.query;

    // Build base query
    let baseQuery = {
      removed: false,
      createdBy: req.admin._id,
    };

    // Add filter conditions if provided
    if (filter && equal) {
      baseQuery[filter] = equal;
    }

    // Special handling for Invoice model to include drafts
    if (Model.modelName === 'Invoice') {
      baseQuery = {
        ...baseQuery,
        $or: [
          { status: { $ne: 'draft' } },
          { status: 'draft' }
        ]
      };
    }

    // Handle search fields if provided
    const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];
    if (fieldsArray.length > 0 && req.query.q) {
      const searchQuery = {
        $or: fieldsArray.map(field => ({
          [field]: { $regex: new RegExp(req.query.q, 'i') }
        }))
      };
      baseQuery = { ...baseQuery, ...searchQuery };
    }

    console.log('Query:', JSON.stringify(baseQuery, null, 2)); // Debug log

    const resultsPromise = Model.find(baseQuery)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortValue })
      .populate()
      .exec();

    const countPromise = Model.countDocuments(baseQuery);

    const [result, count] = await Promise.all([resultsPromise, countPromise]);

    console.log('Found results:', result.length); // Debug log

    return res.status(200).json({
      success: true,
      result,
      pagination: {
        page,
        pages: Math.ceil(count / limit),
        count
      },
      message: count > 0 ? 'Successfully found all documents' : 'Collection is Empty'
    });

  } catch (error) {
    console.error('PaginatedList Error:', error); // Debug log
    return res.status(500).json({
      success: false,
      result: [],
      message: error.message
    });
  }
};

module.exports = paginatedList;
