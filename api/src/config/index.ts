import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  
  // Database
  databaseUrl: string;
  
  // JWT Configuration
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  
  // CORS Configuration
  allowedOrigins: string[];
  
  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  
  // Socket.io Configuration
  socket: {
    corsOrigins: string[];
  };
  
  // Logging Configuration
  logging: {
    level: string;
    file: string;
  };
  
  // Security
  security: {
    bcryptRounds: number;
    pinSaltRounds: number;
  };
  
  // Redis Configuration (optional)
  redis?: {
    url: string;
  };
  
  // Email Configuration (optional)
  email?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  
  // App Information
  app: {
    name: string;
    version: string;
    frontendUrl: string;
  };
}

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const config: Config = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  apiPrefix: process.env['API_PREFIX'] || '/api/v1',
  
  databaseUrl: process.env['DATABASE_URL']!,
  
  jwtSecret: process.env['JWT_SECRET']!,
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET']!,
  jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  
  allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:8081'],
  
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  },
  
  socket: {
    corsOrigins: process.env['SOCKET_CORS_ORIGINS']?.split(',') || ['http://localhost:8081'],
  },
  
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
    file: process.env['LOG_FILE'] || 'logs/app.log',
  },
  
  security: {
    bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10),
    pinSaltRounds: parseInt(process.env['PIN_SALT_ROUNDS'] || '10', 10),
  },
  
  app: {
    name: process.env['APP_NAME'] || 'Dudh Wala API',
    version: process.env['APP_VERSION'] || '1.0.0',
    frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:8081',
  },
};

// Optional configurations
if (process.env['REDIS_URL']) {
  config.redis = {
    url: process.env['REDIS_URL'],
  };
}

if (process.env['SMTP_HOST'] && process.env['SMTP_USER'] && process.env['SMTP_PASS']) {
  config.email = {
    host: process.env['SMTP_HOST'],
    port: parseInt(process.env['SMTP_PORT'] || '587', 10),
    user: process.env['SMTP_USER'],
    pass: process.env['SMTP_PASS'],
    from: process.env['SMTP_FROM'] || 'noreply@dhudhwala.com',
  };
}

export default config;