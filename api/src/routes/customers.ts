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

// GET /api/v1/customers/:id/can-delete - Check if customer can be deleted
router.get('/:id/can-delete', async (req, res) => {
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
        error: 'The requested customer does not exist or you do not have permission to access it'
      };
      res.status(404).json(response);
      return;
    }

    // Calculate customer balance
    const entriesSum = await prisma.dailyEntry.aggregate({
      where: {
        customerId: id,
        userId: req.user!.id
      },
      _sum: {
        amount: true
      }
    });

    const paymentsSum = await prisma.payment.aggregate({
      where: {
        customerId: id,
        userId: req.user!.id
      },
      _sum: {
        amount: true
      }
    });

    const totalBilled = Number(entriesSum._sum.amount || 0);
    const totalPaid = Number(paymentsSum._sum.amount || 0);
    const balance = totalBilled - totalPaid;

    // Check dependencies
    const hasEntries = existingCustomer._count.dailyEntries > 0;
    const hasPayments = existingCustomer._count.payments > 0;
    const hasPendingBalance = Math.abs(balance) > 0.01;
    const canDelete = !hasEntries && !hasPayments && !hasPendingBalance;

    const dependencies = [];
    if (hasEntries) dependencies.push(`${existingCustomer._count.dailyEntries} delivery entries`);
    if (hasPayments) dependencies.push(`${existingCustomer._count.payments} payment records`);
    if (hasPendingBalance) {
      const balanceText = balance > 0 ? `₹${balance.toFixed(2)} pending payment` : `₹${Math.abs(balance).toFixed(2)} advance balance`;
      dependencies.push(balanceText);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        canDelete,
        customer: {
          id: existingCustomer.id,
          name: existingCustomer.name,
          phone: existingCustomer.phone
        },
        dependencies: {
          entries: existingCustomer._count.dailyEntries,
          payments: existingCustomer._count.payments,
          pendingBalance: balance,
          hasAdvance: balance < 0,
          list: dependencies
        },
        message: canDelete 
          ? 'Customer can be safely deleted' 
          : `Cannot delete: ${dependencies.join(', ')}`
      },
      message: 'Delete validation completed'
    };
    
    res.json(response);
  } catch (error) {
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

// DELETE /api/v1/customers/:id - Delete customer (soft delete - deactivate)
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

    // Calculate customer balance to check for pending payments
    const entriesSum = await prisma.dailyEntry.aggregate({
      where: {
        customerId: id,
        userId: req.user!.id
      },
      _sum: {
        amount: true
      }
    });

    const paymentsSum = await prisma.payment.aggregate({
      where: {
        customerId: id,
        userId: req.user!.id
      },
      _sum: {
        amount: true
      }
    });

    const totalBilled = Number(entriesSum._sum.amount || 0);
    const totalPaid = Number(paymentsSum._sum.amount || 0);
    const balance = totalBilled - totalPaid;

    // Check if customer has any dependencies that prevent soft deletion
    const hasEntries = existingCustomer._count.dailyEntries > 0;
    const hasPayments = existingCustomer._count.payments > 0;
    const hasPendingBalance = Math.abs(balance) > 0.01; // Allow small rounding differences

    if (hasEntries || hasPayments || hasPendingBalance) {
      const dependencies = [];
      if (hasEntries) dependencies.push(`${existingCustomer._count.dailyEntries} delivery entries`);
      if (hasPayments) dependencies.push(`${existingCustomer._count.payments} payment records`);
      if (hasPendingBalance) {
        const balanceText = balance > 0 ? `₹${balance.toFixed(2)} pending payment` : `₹${Math.abs(balance).toFixed(2)} advance balance`;
        dependencies.push(balanceText);
      }

      const response: ApiResponse = {
        success: false,
        message: 'Cannot deactivate customer',
        error: `Customer has ${dependencies.join(', ')}. Please settle all payments and clear history before deactivating.`,
        data: {
          canDelete: false,
          dependencies: {
            entries: existingCustomer._count.dailyEntries,
            payments: existingCustomer._count.payments,
            pendingBalance: balance,
            hasAdvance: balance < 0,
            list: dependencies
          }
        }
      };
      res.status(400).json(response);
      return;
    }
    
    // Proceed with soft delete (deactivate)
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { isActive: false },
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
        action: 'CUSTOMER_DEACTIVATED',
        entityType: 'CUSTOMER',
        entityId: updatedCustomer.id,
        entityName: updatedCustomer.name,
        description: `Deactivated customer: ${updatedCustomer.name}`,
        metadata: {
          phone: updatedCustomer.phone,
          entriesCount: existingCustomer._count.dailyEntries,
          paymentsCount: existingCustomer._count.payments,
          finalBalance: balance
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    const response: ApiResponse<Customer> = {
      success: true,
      message: 'Customer deactivated successfully',
      data: {
        ...updatedCustomer,
        defaultQuantity: Number(updatedCustomer.defaultQuantity),
        defaultPrice: Number(updatedCustomer.defaultPrice),
        notes: updatedCustomer.notes || '',
        createdAt: updatedCustomer.createdAt.toISOString(),
        updatedAt: updatedCustomer.updatedAt.toISOString()
      }
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// DELETE /api/v1/customers/:id/permanent - Permanently delete customer (hard delete)
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.query; // Require explicit confirmation
    
    if (confirm !== 'true') {
      const response: ApiResponse = {
        success: false,
        message: 'Confirmation required',
        error: 'Add ?confirm=true to permanently delete this customer'
      };
      res.status(400).json(response);
      return;
    }
    
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

    // Calculate customer balance
    const entriesSum = await prisma.dailyEntry.aggregate({
      where: {
        customerId: id,
        userId: req.user!.id
      },
      _sum: {
        amount: true
      }
    });

    const paymentsSum = await prisma.payment.aggregate({
      where: {
        customerId: id,
        userId: req.user!.id
      },
      _sum: {
        amount: true
      }
    });

    const totalBilled = Number(entriesSum._sum.amount || 0);
    const totalPaid = Number(paymentsSum._sum.amount || 0);
    const balance = totalBilled - totalPaid;

    // For hard delete, we require zero balance and no dependencies
    const hasEntries = existingCustomer._count.dailyEntries > 0;
    const hasPayments = existingCustomer._count.payments > 0;
    const hasPendingBalance = Math.abs(balance) > 0.01;

    if (hasEntries || hasPayments || hasPendingBalance) {
      const dependencies = [];
      if (hasEntries) dependencies.push(`${existingCustomer._count.dailyEntries} delivery entries`);
      if (hasPayments) dependencies.push(`${existingCustomer._count.payments} payment records`);
      if (hasPendingBalance) {
        const balanceText = balance > 0 ? `₹${balance.toFixed(2)} pending payment` : `₹${Math.abs(balance).toFixed(2)} advance balance`;
        dependencies.push(balanceText);
      }

      const response: ApiResponse = {
        success: false,
        message: 'Cannot permanently delete customer',
        error: `Customer has ${dependencies.join(', ')}. All data must be cleared before permanent deletion.`,
        data: {
          canDelete: false,
          dependencies: {
            entries: existingCustomer._count.dailyEntries,
            payments: existingCustomer._count.payments,
            pendingBalance: balance,
            hasAdvance: balance < 0,
            list: dependencies
          }
        }
      };
      res.status(400).json(response);
      return;
    }
    
    // Store customer info for logging before deletion
    const customerInfo = {
      id: existingCustomer.id,
      name: existingCustomer.name,
      phone: existingCustomer.phone
    };
    
    // Log activity before deletion
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CUSTOMER_DELETED',
        entityType: 'CUSTOMER',
        entityId: customerInfo.id,
        entityName: customerInfo.name,
        description: `Permanently deleted customer: ${customerInfo.name}`,
        metadata: {
          phone: customerInfo.phone,
          deletionType: 'permanent',
          entriesCount: existingCustomer._count.dailyEntries,
          paymentsCount: existingCustomer._count.payments,
          finalBalance: balance
        },
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      }
    });
    
    // Permanently delete customer (this will cascade delete related records due to DB constraints)
    await prisma.customer.delete({
      where: { id }
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Customer permanently deleted',
      data: {
        id: customerInfo.id,
        name: customerInfo.name,
        deletionType: 'permanent'
      }
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

export default router;