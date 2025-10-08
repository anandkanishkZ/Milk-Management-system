import { Router } from 'express';
import { ApiResponse } from '@/types';
import prisma from '@/database/client';
import { createDailyEntrySchema, updateDailyEntrySchema } from '@/utils/validation';
import { Prisma } from '@prisma/client';
import { getIoInstance } from '@/lib/socket';
import { getAdminRealtimeStats } from '@/sockets/index';

const router = Router();

// GET /api/v1/daily-entries - Get all daily entries with filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      customerId, 
      from, 
      to, 
      productType 
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.DailyEntryWhereInput = {
      userId: req.user!.id,
      ...(customerId && { customerId: customerId as string }),
      ...(productType && { productType: productType as string }),
      ...(from && to && {
        entryDate: {
          gte: new Date(from as string),
          lte: new Date(to as string)
        }
      })
    };

    // Get entries with pagination
    const [entries, totalCount] = await Promise.all([
      prisma.dailyEntry.findMany({
        where,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      }),
      prisma.dailyEntry.count({ where })
    ]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: entries.map(entry => ({
        id: entry.id,
        userId: entry.userId,
        customerId: entry.customerId,
        entryDate: entry.entryDate.toISOString().split('T')[0],
        quantity: Number(entry.quantity),
        productType: entry.productType,
        pricePerLiter: Number(entry.pricePerLiter),
        amount: Number(entry.amount),
        notes: entry.notes || '',
        isEdited: entry.isEdited,
        editedAt: entry.editedAt?.toISOString() || '',
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        customer: entry.customer
      })),
      message: 'Daily entries retrieved successfully',
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

// GET /api/v1/daily-entries/:id - Get daily entry by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const entry = await prisma.dailyEntry.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true
          }
        }
      }
    });
    
    if (!entry) {
      const response: ApiResponse = {
        success: false,
        message: 'Daily entry not found',
        error: 'The requested daily entry does not exist or you do not have permission to access it'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: entry.id,
        userId: entry.userId,
        customerId: entry.customerId,
        entryDate: entry.entryDate.toISOString().split('T')[0],
        quantity: Number(entry.quantity),
        productType: entry.productType,
        pricePerLiter: Number(entry.pricePerLiter),
        amount: Number(entry.amount),
        notes: entry.notes || '',
        isEdited: entry.isEdited,
        editedAt: entry.editedAt?.toISOString() || '',
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        customer: entry.customer
      },
      message: 'Daily entry retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// POST /api/v1/daily-entries - Create new daily entry
router.post('/', async (req, res) => {
  try {
    const validatedData = createDailyEntrySchema.parse(req.body);
    
    // Check if customer exists and belongs to user
    const customer = await prisma.customer.findFirst({
      where: {
        id: validatedData.customerId,
        userId: req.user!.id,
        isActive: true
      }
    });
    
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        message: 'Customer not found',
        error: 'The specified customer does not exist or is not active'
      };
      res.status(404).json(response);
      return;
    }
    
    // Check for duplicate entry for the same customer and date
    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId: req.user!.id,
        customerId: validatedData.customerId,
        entryDate: new Date(validatedData.entryDate)
      }
    });
    
    if (existingEntry) {
      const response: ApiResponse = {
        success: false,
        message: 'Entry already exists',
        error: 'A daily entry for this customer and date already exists'
      };
      res.status(409).json(response);
      return;
    }
    
    // Calculate amount
    const amount = validatedData.quantity * validatedData.pricePerLiter;
    
    // Create daily entry
    const entry = await prisma.dailyEntry.create({
      data: {
        userId: req.user!.id,
        customerId: validatedData.customerId,
        entryDate: new Date(validatedData.entryDate),
        quantity: validatedData.quantity,
        productType: validatedData.productType || 'milk',
        pricePerLiter: validatedData.pricePerLiter,
        amount: amount,
        notes: validatedData.notes || null
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'DAILY_ENTRY_ADDED',
        entityType: 'DAILY_ENTRY',
        entityId: entry.id,
        entityName: `${entry.customer.name} - ${entry.entryDate.toISOString().split('T')[0]}`,
        description: `Added daily entry for ${entry.customer.name}`,
        metadata: {
          customerId: entry.customerId,
          customerName: entry.customer.name,
          quantity: Number(entry.quantity),
          amount: Number(entry.amount),
          entryDate: entry.entryDate.toISOString().split('T')[0]
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });

    // 🚀 REAL-TIME SOCKET.IO BROADCASTS
    try {
      const io = getIoInstance();

      // Broadcast delivery to user's devices
      io.to(`user:${req.user!.id}`).emit('delivery:updated', entry);

      // Get updated stats for admin dashboard
      const adminStats = await getAdminRealtimeStats();
      io.emit('stats:updated', adminStats);

      console.log(`🚚 Delivery broadcasted via Socket.IO: ${entry.customer.name} - ${entry.quantity}L`);
    } catch (socketError) {
      console.error('Failed to broadcast delivery via Socket.IO:', socketError);
      // Don't fail the request if Socket.IO fails
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: entry.id,
        userId: entry.userId,
        customerId: entry.customerId,
        entryDate: entry.entryDate.toISOString().split('T')[0],
        quantity: Number(entry.quantity),
        productType: entry.productType,
        pricePerLiter: Number(entry.pricePerLiter),
        amount: Number(entry.amount),
        notes: entry.notes || '',
        isEdited: entry.isEdited,
        editedAt: entry.editedAt?.toISOString() || '',
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        customer: entry.customer
      },
      message: 'Daily entry created successfully'
    };
    
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation failed',
        error: 'Invalid daily entry data provided'
      };
      res.status(400).json(response);
      return;
    }
    throw error;
  }
});

