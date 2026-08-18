const ApiError = require('../errors/apiError');
const env = require('../config/env');

function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal error occurred.';
  let fields = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    fields = err.fields;
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'VALIDATION_FILE_TOO_LARGE';
      message = 'Uploaded file exceeds the maximum allowed size (10MB).';
    } else {
      errorCode = 'VALIDATION_INVALID_FORMAT';
      message = err.message;
    }
  } else {
    // Log unexpected internal errors at error level
    console.error(`[ERROR] Unhandled Exception on ${req.method} ${req.originalUrl}:`, err);
    if (env.NODE_ENV === 'development') {
      message = err.message || message;
    }
  }

  const errorResponse = {
    code: errorCode,
    message: message
  };

  if (fields && Object.keys(fields).length > 0) {
    errorResponse.fields = fields;
  }

  return res.status(statusCode).json({
    success: false,
    error: errorResponse
  });
}

module.exports = errorHandler;
