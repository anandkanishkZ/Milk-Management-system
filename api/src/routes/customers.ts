import { Router } from 'express';
import { ApiResponse, Customer } from '@/types';
import prisma from '@/database/client';
import { createCustomerSchema, updateCustomerSchema } from '@/utils/validation';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/v1/customers - Get all customers with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '10', search, active } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.CustomerWhereInput = {
      userId: req.user!.id,
      ...(active !== undefined && { isActive: active === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } },
          { address: { contains: search as string, mode: 'insensitive' } }
        ]
      })
    };

    // Get customers with pagination
    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          userId: true,
          name: true,
          phone: true,
          address: true,
          defaultQuantity: true,
          defaultPrice: true,
          deliveryDays: true,
          isActive: true,
          notes: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.customer.count({ where })
    ]);

    const response: ApiResponse<Customer[]> = {
      success: true,
      data: customers.map(customer => ({
        ...customer,
        defaultQuantity: Number(customer.defaultQuantity),
        defaultPrice: Number(customer.defaultPrice),
        notes: customer.notes || '',
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString()
      })),
      message: 'Customers retrieved successfully',
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

// GET /api/v1/customers/:id - Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        address: true,
        defaultQuantity: true,
        defaultPrice: true,
        deliveryDays: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            dailyEntries: true,
            payments: true
          }
        }
      }
    });
    
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        message: 'Customer not found',
        error: 'The requested customer does not exist or you do not have permission to access it'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<Customer & { stats?: any }> = {
      success: true,
      data: {
        ...customer,
        defaultQuantity: Number(customer.defaultQuantity),
        defaultPrice: Number(customer.defaultPrice),
        notes: customer.notes || '',
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        stats: {
          totalEntries: customer._count.dailyEntries,
          totalPayments: customer._count.payments
        }
      },
      message: 'Customer retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// POST /api/v1/customers - Create new customer
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validatedData = createCustomerSchema.parse(req.body);
    
    // Check for duplicate phone number for this user
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        userId: req.user!.id,
        phone: validatedData.phone
      }
    });
    
    if (existingCustomer) {
      const response: ApiResponse = {
        success: false,
        message: 'Customer already exists',
        error: 'A customer with this phone number already exists'
      };
      res.status(409).json(response);
      return;
    }
    
    // Create customer
    const customer = await prisma.customer.create({
      data: {
        userId: req.user!.id,
        name: validatedData.name,
        phone: validatedData.phone,
        address: validatedData.address,
        defaultQuantity: validatedData.defaultQuantity,
        defaultPrice: validatedData.defaultPrice,
        deliveryDays: validatedData.deliveryDays,
        notes: validatedData.notes || null,
        isActive: true
      },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        address: true,
        defaultQuantity: true,
        defaultPrice: true,
        deliveryDays: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CUSTOMER_ADDED',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        entityName: customer.name,
        description: `Added new customer: ${customer.name}`,
        metadata: {
          phone: customer.phone,
          deliveryDays: customer.deliveryDays
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    const response: ApiResponse<Customer> = {
      success: true,
      data: {
        ...customer,
        defaultQuantity: Number(customer.defaultQuantity),
        defaultPrice: Number(customer.defaultPrice),
        notes: customer.notes || '',
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString()
      },
      message: 'Customer created successfully'
    };
    
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation failed',
        error: 'Invalid customer data provided'
      };
      res.status(400).json(response);
      return;
    }
    throw error;
  }
});

// PUT /api/v1/customers/:id - Update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateCustomerSchema.parse(req.body);
    
    // Check if customer exists and belongs to user
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    });
    
    if (!existingCustomer) {
      const response: ApiResponse = {
        success: false,
        message: 'Customer not found',
        error: 'The requested customer does not exist or you do not have permission to update it'
      };
      res.status(404).json(response);
      return;
    }
    
    // Check for duplicate phone number (excluding current customer)
    if (validatedData.phone && validatedData.phone !== existingCustomer.phone) {
      const duplicateCustomer = await prisma.customer.findFirst({
        where: {
          userId: req.user!.id,
          phone: validatedData.phone,
          id: { not: id }
        }
      });
      
      if (duplicateCustomer) {
        const response: ApiResponse = {
          success: false,
          message: 'Phone number already exists',
          error: 'Another customer with this phone number already exists'
        };
        res.status(409).json(response);
        return;
      }
    }
    
    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone && { phone: validatedData.phone }),
        ...(validatedData.address && { address: validatedData.address }),
        ...(validatedData.defaultQuantity !== undefined && { defaultQuantity: validatedData.defaultQuantity }),
        ...(validatedData.defaultPrice !== undefined && { defaultPrice: validatedData.defaultPrice }),
        ...(validatedData.deliveryDays && { deliveryDays: validatedData.deliveryDays }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes || null }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive })
      },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        address: true,
        defaultQuantity: true,
        defaultPrice: true,
        deliveryDays: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CUSTOMER_UPDATED',
        entityType: 'CUSTOMER',
        entityId: updatedCustomer.id,
        entityName: updatedCustomer.name,
        description: `Updated customer: ${updatedCustomer.name}`,
        metadata: validatedData,
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    const response: ApiResponse<Customer> = {
      success: true,
      data: {
        ...updatedCustomer,
        defaultQuantity: Number(updatedCustomer.defaultQuantity),
        defaultPrice: Number(updatedCustomer.defaultPrice),
        notes: updatedCustomer.notes || '',
        createdAt: updatedCustomer.createdAt.toISOString(),
        updatedAt: updatedCustomer.updatedAt.toISOString()
      },
      message: 'Customer updated successfully'
    };
    
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation failed',
        error: 'Invalid customer data provided'
      };
      res.status(400).json(response);
      return;
    }
    throw error;
  }
});

// DELETE /api/v1/customers/:id - Delete customer (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if customer exists and belongs to user
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        _count: {
          select: {
            dailyEntries: true,
            payments: true
          }
        }
      }
    });
    
    if (!existingCustomer) {
      const response: ApiResponse = {
        success: false,
        message: 'Customer not found',
        error: 'The requested customer does not exist or you do not have permission to delete it'
      };
      res.status(404).json(response);
      return;
    }
    
    // Soft delete (deactivate) instead of hard delete to preserve data integrity
    const deletedCustomer = await prisma.customer.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        phone: true
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CUSTOMER_DELETED',
        entityType: 'CUSTOMER',
        entityId: deletedCustomer.id,
        entityName: deletedCustomer.name,
        description: `Deleted customer: ${deletedCustomer.name}`,
        metadata: {
          phone: deletedCustomer.phone,
          entriesCount: existingCustomer._count.dailyEntries,
          paymentsCount: existingCustomer._count.payments
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Customer deleted successfully',
      data: {
        id: deletedCustomer.id,
        name: deletedCustomer.name
      }
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

export default router;