const mongoose = require('mongoose');

const Model = mongoose.model('Quote');

const custom = require('@/controllers/pdfController');
const { calculate } = require('@/helpers');

const update = async (req, res) => {
  try {
    const { items = [], taxRate = 0, discount = 0 } = req.body;

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Items cannot be empty',
      });
    }

    // Default values
    let subTotal = 0;
    let taxTotal = 0;
    let total = 0;

    // Calculate the items array with subTotal, taxTotal, and total
    items.map((item) => {
      const itemTotal = calculate.multiply(item['quantity'], item['price']);
      subTotal = calculate.add(subTotal, itemTotal);
      item['total'] = itemTotal; // Update item total
    });

    taxTotal = calculate.multiply(subTotal, taxRate / 100);
    total = calculate.add(subTotal, taxTotal);

    let body = req.body;

    body['subTotal'] = subTotal;
    body['taxTotal'] = taxTotal;
    body['total'] = total;
    body['items'] = items;
    body['pdf'] = 'quote-' + req.params.id + '.pdf';

    if (body.hasOwnProperty('currency')) {
      delete body.currency;
    }

    // Find and update only the quotes created by the authenticated admin
    const result = await Model.findOneAndUpdate(
      { _id: req.params.id, removed: false, createdBy: req.admin._id }, // Admin-specific restriction
      body,
      {
        new: true, // Return the updated document
      }
    ).exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No document found or unauthorized access',
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      result,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = update;
