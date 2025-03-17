const mongoose = require('mongoose');

const pdfStorageSchema = new mongoose.Schema(
  {
    modelName: {
      type: String,
      required: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'modelName'
    },
    pdfData: {
      type: Buffer,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('PdfStorage', pdfStorageSchema);