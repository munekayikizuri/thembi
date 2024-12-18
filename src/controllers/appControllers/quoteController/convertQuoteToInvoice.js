const mongoose = require('mongoose');
const Quote = mongoose.model('Quote'); // The Quote model
const Invoice = mongoose.model('Invoice'); // The Invoice model
const pdfController = require('@/controllers/pdfController'); // Adjust the path to your PDF controller
const { calculate } = require('@/helpers');
const { increaseBySettingKey } = require('@/middlewares/settings');
const path = require('path');
const fs = require('fs');

const ensureDirectoryExists = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const convertQuoteToInvoice = async (req, res) => {
  try {
    const { quoteId } = req.body; // Ensure the client provides the quote ID
    const adminId = req.admin._id; // The admin performing the conversion

    // Fetch the quote to convert
    const quote = await Quote.findOne({ _id: quoteId, createdBy: adminId }).exec();
    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found.',
      });
    }

    // Prepare data for the invoice
    const invoiceData = {
      items: quote.items,
      taxRate: quote.taxRate,
      discount: quote.discount,
      subTotal: quote.subTotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      paymentStatus: 'unpaid', // Default to unpaid
      createdBy: adminId,
    };

    // Create a new invoice
    const invoice = await new Invoice(invoiceData).save();

    // Generate PDF for the invoice
    const fileId = `invoice-${invoice._id}.pdf`;
    const targetLocation = path.resolve(__dirname, '../../../public/download/invoice/', fileId);

    // Ensure the directory exists
    ensureDirectoryExists(targetLocation);

    const info = { targetLocation, format: 'A4' };

    await pdfController.generatePdf(
      'invoice', // Model name for the Pug template
      info,
      invoice, // Invoice data
      null, // Callback (optional)
      adminId // Admin ID
    );

    // Update the invoice with the PDF file reference
    invoice.pdf = fileId;
    await invoice.save();

    // Increment the last invoice number setting
    await increaseBySettingKey({
      settingKey: 'last_invoice_number',
      userId: adminId,
    });

    return res.status(200).json({
      success: true,
      result: invoice,
      message: 'Quote successfully converted to invoice.',
    });
  } catch (error) {
    console.error('Error converting quote to invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = convertQuoteToInvoice;
