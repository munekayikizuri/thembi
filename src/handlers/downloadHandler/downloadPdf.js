const custom = require('@/controllers/pdfController');
const mongoose = require('mongoose');

module.exports = downloadPdf = async (req, res, { directory, id }) => {
  try {
    const adminId = req.user.id; // Assuming `req.user` contains authenticated admin details
    const modelName = directory.charAt(0).toUpperCase() + directory.slice(1);

    if (!mongoose.models[modelName]) {
      return res.status(404).json({
        success: false,
        message: `Model '${modelName}' does not exist`,
      });
    }

    const Model = mongoose.model(modelName);
    const result = await Model.findOne({ _id: id }).exec();

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'No data found for the given ID',
      });
    }

    const targetLocation = `src/public/download/${modelName.toLowerCase()}/${modelName.toLowerCase()}-${result._id}.pdf`;

    await custom.generatePdf(
      modelName,
      { format: 'A4', targetLocation },
      result,
      () => {
        res.download(targetLocation, (error) => {
          if (error) {
            return res.status(500).json({ success: false, message: 'File download failed', error: error.message });
          }
        });
      },
      adminId // Pass adminId here
    );
  } catch (error) {
    console.error('Error in downloadPdf handler:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
