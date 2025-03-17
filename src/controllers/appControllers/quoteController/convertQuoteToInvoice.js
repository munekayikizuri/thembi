const mongoose = require('mongoose');
const Quote = mongoose.model('Quote');
const Invoice = mongoose.model('Invoice');
const PdfStorage = mongoose.model('PdfStorage');
const pdfController = require('@/controllers/pdfController');
const { calculate } = require('@/helpers');
const { increaseBySettingKey } = require('@/middlewares/settings');

const convertQuoteToInvoice = async (req, res) => {
  try {
    const quoteId = new mongoose.Types.ObjectId(req.params.id);
    const adminId = req.admin._id;

    // First check if quote exists
    const quote = await Quote.findOne({ _id: quoteId, createdBy: adminId }).exec();
    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found.',
      });
    }

    // Get the settings
    const UserSettings = require('@/models/coreModels/UserSettings');
    
    // Ensure all required settings exist
    const requiredSettings = [
      'idurar_app_language',
      'currency_symbol',
      'currency_position',
      'decimal_sep',
      'thousand_sep',
      'cent_precision',
      'zero_format',
      'idurar_app_date_format'
    ];

    // Check if settings exist
    const settingsExist = await UserSettings.find({
      user: adminId,
      settingKey: { $in: requiredSettings },
      enabled: true
    });

    if (settingsExist.length < requiredSettings.length) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Required settings are missing. Please configure your settings first.',
      });
    }

    // Rest of your conversion code...
    const settingResult = await increaseBySettingKey({
      settingKey: 'last_invoice_number',
      userId: adminId,
    });

    const nextInvoiceNumber = settingResult.settingValue;
    const currentYear = new Date().getFullYear();

    // Create invoice
    const invoiceData = {
      items: quote.items,
      taxRate: quote.taxRate,
      discount: quote.discount,
      subTotal: quote.subTotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      paymentStatus: 'unpaid',
      createdBy: adminId,
      client: quote.client,
      year: currentYear,
      number: nextInvoiceNumber,
      status: 'pending',
      date: new Date(),
      expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      converted: {
        from: 'quote',
        quote: quoteId
      }
    };

    const invoice = await new Invoice(invoiceData).save();

    // Generate PDF
    const pdfDoc = await pdfController.generatePdf(
      'invoice', 
      { format: 'A4' },
      invoice,
      null,
      adminId
    );

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
      message: 'Error converting quote to invoice',
      error: error.message,
    });
  }
};
module.exports = convertQuoteToInvoice;