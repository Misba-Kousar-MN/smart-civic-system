class ApiError extends Error {
  constructor(statusCode, errorCode, message, fields = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.fields = fields;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(errorCode, message, fields = null) {
    return new ApiError(400, errorCode || 'VALIDATION_REQUIRED_FIELD', message, fields);
  }

  static unauthorized(errorCode, message) {
    return new ApiError(401, errorCode || 'AUTH_TOKEN_INVALID', message);
  }

  static forbidden(errorCode, message) {
    return new ApiError(403, errorCode || 'AUTH_INSUFFICIENT_ROLE', message);
  }

  static notFound(errorCode, message) {
    return new ApiError(404, errorCode || 'RESOURCE_NOT_FOUND', message);
  }

  static conflict(errorCode, message) {
    return new ApiError(409, errorCode || 'DB_CONFLICT', message);
  }

  static unprocessable(errorCode, message) {
    return new ApiError(422, errorCode || 'BUSINESS_RULE_VIOLATION', message);
  }

  static internal(errorCode, message) {
    return new ApiError(500, errorCode || 'INTERNAL_SERVER_ERROR', message);
  }

  static serviceUnavailable(errorCode, message) {
    return new ApiError(503, errorCode || 'SERVICE_UNAVAILABLE', message);
  }
}

module.exports = ApiError;
