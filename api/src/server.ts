import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import config from './config/index';
// import logger from './utils/logger';
import prisma from './database/client';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import dailyEntryRoutes from './routes/dailyEntries';
import paymentRoutes from './routes/payments';
import reportRoutes from './routes/reports';
import activityLogRoutes from './routes/activityLogs';
import securityPinRoutes from './routes/securityPins';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import { authenticate } from './middleware/auth';

// Import socket handlers
import { setupSocketHandlers } from './sockets/index';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: config.socket.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", ...config.allowedOrigins],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Dudh Wala API is running!',
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.nodeEnv
  });
});

// Public auth routes (no authentication required)
app.use(`${config.apiPrefix}/auth`, authRoutes);

// API routes with authentication
app.use(`${config.apiPrefix}/users`, authenticate, userRoutes);
app.use(`${config.apiPrefix}/customers`, authenticate, customerRoutes);
app.use(`${config.apiPrefix}/daily-entries`, authenticate, dailyEntryRoutes);
app.use(`${config.apiPrefix}/payments`, authenticate, paymentRoutes);
app.use(`${config.apiPrefix}/reports`, authenticate, reportRoutes);
app.use(`${config.apiPrefix}/activity-logs`, authenticate, activityLogRoutes);
app.use(`${config.apiPrefix}/security-pins`, authenticate, securityPinRoutes);

// Setup Socket.io handlers
setupSocketHandlers(io);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('📡 HTTP server closed');
  });
  
  // Close Socket.io server
  io.close(() => {
    console.log('🔌 Socket.io server closed');
  });
  
  // Close database connection
  await prisma.$disconnect();
  console.log('🗄️ Database disconnected');
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('🗄️ Database connected successfully');
    
    httpServer.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📡 API available at: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`📱 Mobile API available at: http://192.168.1.119:${config.port}${config.apiPrefix}`);
      console.log(`🔌 Socket.io server ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Export for testing
export { app, io };

// Start server if not in test environment
if (process.env['NODE_ENV'] !== 'test') {
  startServer();
}