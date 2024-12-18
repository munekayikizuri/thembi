const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');
const { calculate } = require('@/helpers');
const { increaseBySettingKey } = require('@/middlewares/settings');
const schema = require('./schemaValidate');
const pdfController = require('@/controllers/pdfController'); // Adjust to the correct path

const create = async (req, res) => {
  try {
    let body = req.body;

    // Validate request body against schema
    const { error, value } = schema.validate(body);
    if (error) {
      const { details } = error;
      return res.status(400).json({
        success: false,
        result: null,
        message: details[0]?.message,
      });
    }

    const { items = [], taxRate = 0, discount = 0 } = value;

    // Initialize totals
    let subTotal = 0;
    let taxTotal = 0;
    let total = 0;

    // Calculate subtotals, taxes, and item totals
    items.map((item) => {
      let itemTotal = calculate.multiply(item['quantity'], item['price']);
      subTotal = calculate.add(subTotal, itemTotal);
      item['total'] = itemTotal; // Update item with its total
    });

    taxTotal = calculate.multiply(subTotal, taxRate / 100);
    total = calculate.add(subTotal, taxTotal);

    // Determine payment status
    let paymentStatus = calculate.sub(total, discount) === 0 ? 'paid' : 'unpaid';

    // Add calculated fields and admin reference
    body['subTotal'] = subTotal;
    body['taxTotal'] = taxTotal;
    body['total'] = total;
    body['items'] = items;
    body['paymentStatus'] = paymentStatus;
    body['createdBy'] = new mongoose.Types.ObjectId(req.admin._id); // Admin-specific ownership

    // Create a new invoice
    const result = await new Model(body).save();

    // Generate PDF immediately
    const fileId = `invoice-${result._id}.pdf`;
    const targetLocation = `src/public/download/invoice/${fileId}`; // Adjust path as needed
    const info = { targetLocation, format: 'A4' };

    await pdfController.generatePdf(
      'invoice', // Model name for the Pug template
      info,
      result, // Invoice data
      null, // Callback (optional)
      req.admin._id // Admin ID
    );

    // Update invoice with the file reference
    const updateResult = await Model.findOneAndUpdate(
      { _id: result._id, createdBy: body['createdBy'] },
      { pdf: fileId },
      { new: true }
    ).exec();

    // Increment the last invoice number setting
    await increaseBySettingKey({
      settingKey: 'last_invoice_number',
      userId: req.admin._id,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      result: updateResult,
      message: 'Invoice created successfully.',
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = create;
