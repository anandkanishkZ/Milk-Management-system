import Constants from 'expo-constants';

export interface EnvironmentConfig {
  apiBaseUrl: string;
  apiVersion: string;
  apiTimeout: number;
  environment: 'development' | 'staging' | 'production';
  enableLogging: boolean;
}

// Get configuration from Expo Constants (recommended approach)
const getConfigFromExpo = (): EnvironmentConfig => {
  const extra = Constants.expoConfig?.extra;
  
  if (!extra) {
    console.warn('⚠️ No extra config found in app.json, using defaults');
    return DEFAULT_CONFIG;
  }

  return {
    apiBaseUrl: extra.apiBaseUrl || 'http://localhost:3000',
    apiVersion: extra.apiVersion || '/api/v1',
    apiTimeout: extra.apiTimeout || 10000,
    environment: extra.environment || 'development',
    enableLogging: extra.enableLogging !== false, // Default to true
  };
};

// Default configuration for development (fallback only)
const DEFAULT_CONFIG: EnvironmentConfig = {
  apiBaseUrl: 'http://localhost:3000',
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
  // Primary: Use app.json extra configuration (recommended)
  const configFromExpo = getConfigFromExpo();
  
  // Validate required configuration
  if (!configFromExpo.apiBaseUrl) {
    console.error('❌ API Base URL not configured in app.json extra');
    throw new Error('API configuration missing');
  }

  // Override with predefined configs if needed (legacy support)
  const environment = configFromExpo.environment;
  let config: EnvironmentConfig;

  switch (environment) {
    case 'production':
      config = { ...PRODUCTION_CONFIG, ...configFromExpo };
      break;
    case 'staging':
      config = { ...STAGING_CONFIG, ...configFromExpo };
      break;
    default:
      config = DEFAULT_CONFIG;
      break;
  }

  // Return the configuration (already merged above)
  return configFromExpo;
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