// PUT /api/v1/daily-entries/:id - Update daily entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateDailyEntrySchema.parse(req.body);
    
    // Check if entry exists and belongs to user
    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        customer: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!existingEntry) {
      const response: ApiResponse = {
        success: false,
        message: 'Daily entry not found',
        error: 'The requested daily entry does not exist or you do not have permission to update it'
      };
      res.status(404).json(response);
      return;
    }
    
    // Calculate new amount if quantity or price changed
    const newQuantity = validatedData.quantity ?? Number(existingEntry.quantity);
    const newPricePerLiter = validatedData.pricePerLiter ?? Number(existingEntry.pricePerLiter);
    const newAmount = newQuantity * newPricePerLiter;
    
    // Update entry
    const updatedEntry = await prisma.dailyEntry.update({
      where: { id },
      data: {
        ...(validatedData.quantity !== undefined && { quantity: validatedData.quantity }),
        ...(validatedData.productType && { productType: validatedData.productType }),
        ...(validatedData.pricePerLiter !== undefined && { pricePerLiter: validatedData.pricePerLiter }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes || null }),
        amount: newAmount,
        isEdited: true,
        editedAt: new Date()
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'DAILY_ENTRY_UPDATED',
        entityType: 'DAILY_ENTRY',
        entityId: updatedEntry.id,
        entityName: `${updatedEntry.customer.name} - ${updatedEntry.entryDate.toISOString().split('T')[0]}`,
        description: `Updated daily entry for ${updatedEntry.customer.name}`,
        metadata: {
          changes: validatedData,
          customerId: updatedEntry.customerId,
          customerName: updatedEntry.customer.name
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });

    // 🚀 REAL-TIME SOCKET.IO BROADCASTS
    try {
      const io = getIoInstance();

      // Broadcast updated delivery to user's devices
      io.to(`user:${req.user!.id}`).emit('delivery:updated', updatedEntry);

      // Get updated stats for admin dashboard
      const adminStats = await getAdminRealtimeStats();
      io.emit('stats:updated', adminStats);

      console.log(`🚚 Updated delivery broadcasted via Socket.IO: ${updatedEntry.customer.name} - ${updatedEntry.quantity}L`);
    } catch (socketError) {
      console.error('Failed to broadcast delivery update via Socket.IO:', socketError);
      // Don't fail the request if Socket.IO fails
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: updatedEntry.id,
        userId: updatedEntry.userId,
        customerId: updatedEntry.customerId,
        entryDate: updatedEntry.entryDate.toISOString().split('T')[0],
        quantity: Number(updatedEntry.quantity),
        productType: updatedEntry.productType,
        pricePerLiter: Number(updatedEntry.pricePerLiter),
        amount: Number(updatedEntry.amount),
        notes: updatedEntry.notes || '',
        isEdited: updatedEntry.isEdited,
        editedAt: updatedEntry.editedAt?.toISOString() || '',
        createdAt: updatedEntry.createdAt.toISOString(),
        updatedAt: updatedEntry.updatedAt.toISOString(),
        customer: updatedEntry.customer
      },
      message: 'Daily entry updated successfully'
    };
    
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation failed',
        error: 'Invalid daily entry data provided'
      };
      res.status(400).json(response);
      return;
    }
    throw error;
  }
});

// DELETE /api/v1/daily-entries/:id - Delete daily entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if entry exists and belongs to user
    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        customer: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!existingEntry) {
      const response: ApiResponse = {
        success: false,
        message: 'Daily entry not found',
        error: 'The requested daily entry does not exist or you do not have permission to delete it'
      };
      res.status(404).json(response);
      return;
    }
    
    // Delete entry
    await prisma.dailyEntry.delete({
      where: { id }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'DAILY_ENTRY_DELETED',
        entityType: 'DAILY_ENTRY',
        entityId: existingEntry.id,
        entityName: `${existingEntry.customer.name} - ${existingEntry.entryDate.toISOString().split('T')[0]}`,
        description: `Deleted daily entry for ${existingEntry.customer.name}`,
        metadata: {
          customerId: existingEntry.customerId,
          customerName: existingEntry.customer.name,
          quantity: Number(existingEntry.quantity),
          amount: Number(existingEntry.amount),
          entryDate: existingEntry.entryDate.toISOString().split('T')[0]
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Daily entry deleted successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

export default router;