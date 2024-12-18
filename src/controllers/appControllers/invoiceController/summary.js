const mongoose = require('mongoose');
const moment = require('moment');

const Model = mongoose.model('Invoice');
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

  const statuses = ['draft', 'pending', 'overdue', 'paid', 'unpaid', 'partially'];

  try {
    // Explicitly convert user ID to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id); // Ensure proper instantiation

    // Aggregation query for invoice summary for the current user
    const response = await Model.aggregate([
      {
        $match: {
          removed: false,
          createdBy: userId, // Using the ObjectId for matching the user
          date: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      },
      {
        $facet: {
          totalInvoice: [
            {
              $group: {
                _id: null,
                total: { $sum: '$total' },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                total: '$total',
                count: '$count',
              },
            },
          ],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                status: '$_id',
                count: '$count',
              },
            },
          ],
          paymentStatusCounts: [
            {
              $group: {
                _id: '$paymentStatus',
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                status: '$_id',
                count: '$count',
              },
            },
          ],
          overdueCounts: [
            {
              $match: {
                expiredDate: { $lt: new Date() },
              },
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                status: '$_id',
                count: '$count',
              },
            },
          ],
        },
      },
    ]);

    let result = [];

    const totalInvoices = response[0].totalInvoice ? response[0].totalInvoice[0] : 0;
    const statusResult = response[0].statusCounts || [];
    const paymentStatusResult = response[0].paymentStatusCounts || [];
    const overdueResult = response[0].overdueCounts || [];

    // Mapping results to include percentage based on total invoice count
    const statusResultMap = statusResult.map((item) => ({
      ...item,
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    }));

    const paymentStatusResultMap = paymentStatusResult.map((item) => ({
      ...item,
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    }));

    const overdueResultMap = overdueResult.map((item) => ({
      ...item,
      status: 'overdue',
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    }));

    // Ensuring the status order is consistent
    statuses.forEach((status) => {
      const found = [...paymentStatusResultMap, ...statusResultMap, ...overdueResultMap].find(
        (item) => item.status === status
      );
      if (found) {
        result.push(found);
      }
    });

    // Query for unpaid invoices
    const unpaid = await Model.aggregate([
      {
        $match: {
          removed: false,
          createdBy: userId, // Filter by the current admin (user)
          paymentStatus: { $in: ['unpaid', 'partially'] },
          date: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      },
      {
        $group: {
          _id: null,
          total_amount: { $sum: { $subtract: ['$total', '$credit'] } },
        },
      },
      {
        $project: {
          _id: 0,
          total_amount: '$total_amount',
        },
      },
    ]);

    const finalResult = {
      total: totalInvoices?.total,
      total_undue: unpaid.length > 0 ? unpaid[0].total_amount : 0,
      type,
      performance: result,
    };

    return res.status(200).json({
      success: true,
      result: finalResult,
      message: `Successfully found all invoices for the last ${defaultType}`,
    });

  } catch (error) {
    console.error('Error calculating invoice summary:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = summary;
