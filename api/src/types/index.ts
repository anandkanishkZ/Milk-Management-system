// Shared types across frontend and backend
export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  preferences?: Record<string, any>;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

// Authentication types
export interface AuthUser extends User {
  password?: never; // Never expose password in API responses
  userType?: 'admin' | 'user'; // Type of user for socket handling
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  phone?: string | undefined;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  defaultQuantity: number;
  defaultPrice: number;
  deliveryDays: number[];
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyEntry {
  id: string;
  userId: string;
  customerId: string;
  entryDate: string;
  quantity: number;
  productType: string;
  pricePerLiter: number;
  amount: number;
  notes?: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
}

export interface Payment {
  id: string;
  userId: string;
  customerId: string;
  amount: number;
  method: 'CASH' | 'MOBILE' | 'BANK';
  reference?: string;
  paymentDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface CustomerBalance {
  customerId: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
}

export interface CustomerHistoryDay {
  date: string;
  entry: DailyEntry | null;
  wasScheduled: boolean;
  dayName: string;
  status: 'delivered' | 'skipped' | 'not-scheduled';
}

export interface CustomerHistoryStats {
  totalDays: number;
  deliveredDays: number;
  skippedDays: number;
  deliveryRate: number;
  totalLiters: number;
  totalAmount: number;
  averageQuantity: number;
}

export interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  weekActivities: number;
  monthActivities: number;
  mostActiveDay: string;
  activityByType: Record<string, number>;
  recentActivities: ActivityLog[];
}

export interface ReportStats {
  period: 'today' | 'week' | 'month';
  totalLiters: number;
  totalSales: number;
  totalCollection: number;
  activeCustomers: number;
  totalOutstanding: number;
  customersWithDues: number;
  customerStats: CustomerStat[];
  paymentMethods: {
    cash: number;
    mobile: number;
    bank: number;
  };
}

export interface CustomerStat {
  customer: Customer;
  liters: number;
  sales: number;
  balance: number;
}

export interface SecurityPin {
  id: string;
  userId: string;
  attempts: number;
  lastAttempt?: string;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

// Enums
export type ActivityAction = 
  | 'CUSTOMER_ADDED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_DELETED'
  | 'CUSTOMER_ACTIVATED'
  | 'CUSTOMER_DEACTIVATED'
  | 'DAILY_ENTRY_ADDED'
  | 'DAILY_ENTRY_UPDATED'
  | 'DAILY_ENTRY_DELETED'
  | 'PAYMENT_ADDED'
  | 'PAYMENT_DELETED'
  | 'DATA_EXPORTED'
  | 'DATA_CLEARED'
  | 'APP_OPENED'
  | 'REPORT_VIEWED'
  | 'HISTORY_VIEWED'
  | 'DATA_SYNCED'
  | 'SYNC_ERROR'
  | 'CONNECTION_STATUS_CHANGED'
  | 'SECURITY_PIN_CREATED'
  | 'SECURITY_PIN_CHANGED'
  | 'SECURITY_PIN_VERIFIED'
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE';

export type ActivityEntity = 
  | 'CUSTOMER'
  | 'DAILY_ENTRY' 
  | 'PAYMENT'
  | 'SYSTEM'
  | 'VIEW'
  | 'SECURITY'
  | 'AUTH';

export type PaymentMethod = 'CASH' | 'MOBILE' | 'BANK';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Request types
export interface CreateCustomerRequest {
  name: string;
  phone: string;
  address: string;
  defaultQuantity: number;
  defaultPrice: number;
  deliveryDays: number[];
  notes?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  isActive?: boolean;
}

export interface CreateDailyEntryRequest {
  customerId: string;
  entryDate: string;
  quantity: number;
  productType?: string;
  pricePerLiter: number;
  notes?: string;
}

export interface UpdateDailyEntryRequest extends Partial<CreateDailyEntryRequest> {}

export interface CreatePaymentRequest {
  customerId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paymentDate: string;
  notes?: string;
}

export interface SecurityPinRequest {
  pin: string;
  currentPin?: string; // For changing PIN
}

// Socket.io Events
export interface SocketEvents {
  // Client to Server
  'delivery:update': (data: UpdateDailyEntryRequest & { id: string }) => void;
  'payment:add': (data: CreatePaymentRequest) => void;
  'customer:update': (data: UpdateCustomerRequest & { id: string }) => void;
  
  // Server to Client
  'delivery:updated': (data: DailyEntry) => void;
  'payment:added': (data: Payment) => void;
  'customer:updated': (data: Customer) => void;
  'stats:updated': (data: ReportStats) => void;
  'balance:updated': (data: CustomerBalance) => void;
  'error': (data: { message: string; code?: string }) => void;
}

// Express Request extensions
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      pagination?: {
        page: number;
        limit: number;
        skip: number;
      };
    }
  }
}