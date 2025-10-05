import { Server, Socket } from 'socket.io';
import { AuthService } from '@/services/auth.service';
import { 
  AuthUser, 
  UpdateDailyEntryRequest,
  CreatePaymentRequest,
  UpdateCustomerRequest,
  ReportStats,
  CustomerBalance
} from '@/types';
import prisma from '@/database/client';

interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

// In-memory store for active user sessions
const activeUsers = new Map<string, string>(); // userId -> socketId

/**
 * Socket authentication middleware
 */
const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const { userId } = AuthService.verifyAccessToken(token);
    
    // Get user details
    const user = await AuthService.getUserById(userId);
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (error: any) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
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
 * Get real-time statistics for dashboard
 */
const getRealtimeStats = async (userId: string): Promise<Partial<ReportStats>> => {
  try {
    // Get today's stats
    const today = new Date().toISOString().split('T')[0];
    
    const [todayEntries, todayPayments, customers] = await Promise.all([
      prisma.dailyEntry.findMany({
        where: {
          userId,
          entryDate: today
        },
        include: { customer: true }
      }),
      prisma.payment.findMany({
        where: {
          userId,
          paymentDate: today
        }
      }),
      prisma.customer.findMany({
        where: { userId, isActive: true }
      })
    ]);

    const totalLiters = todayEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);
    const totalSales = todayEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const totalCollection = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      period: 'today',
      totalLiters,
      totalSales,
      totalCollection,
      activeCustomers: customers.length
    };
  } catch (error) {
    console.error('Failed to get realtime stats:', error);
    return {};
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
    activeUsers.set(user.id, socket.id);

    // Join user-specific room for private updates
    socket.join(`user:${user.id}`);

    // Log connection activity
    await logSocketActivity(
      user.id,
      'CONNECTION_ESTABLISHED',
      'SYSTEM',
      'User connected via WebSocket'
    );

    // Send initial real-time stats
    const initialStats = await getRealtimeStats(user.id);
    socket.emit('stats:updated', initialStats);

    // Handle delivery updates
    socket.on('delivery:update', async (data: UpdateDailyEntryRequest & { id: string }) => {
      try {
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
        await logSocketActivity(
          user.id,
          'DAILY_ENTRY_UPDATED',
          'DAILY_ENTRY',
          `Updated delivery for ${updatedEntry.customer?.name}: ${Number(updatedEntry.quantity)}L`,
          { entryId: id, customerId: updatedEntry.customerId }
        );

        // Broadcast to user's devices
        io.to(`user:${user.id}`).emit('delivery:updated', updatedEntry);

        // Send updated stats
        const stats = await getRealtimeStats(user.id);
        io.to(`user:${user.id}`).emit('stats:updated', stats);

        console.log(`� Delivery updated for user ${user.email}: ${updatedEntry.customer?.name}`);

      } catch (error: any) {
        console.error('Delivery update error:', error);
        socket.emit('error', { message: 'Failed to update delivery', code: 'DELIVERY_UPDATE_ERROR' });
      }
    });

    // Handle payment additions
    socket.on('payment:add', async (data: CreatePaymentRequest) => {
      try {
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
        await logSocketActivity(
          user.id,
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
        const stats = await getRealtimeStats(user.id);
        io.to(`user:${user.id}`).emit('stats:updated', stats);

        console.log(`💰 Payment added for user ${user.email}: ${payment.customer?.name} - ₹${payment.amount}`);

      } catch (error: any) {
        console.error('Payment addition error:', error);
        socket.emit('error', { message: 'Failed to add payment', code: 'PAYMENT_ADD_ERROR' });
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
        await logSocketActivity(
          user.id,
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

    // Handle real-time stats requests
    socket.on('stats:request', async () => {
      try {
        const stats = await getRealtimeStats(user.id);
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
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`👤 User ${user.name || user.email} disconnected (${socket.id}): ${reason}`);
      
      // Remove from active users
      activeUsers.delete(user.id);

      // Log disconnection activity
      await logSocketActivity(
        user.id,
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
  return activeUsers.size;
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId: string): boolean => {
  return activeUsers.has(userId);
};