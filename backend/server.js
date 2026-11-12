const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const shipmentRoutes = require('./routes/shipments');
const trackingRoutes = require('./routes/tracking');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Shipment and Sales Tracking System API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/reports', reportRoutes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ success: false, message: 'Internal server error occurred.' });
});

// Start Server
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Shipment and Sales Tracking System API Server Running `);
      console.log(` URL: http://localhost:${PORT}                           `);
      console.log(` Health: http://localhost:${PORT}/api/health             `);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
