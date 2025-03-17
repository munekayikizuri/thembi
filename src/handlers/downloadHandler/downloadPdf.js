const custom = require('@/controllers/pdfController');
const mongoose = require('mongoose');
const PdfStorage = require('@/models/appModels/PdfStorage');

module.exports = downloadPdf = async (req, res, { directory, id }) => {
  try {
    const adminId = req.user.id;
    const modelName = directory.charAt(0).toUpperCase() + directory.slice(1);

    if (!mongoose.models[modelName]) {
      return res.status(404).json({
        success: false,
        message: `Model '${modelName}' does not exist`,
      });
    }
    console.log("Checking the Model Name thats passed: ", modelName);

    const Model = mongoose.model(modelName);
    const result = await Model.findOne({ _id: id }).exec();
    console.log("Checking the result thats passed: ", result);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the given ID',
      });
    }

    let pdfDoc = await PdfStorage.findOne({
      modelName,
      documentId: id
    });

    if (!pdfDoc) {
      pdfDoc = await custom.generatePdf(
        modelName,
        { format: 'A4' },
        result,
        null,
        adminId
      );
    }

    if (!pdfDoc?.pdfData) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PDF'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${pdfDoc.filename}`);
    res.send(pdfDoc.pdfData);

  } catch (error) {
    console.error('Error in downloadPdf handler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};