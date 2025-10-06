import { Router } from 'express';
import { ApiResponse } from '@/types';
import prisma from '@/database/client';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/v1/activity-logs - Get all activity logs with filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      action, 
      entityType,
      from, 
      to 
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.ActivityLogWhereInput = {
      userId: req.user!.id,
      ...(action && { action: action as any }),
      ...(entityType && { entityType: entityType as any }),
      ...(from && to && {
        timestamp: {
          gte: new Date(from as string),
          lte: new Date(to as string)
        }
      })
    };

    // Get activity logs with pagination
    const [activityLogs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          entityName: true,
          description: true,
          metadata: true,
          timestamp: true,
          ipAddress: true,
          userAgent: true
        }
      }),
      prisma.activityLog.count({ where })
    ]);

    // Convert database enum values back to frontend format
    const actionReverseMap: Record<string, string> = {
      'CUSTOMER_ADDED': 'customer_added',
      'CUSTOMER_UPDATED': 'customer_updated',
      'CUSTOMER_DELETED': 'customer_deleted',
      'CUSTOMER_ACTIVATED': 'customer_activated',
      'CUSTOMER_DEACTIVATED': 'customer_deactivated',
      'DAILY_ENTRY_ADDED': 'daily_entry_added',
      'DAILY_ENTRY_UPDATED': 'daily_entry_updated',
      'PAYMENT_ADDED': 'payment_added',
      'PAYMENT_DELETED': 'payment_deleted',
      'DATA_EXPORTED': 'data_exported',
      'DATA_CLEARED': 'data_cleared',
      'APP_OPENED': 'app_opened',
      'REPORT_VIEWED': 'report_viewed',
      'HISTORY_VIEWED': 'history_viewed',
      'DATA_SYNCED': 'data_synced'
    };

    const entityReverseMap: Record<string, string> = {
      'CUSTOMER': 'customer',
      'DAILY_ENTRY': 'daily_entry',
      'PAYMENT': 'payment',
      'SYSTEM': 'system',
      'VIEW': 'view',
      'SECURITY': 'security',
      'AUTH': 'auth'
    };

    const response: ApiResponse<any[]> = {
      success: true,
      data: activityLogs.map(log => ({
        id: log.id,
        action: actionReverseMap[log.action] || log.action.toLowerCase(),
        entityType: entityReverseMap[log.entityType] || log.entityType.toLowerCase(),
        entityId: log.entityId,
        entityName: log.entityName,
        description: log.description,
        metadata: log.metadata || {},
        timestamp: log.timestamp.toISOString(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      })),
      message: 'Activity logs retrieved successfully',
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// GET /api/v1/activity-logs/stats - Get activity statistics
router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Build where clause for date range
    const whereClause: Prisma.ActivityLogWhereInput = {
      userId: req.user!.id,
      ...(from && to && {
        timestamp: {
          gte: new Date(from as string),
          lte: new Date(to as string)
        }
      })
    };

    // Get activity statistics
    const [
      totalActivities,
      activitiesByAction,
      activitiesByEntity,
      recentActivities
    ] = await Promise.all([
      prisma.activityLog.count({ where: whereClause }),
      
      prisma.activityLog.groupBy({
        by: ['action'],
        where: whereClause,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } }
      }),
      
      prisma.activityLog.groupBy({
        by: ['entityType'],
        where: whereClause,
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } }
      }),
      
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityName: true,
          description: true,
          timestamp: true
        }
      })
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        totalActivities,
        activitiesByAction: activitiesByAction.map(item => ({
          action: item.action,
          count: item._count.action
        })),
        activitiesByEntity: activitiesByEntity.map(item => ({
          entityType: item.entityType,
          count: item._count.entityType
        })),
        recentActivities: recentActivities.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityName: log.entityName,
          description: log.description,
          timestamp: log.timestamp.toISOString()
        }))
      },
      message: 'Activity statistics retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// POST /api/v1/activity-logs - Create a new activity log
