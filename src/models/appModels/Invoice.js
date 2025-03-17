const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },

  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },
  number: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  content: String,
  recurring: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'annually', 'quarter'],
  },
  date: {
    type: Date,
    required: function() {
      return this.status !== 'draft';
    },
  },
  expiredDate: {
    type: Date,
    required: function() {
      return this.status !== 'draft';
    },
  },
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: function() {
      return this.status !== 'draft';
    },
    autopopulate: true,
  },
  converted: {
    from: {
      type: String,
      enum: ['quote', 'offer'],
    },
    offer: {
      type: mongoose.Schema.ObjectId,
      ref: 'Offer',
    },
    quote: {
      type: mongoose.Schema.ObjectId,
      ref: 'Quote',
    },
  },
  items: {
    type: [{
      itemName: {
        type: String,
        required: function() {
          // Only required for non-draft items
          return this.parent().parent().status && 
                 this.parent().parent().status !== 'draft';
        }
      },
      description: String,
      quantity: {
        type: Number,
        default: 1,
        required: function() {
          return this.parent().parent().status && 
                 this.parent().parent().status !== 'draft';
        }
      },
      price: {
        type: Number,
        required: function() {
          return this.parent().parent().status && 
                 this.parent().parent().status !== 'draft';
        }
      },
      total: {
        type: Number,
        required: function() {
          return this.parent().parent().status && 
                 this.parent().parent().status !== 'draft';
        }
      }
    }],
    default: [], // Empty array by default
    validate: {
      validator: function(items) {
        // Allow empty items array for drafts
        if (this.status === 'draft') return true;
        // For non-drafts, require at least one valid item
        return items.length > 0;
      },
      message: 'At least one item is required for non-draft invoices'
    }
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  subTotal: {
    type: Number,
    default: 0,
  },
  taxTotal: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'ZA',
    uppercase: true,
    required: true,
  },
  credit: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  payment: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Payment',
    },
  ],
  paymentStatus: {
    type: String,
    default: 'unpaid',
    enum: ['unpaid', 'paid', 'partially'],
  },
  isOverdue: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'refunded', 'cancelled', 'on hold'],
    default: 'draft',
  },
  pdf: {
    type: String,
  },
  files: [
    {
      id: String,
      name: String,
      path: String,
      description: String,
      isPublic: {
        type: Boolean,
        default: true,
      },
    },
  ],
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// Add compound index for draft lookup
invoiceSchema.index({
  number: 1,
  year: 1,
  status: 1,
  createdBy: 1
});


invoiceSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Invoice', invoiceSchema);
