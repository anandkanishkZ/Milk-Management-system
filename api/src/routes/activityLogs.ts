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

    const response: ApiResponse<any[]> = {
      success: true,
      data: activityLogs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
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

export default router;