const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');
const { calculate } = require('@/helpers');
const { increaseBySettingKey } = require('@/middlewares/settings');
const schema = require('./schemaValidate');
const pdfController = require('@/controllers/pdfController');

const create = async (req, res) => {
  try {
    let body = req.body;
    body.status = 'draft'; // All new invoices start as drafts

    // Get last invoice number for new invoices
    if (!body.number) {
      const lastInvoice = await Model.find({
        createdBy: req.admin._id,
      })
      .sort({ number: -1 })
      .limit(1);

      body.number = lastInvoice.length > 0 ? lastInvoice[0].number + 1 : 1;
    }

    // Handle invoice
    body.items = Array.isArray(body.items) ? body.items : [];
    
    // Calculate totals
    let subTotal = 0;
    body.items = body.items.map(item => {
      if (item.quantity && item.price) {
        const itemTotal = calculate.multiply(item.quantity, item.price);
        subTotal = calculate.add(subTotal, itemTotal);
        return { ...item, total: itemTotal };
      }
      return item;
    });

    const taxTotal = calculate.multiply(subTotal, (body.taxRate || 0) / 100);
    const total = calculate.add(subTotal, taxTotal);

    // Prepare invoice data
    body = {
      ...body,
      subTotal,
      taxTotal,
      total,
      createdBy: req.admin._id,
      paymentStatus: calculate.sub(total, (body.discount || 0)) === 0 ? 'paid' : 'unpaid',
      date: body.date || new Date(),
      expiredDate: body.expiredDate || new Date(),
      year: body.year || new Date().getFullYear()
    };

    // Save the invoice with validation disabled since it's a draft
    const result = await new Model(body).save({ validateBeforeSave: true });

    // Generate PDF and save to PdfStorage
    const fileId = `invoice-${result._id}.pdf`;
    const info = { format: 'A4' };

    // Generate and save PDF to PdfStorage
    await pdfController.generatePdf(
      'Invoice',
      info,
      result,
      null,
      req.admin._id
    );

    // Update invoice with PDF reference
    const updateResult = await Model.findOneAndUpdate(
      { _id: result._id },
      { pdf: fileId },
      { new: true }
    ).exec();

    // Increment invoice number
    const settingsUpdate = await increaseBySettingKey({
      settingKey: 'last_invoice_number',
      userId: req.admin._id
    });

    if (!settingsUpdate) {
      console.error('Failed to increment invoice number');
    }

    return res.status(200).json({
      success: true,
      result: updateResult,
      message: 'Invoice saved as draft'
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports = create;