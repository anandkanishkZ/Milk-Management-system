import { Server, Socket } from 'socket.io';
import { AuthService } from '@/services/auth.service';
import { 
  AuthUser, 
  UpdateDailyEntryRequest,
  CreatePaymentRequest,
  UpdateCustomerRequest,
  CustomerBalance
} from '@/types';
import prisma from '@/database/client';
import jwt from 'jsonwebtoken';
import config from '@/config';
import { SocketError, ErrorCode } from '@/utils/errors';

interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

// Enhanced in-memory store for active user sessions with cleanup
class ActiveUserManager {
  private activeUsers = new Map<string, {
    socketId: string;
    userId: string;
    connectedAt: Date;
    lastActivity: Date;
    userType: 'user' | 'admin';
  }>();
  
  private cleanupInterval: NodeJS.Timeout;
  private readonly INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveUsers();
    }, 5 * 60 * 1000);
  }

  addUser(socketId: string, userId: string, userType: 'user' | 'admin'): void {
    // Remove any existing entry for this user
    this.removeUserById(userId);
    
    this.activeUsers.set(socketId, {
      socketId,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      userType
    });
  }

  removeUser(socketId: string): void {
    this.activeUsers.delete(socketId);
  }

  removeUserById(userId: string): void {
    for (const [socketId, userData] of this.activeUsers.entries()) {
      if (userData.userId === userId) {
        this.activeUsers.delete(socketId);
        break;
      }
    }
  }

  updateActivity(socketId: string): void {
    const userData = this.activeUsers.get(socketId);
    if (userData) {
      userData.lastActivity = new Date();
    }
  }

  getUserBySocketId(socketId: string) {
    return this.activeUsers.get(socketId);
  }

  getUserByUserId(userId: string) {
    for (const userData of this.activeUsers.values()) {
      if (userData.userId === userId) {
        return userData;
      }
    }
    return null;
  }

  getActiveUserCount(): number {
    return this.activeUsers.size;
  }

  getActiveUsers(): Array<{ userId: string; socketId: string; connectedAt: Date; lastActivity: Date; userType: string }> {
    return Array.from(this.activeUsers.values());
  }

  private cleanupInactiveUsers(): void {
    const now = new Date();
    const inactiveUsers: string[] = [];

    for (const [socketId, userData] of this.activeUsers.entries()) {
      if (now.getTime() - userData.lastActivity.getTime() > this.INACTIVE_TIMEOUT) {
        inactiveUsers.push(socketId);
      }
    }

    inactiveUsers.forEach(socketId => {
      console.log('🧹 Cleaning up inactive user:', socketId);
      this.activeUsers.delete(socketId);
    });

    if (inactiveUsers.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveUsers.length} inactive users. Active users: ${this.activeUsers.size}`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.activeUsers.clear();
  }
}

const activeUserManager = new ActiveUserManager();

/**
 * Socket authentication middleware
 */
const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token (handle both admin and user tokens)
    let userId: string;
    let tokenType: string;
    let user: any;

    try {
      // Try to decode the token first to check its type
      const decoded = jwt.verify(token, config.jwtSecret as string) as any;
      tokenType = decoded.type;
      userId = decoded.userId;

      if (tokenType === 'admin') {
        // Handle admin token
        user = await prisma.adminUser.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true
          }
        });
        
        if (!user || !user.isActive) {
          return next(new Error('Admin user not found or inactive'));
        }
        
        // Mark as admin user
        user.userType = 'admin';
      } else if (tokenType === 'access') {
        // Handle regular user token
        const { userId: verifiedUserId } = AuthService.verifyAccessToken(token);
        user = await AuthService.getUserById(verifiedUserId);
        
        if (!user) {
          return next(new Error('User not found'));
        }
        
        // Mark as regular user
        user.userType = 'user';
      } else {
        return next(new Error('Invalid token type'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return next(new Error('Invalid authentication token'));
    }
  } catch (error: any) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

/**
 * Log activity through socket events
 */
const logSocketActivity = async (
  userId: string, 
  action: string, 
  entityType: string, 
  description: string,
  metadata?: Record<string, any>
) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action: action as any,
        entityType: entityType as any,
        description,
        metadata: metadata || {},
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('Failed to log socket activity:', error);
  }
};

/**
 * Log activity through socket events (with user type check)
 */
const logUserActivity = async (
  user: any,
  action: string, 
  entityType: string, 
  description: string,
  metadata?: Record<string, any>
) => {
  // Only log activity for regular users, not admin users
  if (user.userType !== 'admin') {
    await logSocketActivity(user.id, action, entityType, description, metadata);
  }
};

/**
 * Get real-time statistics for admin dashboard (system-wide)
 */
const getAdminRealtimeStats = async (): Promise<any> => {
  try {
    // Get system-wide stats (same as dashboard endpoint)
    const [
      totalUsers,
      activeUsers,
      totalCustomers,
      activeCustomers,
      totalVendors,
      totalPayments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.customer.count(),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.user.count({ where: { customers: { some: {} } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, _count: true })
    ]);

    return {
      totalUsers,
      activeUsers,
      totalVendors,
      activeVendors: totalVendors,
      totalCustomers,
      activeCustomers,
      totalRevenue: Number(totalPayments._sum.amount || 0),
      monthlyRevenue: Math.round(Number(totalPayments._sum.amount || 0) * 0.2),
      totalOrders: totalPayments._count || 0,
      averageOrderValue: totalPayments._count > 0 ? Math.round(Number(totalPayments._sum.amount || 0) / totalPayments._count) : 0,
    };
  } catch (error) {
    console.error('Failed to get admin realtime stats:', error);
    return {};
  }
};

/**
 * Get real-time statistics for dashboard (mobile app compatible)
 */
const getRealtimeStats = async (userId: string): Promise<any> => {
  try {
    // Get today's stats using proper date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const [todayEntries, todayPayments, customers, allEntries, allPayments] = await Promise.all([
      prisma.dailyEntry.findMany({
        where: {
          userId,
          entryDate: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        include: { customer: true }
      }),
      prisma.payment.findMany({
        where: {
          userId,
          paymentDate: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      prisma.customer.findMany({
        where: { userId, isActive: true }
      }),
      // Get all entries for balance calculation
      prisma.dailyEntry.findMany({
        where: { userId }
      }),
      // Get all payments for balance calculation  
      prisma.payment.findMany({
        where: { userId }
      })
    ]);

    const todayDeliveries = todayEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);
    const todayRevenue = todayEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const todayCollection = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Calculate total outstanding balance
    const totalDeliveryAmount = allEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const totalPaymentAmount = allPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalBalance = totalDeliveryAmount - totalPaymentAmount;

    // Calculate customers with pending payments
    const customerBalances = new Map<string, number>();
    
    // Add delivery amounts
    allEntries.forEach(entry => {
      const current = customerBalances.get(entry.customerId) || 0;
      customerBalances.set(entry.customerId, current + Number(entry.amount));
    });
    
    // Subtract payment amounts
    allPayments.forEach(payment => {
      const current = customerBalances.get(payment.customerId) || 0;
      customerBalances.set(payment.customerId, current - Number(payment.amount));
    });
    
    const pendingPayments = Array.from(customerBalances.values()).filter(balance => balance > 0).length;

    return {
      totalCustomers: customers.length,
      activeCustomers: customers.length,
      todayDeliveries,              // Mobile compatible field name
      todayRevenue,                 // Mobile compatible field name  
      todayCollection,              // Today's payments collected
      pendingPayments,              // Count of customers with dues
      totalBalance,                 // Total outstanding amount
      lastUpdate: new Date()
    };
  } catch (error) {
    console.error('Failed to get realtime stats:', error);
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      todayDeliveries: 0,
      todayRevenue: 0,
      pendingPayments: 0,
      totalBalance: 0,
      lastUpdate: new Date()
    };
  }
};

/**
 * Setup Socket.io handlers with full business logic
 */
export const setupSocketHandlers = (io: Server) => {
  console.log('🔌 Setting up Socket.io handlers...');

  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const user = socket.user;
    console.log(`👤 User ${user.name || user.email} connected (${socket.id})`);

    // Store active user session
    activeUserManager.addUser(socket.id, user.id, user.userType || 'user');

    // Join user-specific room for private updates
    socket.join(`user:${user.id}`);

    // Log connection activity
    await logUserActivity(
      user,
      'CONNECTION_ESTABLISHED',
      'SYSTEM',
      'User connected via WebSocket'
    );

    // Send initial real-time stats
    try {
      const initialStats = user.userType === 'admin' 
        ? await getAdminRealtimeStats() 
        : await getRealtimeStats(user.id);
      
      console.log(`📊 Sending initial stats to ${user.userType} ${user.email}:`, Object.keys(initialStats));
      socket.emit('stats:updated', initialStats);
    } catch (error) {
      console.error('Failed to send initial stats:', error);
    }

    // Handle delivery updates
    socket.on('delivery:update', async (data: UpdateDailyEntryRequest & { id: string }) => {
      try {
        // Update user activity
        activeUserManager.updateActivity(socket.id);
        const { id, ...updateData } = data;

        // Update delivery entry
        const updateFields: any = {
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date()
        };
        
        if (updateData.quantity !== undefined) updateFields.quantity = updateData.quantity;
        if (updateData.pricePerLiter !== undefined) updateFields.pricePerLiter = updateData.pricePerLiter;
        if (updateData.productType !== undefined) updateFields.productType = updateData.productType;
        if (updateData.notes !== undefined) updateFields.notes = updateData.notes;
        if (updateData.entryDate !== undefined) updateFields.entryDate = updateData.entryDate;
        
        if (updateData.quantity && updateData.pricePerLiter) {
          updateFields.amount = updateData.quantity * updateData.pricePerLiter;
        }
        
        const updatedEntry = await prisma.dailyEntry.update({
          where: { id, userId: user.id },
          data: updateFields,
          include: { customer: true }
        });

        // Log activity
        await logUserActivity(
          user,
          'DAILY_ENTRY_UPDATED',
          'DAILY_ENTRY',
          `Updated delivery for ${updatedEntry.customer?.name}: ${Number(updatedEntry.quantity)}L`,
          { entryId: id, customerId: updatedEntry.customerId }
        );

        // Broadcast to user's devices
        io.to(`user:${user.id}`).emit('delivery:updated', updatedEntry);

        // Send updated stats
        const stats = user.userType === 'admin' 
          ? await getAdminRealtimeStats() 
          : await getRealtimeStats(user.id);
        io.to(`user:${user.id}`).emit('stats:updated', stats);

        console.log(`� Delivery updated for user ${user.email}: ${updatedEntry.customer?.name}`);

      } catch (error: any) {
        const socketError = new SocketError(
          'Failed to update delivery',
          ErrorCode.DELIVERY_UPDATE_ERROR,
          { originalError: error.message, data }
        );
        console.error('Delivery update error:', socketError);
        socket.emit('error', { 
          message: socketError.message, 
          code: socketError.code,
          details: socketError.details 
        });
      }
    });

    // Handle payment additions
    socket.on('payment:add', async (data: CreatePaymentRequest) => {
      try {
        // Update user activity
        activeUserManager.updateActivity(socket.id);
        // Create payment
        const payment = await prisma.payment.create({
          data: {
            ...data,
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: { customer: true }
        });

        // Log activity
        await logUserActivity(
          user,
          'PAYMENT_ADDED',
          'PAYMENT',
          `Payment received from ${payment.customer?.name}: ₹${payment.amount}`,
          { paymentId: payment.id, customerId: payment.customerId }
        );

        // Calculate updated balance
        const [totalBilled, totalPaid] = await Promise.all([
          prisma.dailyEntry.aggregate({
            where: { userId: user.id, customerId: payment.customerId },
            _sum: { amount: true }
          }),
          prisma.payment.aggregate({
            where: { userId: user.id, customerId: payment.customerId },
            _sum: { amount: true }
          })
        ]);

        const billedAmount = Number(totalBilled._sum.amount) || 0;
        const paidAmount = Number(totalPaid._sum.amount) || 0;
        
        const balance: CustomerBalance = {
          customerId: payment.customerId,
          totalBilled: billedAmount,
          totalPaid: paidAmount,
          balance: billedAmount - paidAmount
        };

        // Broadcast to user's devices
        io.to(`user:${user.id}`).emit('payment:added', payment);
        io.to(`user:${user.id}`).emit('balance:updated', balance);

        // Send updated stats
        const stats = user.userType === 'admin' 
          ? await getAdminRealtimeStats() 
          : await getRealtimeStats(user.id);
        io.to(`user:${user.id}`).emit('stats:updated', stats);

        console.log(`💰 Payment added for user ${user.email}: ${payment.customer?.name} - ₹${payment.amount}`);

      } catch (error: any) {
        const socketError = new SocketError(
          'Failed to add payment',
          ErrorCode.PAYMENT_ADD_ERROR,
          { originalError: error.message, data }
        );
        console.error('Payment addition error:', socketError);
        socket.emit('error', { 
          message: socketError.message, 
          code: socketError.code,
          details: socketError.details 
        });
      }
    });

    // Handle customer updates
    socket.on('customer:update', async (data: UpdateCustomerRequest & { id: string }) => {
      try {
        const { id, ...updateData } = data;

        // Update customer
        const updatedCustomer = await prisma.customer.update({
          where: { id, userId: user.id },
          data: {
            ...updateData,
            updatedAt: new Date()
          }
        });

        // Log activity
        await logUserActivity(
          user,
          'CUSTOMER_UPDATED',
          'CUSTOMER',
          `Customer updated: ${updatedCustomer.name}`,
          { customerId: id }
        );

        // Broadcast to user's devices
        io.to(`user:${user.id}`).emit('customer:updated', updatedCustomer);

        console.log(`👥 Customer updated for user ${user.email}: ${updatedCustomer.name}`);

      } catch (error: any) {
        console.error('Customer update error:', error);
        socket.emit('error', { message: 'Failed to update customer', code: 'CUSTOMER_UPDATE_ERROR' });
      }
    });

    // Handle real-time stats requests with rate limiting
    let lastStatsRequest = 0;
    socket.on('stats:request', async () => {
      const now = Date.now();
      
      // Rate limit: max 1 stats request per 3 seconds per user
      if (now - lastStatsRequest < 3000) {
        console.log(`⏰ Stats request throttled for ${user.email} (too frequent)`);
        return;
      }
      
      try {
        lastStatsRequest = now;
        console.log(`📊 Stats requested by ${user.userType} user: ${user.email}`);
        const stats = user.userType === 'admin' 
          ? await getAdminRealtimeStats() 
          : await getRealtimeStats(user.id);
        
        console.log(`📊 Sending stats to ${user.email}:`, Object.keys(stats));
        socket.emit('stats:updated', stats);
      } catch (error: any) {
        console.error('Stats request error:', error);
        socket.emit('error', { message: 'Failed to get statistics', code: 'STATS_ERROR' });
      }
    });

    // Handle activity log requests
    socket.on('activity:request', async (limit: number = 10) => {
      try {
        const activities = await prisma.activityLog.findMany({
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          take: Math.min(limit, 50) // Limit to prevent abuse
        });

        socket.emit('activity:updated', activities);
      } catch (error: any) {
        console.error('Activity request error:', error);
        socket.emit('error', { message: 'Failed to get activities', code: 'ACTIVITY_ERROR' });
      }
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      // Update user activity
      activeUserManager.updateActivity(socket.id);
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`👤 User ${user.name || user.email} disconnected (${socket.id}): ${reason}`);
      
      // Remove from active users
      activeUserManager.removeUser(socket.id);

      // Log disconnection activity
      await logUserActivity(
        user,
        'CONNECTION_CLOSED',
        'SYSTEM',
        `User disconnected via WebSocket: ${reason}`
      );
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${user.email}:`, error);
    });
  });

  // Handle connection errors
  io.on('error', (error) => {
    console.error('Socket.io server error:', error);
  });

  console.log('✅ Socket.io handlers setup complete');
};

// Note: Utility functions for broadcasting are available within the socket handlers
// For external broadcasting, pass the io instance to where it's needed

/**
 * Get active users count
 */
export const getActiveUsersCount = (): number => {
  return activeUserManager.getActiveUserCount();
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId: string): boolean => {
  return activeUserManager.getUserByUserId(userId) !== null;
};

/**
 * Cleanup socket resources (call on app shutdown)
 */
export const cleanupSocketResources = (): void => {
  activeUserManager.destroy();
};

/**
 * Export admin stats function for use in other modules
 */
export { getAdminRealtimeStats };