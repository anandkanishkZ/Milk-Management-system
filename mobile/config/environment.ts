import Constants from 'expo-constants';

export interface EnvironmentConfig {
  apiBaseUrl: string;
  apiVersion: string;
  apiTimeout: number;
  environment: 'development' | 'staging' | 'production';
  enableLogging: boolean;
}

// Default configuration for development
const DEFAULT_CONFIG: EnvironmentConfig = {
  apiBaseUrl: 'http://192.168.1.119:3000',
  apiVersion: '/api/v1',
  apiTimeout: 10000,
  environment: 'development',
  enableLogging: true,
};

// Production configuration
const PRODUCTION_CONFIG: EnvironmentConfig = {
  apiBaseUrl: 'https://your-production-api.com',
  apiVersion: '/api/v1',
  apiTimeout: 15000,
  environment: 'production',
  enableLogging: false,
};

// Staging configuration
const STAGING_CONFIG: EnvironmentConfig = {
  apiBaseUrl: 'https://your-staging-api.com',
  apiVersion: '/api/v1',
  apiTimeout: 12000,
  environment: 'staging',
  enableLogging: true,
};

// Get configuration based on environment
function getEnvironmentConfig(): EnvironmentConfig {
  const extra = Constants.expoConfig?.extra;
  const environment = extra?.environment || 'development';

  let config: EnvironmentConfig;

  switch (environment) {
    case 'production':
      config = PRODUCTION_CONFIG;
      break;
    case 'staging':
      config = STAGING_CONFIG;
      break;
    default:
      config = DEFAULT_CONFIG;
      break;
  }

  // Override with values from app.json if available
  return {
    ...config,
    apiBaseUrl: extra?.apiBaseUrl || config.apiBaseUrl,
    apiVersion: extra?.apiVersion || config.apiVersion,
    apiTimeout: extra?.apiTimeout || config.apiTimeout,
    environment: extra?.environment || config.environment,
    enableLogging: extra?.enableLogging ?? config.enableLogging,
  };
}

export const ENV = getEnvironmentConfig();

// Debug logging for environment configuration
console.log('🔧 Environment Configuration Loaded:');
console.log('📡 API Base URL:', ENV.apiBaseUrl);
console.log('🌍 Environment:', ENV.environment);
console.log('📊 Enable Logging:', ENV.enableLogging);

// Helper functions
export const isProduction = () => ENV.environment === 'production';
export const isDevelopment = () => ENV.environment === 'development';
export const isStaging = () => ENV.environment === 'staging';

// API URL helper
export const getApiUrl = (endpoint: string = '') => {
  return `${ENV.apiBaseUrl}${ENV.apiVersion}${endpoint}`;
};

// Logging helper
export const log = (...args: any[]) => {
  if (ENV.enableLogging) {
    console.log(...args);
  }
};

export const logError = (...args: any[]) => {
  if (ENV.enableLogging) {
    console.error(...args);
  }
};