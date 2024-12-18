const express = require('express');
const authMiddleware = require('@/middlewares/authMiddleware');
const downloadPdf = require('@/handlers/downloadHandler/downloadPdf');

const router = express.Router();

// Middleware applied before the handler
router.route('/:directory/:file').get(authMiddleware, async (req, res) => {
  const { directory, file } = req.params;
  const id = file.slice(directory.length + 1).slice(0, -4);
  downloadPdf(req, res, { directory, id });
});

module.exports = router;
