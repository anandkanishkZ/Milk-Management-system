/**
 * Firebase Quota Monitor
 * Helps track and manage Firebase usage during quota exceeded situations
 */

export interface QuotaStatus {
  isExceeded: boolean;
  operationsCount: number;
  lastReset: string;
  emergencyMode: boolean;
}

class FirebaseQuotaMonitor {
  private operationsCount = 0;
  private lastReset = new Date().toDateString();
  private emergencyMode = true; // Start in emergency mode

  /**
   * Check if we should perform a Firebase operation
   */
  canPerformOperation(operationType: 'read' | 'write' | 'critical'): boolean {
    // Always allow critical operations
    if (operationType === 'critical') {
      return true;
    }

    // In emergency mode, limit non-critical operations
    if (this.emergencyMode) {
      // Allow only 10 reads/writes per hour in emergency mode
      const hourlyLimit = operationType === 'read' ? 5 : 10;
      const currentHour = new Date().getHours();
      const hourKey = `${new Date().toDateString()}-${currentHour}`;
      
      // Simple hour-based limiting (in production, use more sophisticated tracking)
      if (this.operationsCount > hourlyLimit) {
        console.warn(`🚨 Quota Monitor: ${operationType} operation blocked - hourly limit reached`);
        return false;
      }
    }

    return true;
  }

  /**
   * Track a Firebase operation
   */
  trackOperation(operationType: 'read' | 'write' | 'critical'): void {
    this.operationsCount++;
    console.log(`📊 Quota Monitor: ${operationType} operation #${this.operationsCount}`);
  }

  /**
   * Handle quota exceeded error
   */
  handleQuotaExceeded(): void {
    console.error('🚨 Firebase quota exceeded - enabling emergency mode');
    this.emergencyMode = true;
    this.operationsCount = 999; // Block further operations
  }

  /**
   * Get current quota status
   */
  getStatus(): QuotaStatus {
    return {
      isExceeded: this.emergencyMode && this.operationsCount > 50,
      operationsCount: this.operationsCount,
      lastReset: this.lastReset,
      emergencyMode: this.emergencyMode
    };
  }

  /**
   * Reset for new day (call this once per day)
   */
  resetDaily(): void {
    const today = new Date().toDateString();
    if (this.lastReset !== today) {
      this.operationsCount = 0;
      this.lastReset = today;
      console.log('🔄 Quota Monitor: Daily reset completed');
    }
  }

  /**
   * Disable emergency mode (when quota is restored)
   */
  disableEmergencyMode(): void {
    this.emergencyMode = false;
    this.operationsCount = 0;
    console.log('✅ Quota Monitor: Emergency mode disabled - normal operations resumed');
  }
}

export const quotaMonitor = new FirebaseQuotaMonitor();

/**
 * Wrapper for Firebase operations with quota monitoring
 */
export async function withQuotaCheck<T>(
  operation: () => Promise<T>,
  operationType: 'read' | 'write' | 'critical' = 'write'
): Promise<T | null> {
  if (!quotaMonitor.canPerformOperation(operationType)) {
    console.warn(`🚨 Operation blocked by quota monitor: ${operationType}`);
    return null;
  }

  try {
    quotaMonitor.trackOperation(operationType);
    const result = await operation();
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('resource-exhausted')) {
      quotaMonitor.handleQuotaExceeded();
      console.error('🚨 Firebase quota exceeded during operation');
    }
    throw error;
  }
}

/**
 * Get user-friendly quota status message
 */
export function getQuotaStatusMessage(): string {
  const status = quotaMonitor.getStatus();
  
  if (status.isExceeded) {
    return '🚨 Firebase quota exceeded. Please upgrade to Blaze plan or wait 24 hours for reset.';
  }
  
  if (status.emergencyMode) {
    return `⚠️ Running in emergency mode. ${status.operationsCount} operations used.`;
  }
  
  return `✅ Normal operation. ${status.operationsCount} operations used today.`;
}