const mongoose = require('mongoose');

const Model = mongoose.model('BusinessInfo');
const Invoice = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const create = async (req, res) => {
  try {
    // Check if amount is zero
    if (req.body.amount === 0) {
      return res.status(202).json({
        success: false,
        result: null,
        message: `The Minimum Amount couldn't be 0`,
      });
    }

    const adminId = new mongoose.Types.ObjectId(req.admin._id); // Admin-specific filtering

    // Find the invoice and verify it belongs to the current admin
    const currentInvoice = await Invoice.findOne({
      _id: req.body.invoice,
      removed: false,
      createdBy: adminId, // Admin-specific filtering
    });

    if (!currentInvoice) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Invoice not found or not authorized to access',
      });
    }

    const {
      total: previousTotal,
      discount: previousDiscount,
      credit: previousCredit,
    } = currentInvoice;

    const maxAmount = calculate.sub(calculate.sub(previousTotal, previousDiscount), previousCredit);

    if (req.body.amount > maxAmount) {
      return res.status(202).json({
        success: false,
        result: null,
        message: `The Max Amount you can add is ${maxAmount}`,
      });
    }

    // Add admin-specific information to the request body
    req.body['createdBy'] = adminId;

    // Create the payment
    const result = await Model.create(req.body);

    // Update the payment document with the generated PDF file path
    const fileId = 'payment-' + result._id + '.pdf';
    const updatePath = await Model.findOneAndUpdate(
      {
        _id: result._id.toString(),
        removed: false,
        createdBy: adminId, // Ensure the payment belongs to the admin
      },
      { pdf: fileId },
      { new: true }
    ).exec();

    const { _id: paymentId, amount } = result;
    const { id: invoiceId, total, discount, credit } = currentInvoice;

    let paymentStatus =
      calculate.sub(total, discount) === calculate.add(credit, amount)
        ? 'paid'
        : calculate.add(credit, amount) > 0
        ? 'partially'
        : 'unpaid';

    // Update the related invoice
    const invoiceUpdate = await Invoice.findOneAndUpdate(
      { _id: req.body.invoice, createdBy: adminId }, // Ensure the invoice belongs to the admin
      {
        $push: { payment: paymentId.toString() },
        $inc: { credit: amount },
        $set: { paymentStatus: paymentStatus },
      },
      {
        new: true, // Return the updated invoice
        runValidators: true,
      }
    ).exec();
    await increaseBySettingKey({
      settingKey: 'last_payment_number',
      userId: req.admin._id, // 
    });
    
    return res.status(200).json({
      success: true,
      result: updatePath,
      message: 'Payment Invoice created successfully',
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = create;
