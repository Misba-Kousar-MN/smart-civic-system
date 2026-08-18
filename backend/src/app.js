const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./errors/apiError');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or if origin in allowed list
      if (!origin || env.CORS_ALLOWED_ORIGINS.includes(origin) || env.CORS_ALLOWED_ORIGINS.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow during local development
      }
    },
    credentials: true
  })
);

// HTTP request logger
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'smart-civic-backend',
      timestamp: new Date().toISOString()
    }
  });
});

// API Routes (version 1)
app.use('/api/v1', apiRoutes);

// Handle 404 for undefined routes
app.use((req, res, next) => {
  next(ApiError.notFound('RESOURCE_NOT_FOUND', `Route '${req.method} ${req.originalUrl}' not found.`));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
