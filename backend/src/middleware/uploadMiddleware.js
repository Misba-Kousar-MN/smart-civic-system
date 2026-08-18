const multer = require('multer');
const ApiError = require('../errors/apiError');

// Store files in memory buffer for streaming to Supabase Storage / ML service
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/webm',
    'audio/ogg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        'VALIDATION_UNSUPPORTED_FILE_TYPE',
        `Unsupported file type '${file.mimetype}'. Allowed: JPEG, PNG, WebP, MP3, WAV, WebM, OGG.`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB file size limit
  },
  fileFilter: fileFilter
});

const reportUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'voice_note', maxCount: 1 }
]);

const resolutionUpload = upload.fields([
  { name: 'before_image', maxCount: 1 },
  { name: 'after_image', maxCount: 1 }
]);

module.exports = {
  upload,
  reportUpload,
  resolutionUpload
};
