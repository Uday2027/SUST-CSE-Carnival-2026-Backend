import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './common/middleware/error.middleware.js';

const app: Express = express();

// Global Middleware
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Root Route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to SUST CSE Carnival 2026 API',
    version: '1.0.0'
  });
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler (must be last)
app.use(errorHandler);

export default app;
