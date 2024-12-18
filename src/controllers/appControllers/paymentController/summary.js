const mongoose = require('mongoose');
const moment = require('moment');

const Model = mongoose.model('Payment');
const { loadSettings } = require('@/middlewares/settings');

const summary = async (req, res) => {
  let defaultType = 'month';

  const { type } = req.query;

  const settings = await loadSettings();

  if (type) {
    if (['week', 'month', 'year'].includes(type)) {
      defaultType = type;
    } else {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid type',
      });
    }
  }

  const currentDate = moment();
  let startDate = currentDate.clone().startOf(defaultType);
  let endDate = currentDate.clone().endOf(defaultType);

  try {
    // Explicitly convert user ID to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id); // Ensure proper instantiation

    // Aggregate payment summary for the current user
    const result = await Model.aggregate([
      {
        $match: {
          removed: false,
          createdBy: userId, // Using the ObjectId to match the user
          date: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      },
      {
        $group: {
          _id: null, // Grouping all records into one group
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id from the result
          count: 1,
          total: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      result: result.length > 0 ? result[0] : { count: 0, total: 0 },
      message: `Successfully fetched the summary of payment invoices for the last ${defaultType}`,
    });
  } catch (error) {
    console.error('Error calculating payment summary:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = summary;
