import { Router } from 'express';
import { ApiResponse } from '@/types';
import prisma from '@/database/client';
import { createPaymentSchema } from '@/utils/validation';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/v1/payments - Get all payments with filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      customerId, 
      from, 
      to, 
      method 
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      userId: req.user!.id,
      ...(customerId && { customerId: customerId as string }),
      ...(method && { method: method as any }),
      ...(from && to && {
        paymentDate: {
          gte: new Date(from as string),
          lte: new Date(to as string)
        }
      })
    };

    // Get payments with pagination
    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
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
      prisma.payment.count({ where })
    ]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: payments.map(payment => ({
        id: payment.id,
        userId: payment.userId,
        customerId: payment.customerId,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        notes: payment.notes || '',
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        customer: payment.customer
      })),
      message: 'Payments retrieved successfully',
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

// GET /api/v1/payments/:id - Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await prisma.payment.findFirst({
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
    
    if (!payment) {
      const response: ApiResponse = {
        success: false,
        message: 'Payment not found',
        error: 'The requested payment does not exist or you do not have permission to access it'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: payment.id,
        userId: payment.userId,
        customerId: payment.customerId,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        notes: payment.notes || '',
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        customer: payment.customer
      },
      message: 'Payment retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// POST /api/v1/payments - Create new payment
router.post('/', async (req, res) => {
  try {
    const validatedData = createPaymentSchema.parse(req.body);
    
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
    
    // Create payment
    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        customerId: validatedData.customerId,
        amount: validatedData.amount,
        method: validatedData.method,
        reference: validatedData.reference || null,
        paymentDate: new Date(validatedData.paymentDate),
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
        action: 'PAYMENT_ADDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        entityName: `${payment.customer.name} - ₹${Number(payment.amount)}`,
        description: `Added payment from ${payment.customer.name}`,
        metadata: {
          customerId: payment.customerId,
          customerName: payment.customer.name,
          amount: Number(payment.amount),
          method: payment.method,
          paymentDate: payment.paymentDate.toISOString().split('T')[0]
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: payment.id,
        userId: payment.userId,
        customerId: payment.customerId,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        notes: payment.notes || '',
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        customer: payment.customer
      },
      message: 'Payment created successfully'
    };
    
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation failed',
        error: 'Invalid payment data provided'
      };
      res.status(400).json(response);
      return;
    }
    throw error;
  }
});

// DELETE /api/v1/payments/:id - Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if payment exists and belongs to user
    const existingPayment = await prisma.payment.findFirst({
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
    
    if (!existingPayment) {
      const response: ApiResponse = {
        success: false,
        message: 'Payment not found',
        error: 'The requested payment does not exist or you do not have permission to delete it'
      };
      res.status(404).json(response);
      return;
    }
    
    // Delete payment
    await prisma.payment.delete({
      where: { id }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'PAYMENT_DELETED',
        entityType: 'PAYMENT',
        entityId: existingPayment.id,
        entityName: `${existingPayment.customer.name} - ₹${Number(existingPayment.amount)}`,
        description: `Deleted payment from ${existingPayment.customer.name}`,
        metadata: {
          customerId: existingPayment.customerId,
          customerName: existingPayment.customer.name,
          amount: Number(existingPayment.amount),
          method: existingPayment.method,
          paymentDate: existingPayment.paymentDate.toISOString().split('T')[0]
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Payment deleted successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

export default router;