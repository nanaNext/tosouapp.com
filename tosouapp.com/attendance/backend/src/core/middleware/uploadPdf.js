const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../../config/env');

const storage = multer.memoryStorage();

const uploadPdf = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file PDF!'), false);
    }
  }
});

module.exports = uploadPdf;
