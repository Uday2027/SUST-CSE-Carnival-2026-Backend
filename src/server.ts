import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import routes
import adminRoutes from './modules/admin/admin.routes.js';
import teamRoutes from './modules/team/team.routes.js';
import emailRoutes from './modules/email/email.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import pdfRoutes from './modules/pdf/pdf.routes.js';

// Import middleware
import { errorHandler } from './common/middleware/error.middleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/download', pdfRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 SUST CSE Carnival Backend Server                ║
║                                                       ║
║   Port: ${PORT}                                         ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║   Database: Connected to PostgreSQL                  ║
║                                                       ║
║   API Endpoints:                                      ║
║   - Health: GET /health                               ║
║   - Admin: /api/admin                                 ║
║   - Teams: /api/teams                                 ║
║   - Email: /api/email                                 ║
║   - Payment: /api/payment                             ║
║   - PDF: /api/download                                ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
