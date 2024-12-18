const mongoose = require('mongoose');
const Model = mongoose.model('Quote');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');
const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const create = async (req, res) => {
  try {
    const { items = [], taxRate = 0, discount = 0 } = req.body;

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

    // Add calculated fields and admin reference
    let body = req.body;
    body['subTotal'] = subTotal;
    body['taxTotal'] = taxTotal;
    body['total'] = total;
    body['items'] = items;
    body['createdBy'] = new mongoose.Types.ObjectId(req.admin._id); // Admin-specific ownership

    // Create a new quote
    const result = await new Model(body).save();

    // Generate PDF file ID
    const fileId = `quote-${result._id}.pdf`;
    const targetLocation = path.resolve(__dirname, '../../../public/download/quote/', fileId);

    // Ensure the directory exists
    ensureDirectoryExists(targetLocation);

    // Generate PDF immediately
    const info = { targetLocation, format: 'A4' };
    console.log('Attempting to generate PDF at:', targetLocation);

    await custom.generatePdf(
      'quote', // Model name for the Pug template
      info,
      result, // Quote data
      null, // Callback (optional)
      req.admin._id // Admin ID
    );

    console.log('PDF successfully generated at:', targetLocation);

    // Update quote with the file reference
    const updateResult = await Model.findOneAndUpdate(
      { _id: result._id, createdBy: body['createdBy'] }, // Admin-specific filtering
      { pdf: fileId },
      { new: true }
    ).exec();

    // Increment the last quote number setting
    await increaseBySettingKey({
      settingKey: 'last_quote_number',
      userId: req.admin._id,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      result: updateResult,
      message: 'Quote created successfully.',
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = create;
