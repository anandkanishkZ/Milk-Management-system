import { z } from 'zod';

// Authentication validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  preferences: z.record(z.any()).optional(),
  timezone: z.string().optional(),
});

// Customer validation schemas
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255, 'Name too long'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long'),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  defaultQuantity: z.number().positive('Default quantity must be positive').max(100, 'Quantity too large'),
  defaultPrice: z.number().positive('Default price must be positive').max(10000, 'Price too large'),
  deliveryDays: z.array(z.number().int().min(0).max(6)).min(1, 'At least one delivery day required'),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

export const updateCustomerSchema = createCustomerSchema.extend({
  name: z.string().min(1, 'Customer name is required').max(255, 'Name too long').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long').optional(),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long').optional(),
  defaultQuantity: z.number().positive('Default quantity must be positive').max(100, 'Quantity too large').optional(),
  defaultPrice: z.number().positive('Default price must be positive').max(10000, 'Price too large').optional(),
  deliveryDays: z.array(z.number().int().min(0).max(6)).min(1, 'At least one delivery day required').optional(),
  isActive: z.boolean().optional(),
});

// Daily Entry validation schemas
const baseDailyEntrySchema = z.object({
  customerId: z.string().cuid('Invalid customer ID'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  quantity: z.number().positive('Quantity must be positive').max(100, 'Quantity too large'),
  productType: z.string().max(100, 'Product type too long').default('milk'),
  pricePerLiter: z.number().positive('Price per liter must be positive').max(10000, 'Price too large'),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

export const createDailyEntrySchema = baseDailyEntrySchema.refine((data) => {
  const entryDate = new Date(data.entryDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return entryDate <= today;
}, {
  message: 'Entry date cannot be in the future',
  path: ['entryDate'],
});

export const updateDailyEntrySchema = z.object({
  customerId: z.string().cuid('Invalid customer ID').optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  quantity: z.number().positive('Quantity must be positive').max(100, 'Quantity too large').optional(),
  productType: z.string().max(100, 'Product type too long').optional(),
  pricePerLiter: z.number().positive('Price per liter must be positive').max(10000, 'Price too large').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

// Payment validation schemas
export const createPaymentSchema = z.object({
  customerId: z.string().cuid('Invalid customer ID'),
  amount: z.number().positive('Payment amount must be positive').max(1000000, 'Amount too large'),
  method: z.enum(['CASH', 'MOBILE', 'BANK'], {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
  reference: z.string().max(255, 'Reference too long').optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

// Activity Log validation schemas
export const createActivityLogSchema = z.object({
  action: z.enum([
    'CUSTOMER_ADDED', 'CUSTOMER_UPDATED', 'CUSTOMER_DELETED', 'CUSTOMER_ACTIVATED', 'CUSTOMER_DEACTIVATED',
    'DAILY_ENTRY_ADDED', 'DAILY_ENTRY_UPDATED', 'DAILY_ENTRY_DELETED',
    'PAYMENT_ADDED', 'PAYMENT_DELETED',
    'DATA_EXPORTED', 'DATA_CLEARED',
    'APP_OPENED', 'REPORT_VIEWED', 'HISTORY_VIEWED',
    'DATA_SYNCED', 'SYNC_ERROR', 'CONNECTION_STATUS_CHANGED',
    'SECURITY_PIN_CREATED', 'SECURITY_PIN_CHANGED', 'SECURITY_PIN_VERIFIED',
    'AUTH_SUCCESS', 'AUTH_FAILURE'
  ]),
  entityType: z.enum(['CUSTOMER', 'DAILY_ENTRY', 'PAYMENT', 'SYSTEM', 'VIEW', 'SECURITY', 'AUTH']),
  entityId: z.string().optional(),
  entityName: z.string().max(255, 'Entity name too long').optional(),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  metadata: z.record(z.any()).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500, 'User agent too long').optional(),
});

// Security PIN validation schemas
export const createSecurityPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export const changeSecurityPinSchema = z.object({
  currentPin: z.string().regex(/^\d{4}$/, 'Current PIN must be exactly 4 digits'),
  newPin: z.string().regex(/^\d{4}$/, 'New PIN must be exactly 4 digits'),
});

export const verifySecurityPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid from date format (YYYY-MM-DD)').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid to date format (YYYY-MM-DD)').optional(),
}).refine((data) => {
  if (data.from && data.to) {
    return new Date(data.from) <= new Date(data.to);
  }
  return true;
}, {
  message: 'From date must be before or equal to to date',
  path: ['from'],
});

export const reportPeriodSchema = z.object({
  period: z.enum(['today', 'week', 'month']).default('today'),
});

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

// Export all schemas as a combined object
export const schemas = {
  // Authentication schemas
  register: registerSchema,
  login: loginSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  updateUser: updateUserSchema,
  
  // Customer schemas
  createCustomer: createCustomerSchema,
  updateCustomer: updateCustomerSchema,
  
  // Daily Entry schemas
  createDailyEntry: createDailyEntrySchema,
  updateDailyEntry: updateDailyEntrySchema,
  
  // Payment schemas
  createPayment: createPaymentSchema,
  
  // Activity Log schemas
  createActivityLog: createActivityLogSchema,
  
  // Security PIN schemas
  createSecurityPin: createSecurityPinSchema,
  changeSecurityPin: changeSecurityPinSchema,
  verifySecurityPin: verifySecurityPinSchema,
  
  // Query schemas
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  reportPeriod: reportPeriodSchema,
  idParam: idParamSchema,
};