router.post('/', async (req, res) => {
  try {
    const { action, entityType, entityId, entityName, description, metadata } = req.body;

    // Validate required fields
    if (!action || !entityType) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Missing required fields: action and entityType are required',
        error: 'VALIDATION_ERROR'
      };
      return res.status(400).json(response);
    }

    // Convert frontend values to database enum values
    const actionMap: Record<string, string> = {
      'customer_added': 'CUSTOMER_ADDED',
      'customer_updated': 'CUSTOMER_UPDATED',
      'customer_deleted': 'CUSTOMER_DELETED',
      'customer_activated': 'CUSTOMER_ACTIVATED',
      'customer_deactivated': 'CUSTOMER_DEACTIVATED',
      'daily_entry_added': 'DAILY_ENTRY_ADDED',
      'daily_entry_updated': 'DAILY_ENTRY_UPDATED',
      'payment_added': 'PAYMENT_ADDED',
      'payment_deleted': 'PAYMENT_DELETED',
      'data_exported': 'DATA_EXPORTED',
      'data_cleared': 'DATA_CLEARED',
      'app_opened': 'APP_OPENED',
      'report_viewed': 'REPORT_VIEWED',
      'history_viewed': 'HISTORY_VIEWED',
      'data_synced': 'DATA_SYNCED'
    };

    const entityTypeMap: Record<string, string> = {
      'customer': 'CUSTOMER',
      'daily_entry': 'DAILY_ENTRY',
      'payment': 'PAYMENT',
      'system': 'SYSTEM',
      'view': 'VIEW',
      'security': 'SECURITY',
      'auth': 'AUTH'
    };

    const dbAction = actionMap[action] || action.toUpperCase();
    const dbEntityType = entityTypeMap[entityType] || entityType.toUpperCase();

    // Create the activity log
    const activityLog = await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: dbAction as any,
        entityType: dbEntityType as any,
        entityId: entityId || null,
        entityName: entityName || null,
        description: description || null,
        metadata: metadata || null,
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null,
        timestamp: new Date()
      },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        entityName: true,
        description: true,
        metadata: true,
        timestamp: true,
        ipAddress: true,
        userAgent: true
      }
    });

    // Convert back to frontend format
    const actionReverseMap: Record<string, string> = {
      'CUSTOMER_ADDED': 'customer_added',
      'CUSTOMER_UPDATED': 'customer_updated',
      'CUSTOMER_DELETED': 'customer_deleted',
      'CUSTOMER_ACTIVATED': 'customer_activated',
      'CUSTOMER_DEACTIVATED': 'customer_deactivated',
      'DAILY_ENTRY_ADDED': 'daily_entry_added',
      'DAILY_ENTRY_UPDATED': 'daily_entry_updated',
      'PAYMENT_ADDED': 'payment_added',
      'PAYMENT_DELETED': 'payment_deleted',
      'DATA_EXPORTED': 'data_exported',
      'DATA_CLEARED': 'data_cleared',
      'APP_OPENED': 'app_opened',
      'REPORT_VIEWED': 'report_viewed',
      'HISTORY_VIEWED': 'history_viewed',
      'DATA_SYNCED': 'data_synced'
    };

    const entityReverseMap: Record<string, string> = {
      'CUSTOMER': 'customer',
      'DAILY_ENTRY': 'daily_entry',
      'PAYMENT': 'payment',
      'SYSTEM': 'system',
      'VIEW': 'view',
      'SECURITY': 'security',
      'AUTH': 'auth'
    };

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...activityLog,
        action: actionReverseMap[activityLog.action] || activityLog.action.toLowerCase(),
        entityType: entityReverseMap[activityLog.entityType] || activityLog.entityType.toLowerCase(),
        timestamp: activityLog.timestamp.toISOString()
      },
      message: 'Activity log created successfully'
    };

    return res.status(201).json(response);
  } catch (error) {
    throw error;
  }
});

export default router;