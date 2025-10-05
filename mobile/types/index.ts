export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  defaultQuantity: number;
  defaultPrice: number;
  deliveryDays: number[];
  isActive: boolean;
  notes: string;
  createdAt: string;
}

export interface DailyEntry {
  id: string;
  customerId: string;
  entryDate: string;
  quantity: number;
  productType: string;
  pricePerLiter: number;
  amount: number;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  method: 'cash' | 'mobile' | 'bank';
  reference: string;
  paymentDate: string;
  notes: string;
  createdAt: string;
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

export interface ActivityLog {
  id: string;
  action: 'customer_added' | 'customer_updated' | 'customer_deleted' | 'customer_activated' | 'customer_deactivated' |
          'daily_entry_added' | 'daily_entry_updated' | 'payment_added' | 'payment_deleted' | 'data_exported' | 'data_cleared' |
          'app_opened' | 'report_viewed' | 'history_viewed' | 'data_synced' | 'sync_error' | 'connection_status_changed';
  entityType: 'customer' | 'daily_entry' | 'payment' | 'system' | 'view';
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
  userAgent?: string;
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
