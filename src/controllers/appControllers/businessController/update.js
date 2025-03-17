const mongoose = require('mongoose');

const Model = mongoose.model('BusinessInfo');
const Invoice = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id); // Admin-specific filtering

    if (req.body.amount === 0) {
      return res.status(202).json({
        success: false,
        result: null,
        message: `The Minimum Amount couldn't be 0`,
      });
    }

    // Find document by id and check admin ownership
    const previousPayment = await Model.findOne({
      _id: req.params.id,
      removed: false,
      createdBy: userId, // Ensure payment belongs to the current admin
    });

    if (!previousPayment) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Payment not found or not authorized to access',
      });
    }

    const { amount: previousAmount } = previousPayment;
    const { id: invoiceId, total, discount, credit: previousCredit } = previousPayment.invoice;

    const { amount: currentAmount } = req.body;

    const changedAmount = calculate.sub(currentAmount, previousAmount);
    const maxAmount = calculate.sub(total, calculate.add(discount, previousCredit));

    if (changedAmount > maxAmount) {
      return res.status(202).json({
        success: false,
        result: null,
        message: `The Max Amount you can add is ${maxAmount + previousAmount}`,
        error: `The Max Amount you can add is ${maxAmount + previousAmount}`,
      });
    }

    let paymentStatus =
      calculate.sub(total, discount) === calculate.add(previousCredit, changedAmount)
        ? 'paid'
        : calculate.add(previousCredit, changedAmount) > 0
        ? 'partially'
        : 'unpaid';

    const updatedDate = new Date();
    const updates = {
      number: req.body.number,
      date: req.body.date,
      amount: req.body.amount,
      paymentMode: req.body.paymentMode,
      ref: req.body.ref,
      description: req.body.description,
      updated: updatedDate,
    };

    // Update the payment document
    const result = await Model.findOneAndUpdate(
      { _id: req.params.id, removed: false, createdBy: userId }, // Admin-specific filtering
      { $set: updates },
      {
        new: true, // Return the new result instead of the old one
      }
    ).exec();

    // Update the related invoice document
    const updateInvoice = await Invoice.findOneAndUpdate(
      { _id: result.invoice._id.toString(), createdBy: userId }, // Admin-specific filtering
      {
        $inc: { credit: changedAmount },
        $set: {
          paymentStatus: paymentStatus,
        },
      },
      {
        new: true, // Return the new result instead of the old one
      }
    ).exec();

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully updated the Payment',
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = update;
