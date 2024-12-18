const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { slugify } = require('transliteration');
const fileFilter = require('./utils/LocalfileFilter');

// Utility function to ensure the directory exists
const ensureDirExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Directory created: ${dirPath}`);
    }
  } catch (error) {
    console.error('Error creating directory:', error);
  }
};

// Main upload middleware function
const singleStorageUpload = ({
  entity,
  fileType = 'default',
  uploadFieldName = 'file',
  fieldName = 'file',
}) => {
  const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      try {
        const adminId = req.user?.id?.toString();
        if (!adminId) {
          return cb(new Error('Admin ID is missing from the request.'));
        }

        const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', entity, adminId);
        ensureDirExists(uploadDir);

        console.log(`[UPLOAD] Directory set: ${uploadDir}`);
        cb(null, uploadDir);
      } catch (error) {
        console.error('Error setting upload directory:', error);
        cb(error);
      }
    },
    filename: function (req, file, cb) {
      try {
        const fileExtension = path.extname(file.originalname);
        const uniqueFileID = Math.random().toString(36).slice(2, 7);
        const originalName = req.body.seotitle
          ? slugify(req.body.seotitle.toLowerCase())
          : slugify(file.originalname.split('.')[0].toLowerCase());
        const _fileName = `${originalName}-${uniqueFileID}${fileExtension}`;

        const adminId = req.user?.id?.toString();
        const filePath = path.join(
          __dirname,
          '..',
          '..',
          'public',
          'uploads',
          entity,
          adminId,
          _fileName
        );

        console.log(`[UPLOAD] File path set: ${filePath}`);

        req.upload = { fileName: _fileName, filePath, fileType, fieldName };
        req.body[fieldName] = filePath;

        cb(null, _fileName);
      } catch (error) {
        console.error('Error setting file name:', error);
        cb(error);
      }
    },
  });

  const filterType = fileFilter(fileType);

  return multer({ storage: diskStorage, fileFilter: filterType }).single(uploadFieldName);
};

module.exports = singleStorageUpload;
