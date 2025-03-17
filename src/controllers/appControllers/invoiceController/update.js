const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');
const { calculate } = require('@/helpers');
const schema = require('./schemaValidate');

const update = async (req, res) => {
  try {
    let body = req.body;
    
    // Validate the request body
    const { error, value } = schema.validate(body);
    if (error) {
      const { details } = error;
      return res.status(400).json({
        success: false,
        result: null,
        message: details[0]?.message,
      });
    }

    // Find previous invoice with admin check
    const previousInvoice = await Model.findOne({
      _id: req.params.id,
      createdBy: req.admin._id,  // Admin specific check
      removed: false,
    });

    if (!previousInvoice) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Invoice not found for this admin',
      });
    }

    const { credit } = previousInvoice;
    const { items = [], taxRate = 0, discount = 0 } = req.body;

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Items cannot be empty',
      });
    }

    // default
    let subTotal = 0;
    let taxTotal = 0;
    let total = 0;

    //Calculate the items array with subTotal, total, taxTotal
    items.map((item) => {
      let total = calculate.multiply(item['quantity'], item['price']);
      //sub total
      subTotal = calculate.add(subTotal, total);
      //item total
      item['total'] = total;
    });

    taxTotal = calculate.multiply(subTotal, taxRate / 100);
    total = calculate.add(subTotal, taxTotal);

    body['subTotal'] = subTotal;
    body['taxTotal'] = taxTotal;
    body['total'] = total;
    body['items'] = items;
    body['pdf'] = 'invoice-' + req.params.id + '.pdf';
    body['createdBy'] = req.admin._id;  // Ensure admin ID is preserved

    if (body.hasOwnProperty('currency')) {
      delete body.currency;
    }

    // Find document by id and updates with the required fields
    let paymentStatus =
      calculate.sub(total, discount) === credit ? 'paid' : credit > 0 ? 'partially' : 'unpaid';
    body['paymentStatus'] = paymentStatus;

    // Update with admin check
    const result = await Model.findOneAndUpdate(
      { 
        _id: req.params.id, 
        createdBy: req.admin._id,  // Admin specific check
        removed: false 
      }, 
      body,
      {
        new: true,
      }
    ).exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Invoice not found or unauthorized',
      });
    }

    // Returning successful response
    return res.status(200).json({
      success: true,
      result,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = update;