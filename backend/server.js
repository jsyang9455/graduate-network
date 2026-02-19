const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const jobRoutes = require('./routes/jobs');
const networkingRoutes = require('./routes/networking');
const counselingRoutes = require('./routes/counseling');
const certificateRoutes = require('./routes/certificates');
const postRoutes = require('./routes/posts');
const majorRoutes = require('./routes/majors');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/networking', networkingRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/majors', majorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Graduate Network API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Graduate Network API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      jobs: '/api/jobs',
      networking: '/api/networking',
      counseling: '/api/counseling',
      certificates: '/api/certificates',
      posts: '/api/posts'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});

module.exports = app;
