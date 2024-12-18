const mongoose = require('mongoose');
const moment = require('moment');

const InvoiceModel = mongoose.model('Invoice');

const summary = async (Model, req, res) => {
  let defaultType = 'month';
  const { type } = req.query;

  if (type && ['week', 'month', 'year'].includes(type)) {
    defaultType = type;
  } else if (type) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid type',
    });
  }

  const currentDate = moment();
  let startDate = currentDate.clone().startOf(defaultType);
  let endDate = currentDate.clone().endOf(defaultType);

  const adminId = new mongoose.Types.ObjectId(req.admin._id); // Ensure admin specificity

  const pipeline = [
    {
      $facet: {
        totalClients: [
          {
            $match: {
              removed: false,
              enabled: true,
              createdBy: adminId, // Filter by admin
            },
          },
          {
            $count: 'count',
          },
        ],
        newClients: [
          {
            $match: {
              removed: false,
              enabled: true,
              createdBy: adminId, // Filter by admin
              created: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            },
          },
          {
            $count: 'count',
          },
        ],
        activeClients: [
          {
            $match: {
              removed: false,
              enabled: true,
              createdBy: adminId, // Filter by admin
            },
          },
          {
            $lookup: {
              from: InvoiceModel.collection.name,
              localField: '_id', // Match _id from ClientModel
              foreignField: 'client', // Match client field in InvoiceModel
              as: 'invoice',
            },
          },
          {
            $match: {
              'invoice.removed': false,
              'invoice.createdBy': adminId, // Ensure invoices belong to the admin
            },
          },
          {
            $group: {
              _id: '$_id',
            },
          },
          {
            $count: 'count',
          },
        ],
      },
    },
  ];

  try {
    const aggregationResult = await Model.aggregate(pipeline);

    const result = aggregationResult[0];
    const totalClients = result.totalClients[0] ? result.totalClients[0].count : 0;
    const totalNewClients = result.newClients[0] ? result.newClients[0].count : 0;
    const activeClients = result.activeClients[0] ? result.activeClients[0].count : 0;

    const totalActiveClientsPercentage = totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
    const totalNewClientsPercentage = totalClients > 0 ? (totalNewClients / totalClients) * 100 : 0;

    return res.status(200).json({
      success: true,
      result: {
        new: Math.round(totalNewClientsPercentage),
        active: Math.round(totalActiveClientsPercentage),
      },
      message: 'Successfully fetched summary of clients',
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = summary;
