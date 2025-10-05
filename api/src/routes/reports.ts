import { Router } from 'express';
import { ApiResponse } from '@/types';
import prisma from '@/database/client';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/v1/reports/dashboard - Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Default to current month if no date range provided
    const defaultFrom = (from as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const defaultTo = (to as string) || new Date().toISOString().split('T')[0];
    
    const dateRange = {
      gte: new Date(defaultFrom),
      lte: new Date(defaultTo + 'T23:59:59.999Z')
    };

    // Get dashboard statistics
    const [
      customersStats,
      entriesStats,
      paymentsStats,
      topCustomers
    ] = await Promise.all([
      // Customer statistics
      prisma.customer.groupBy({
        by: ['isActive'],
        where: { userId: req.user!.id },
        _count: { id: true }
      }),
      
      // Daily entries statistics for date range
      prisma.dailyEntry.aggregate({
        where: {
          userId: req.user!.id,
          entryDate: dateRange
        },
        _count: { id: true },
        _sum: { 
          quantity: true,
          amount: true 
        }
      }),
      
      // Payments statistics for date range
      prisma.payment.aggregate({
        where: {
          userId: req.user!.id,
          paymentDate: dateRange
        },
        _count: { id: true },
        _sum: { amount: true }
      }),
      
      // Top customers by revenue
      prisma.dailyEntry.groupBy({
        by: ['customerId'],
        where: {
          userId: req.user!.id,
          entryDate: dateRange
        },
        _sum: { 
          quantity: true,
          amount: true 
        },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      })
    ]);

    // Get customer names for top customers
    const customerIds = topCustomers.map(tc => tc.customerId);
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        userId: req.user!.id
      },
      select: {
        id: true,
        name: true,
        phone: true
      }
    });

    const customersMap = customers.reduce((acc, customer) => {
      acc[customer.id] = customer;
      return acc;
    }, {} as Record<string, any>);

    const activeCustomers = customersStats.find(stat => stat.isActive)?.  _count.id || 0;
    const inactiveCustomers = customersStats.find(stat => !stat.isActive)?._count.id || 0;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        period: {
          from: defaultFrom,
          to: defaultTo
        },
        customers: {
          total: activeCustomers + inactiveCustomers,
          active: activeCustomers,
          inactive: inactiveCustomers
        },
        entries: {
          count: entriesStats._count.id || 0,
          totalQuantity: Number(entriesStats._sum.quantity || 0),
          totalAmount: Number(entriesStats._sum.amount || 0)
        },
        payments: {
          count: paymentsStats._count.id || 0,
          totalAmount: Number(paymentsStats._sum.amount || 0)
        },
        revenue: {
          billed: Number(entriesStats._sum.amount || 0),
          collected: Number(paymentsStats._sum.amount || 0),
          pending: Number(entriesStats._sum.amount || 0) - Number(paymentsStats._sum.amount || 0)
        },
        topCustomers: topCustomers.map(tc => ({
          customer: customersMap[tc.customerId] || { id: tc.customerId, name: 'Unknown', phone: '' },
          totalQuantity: Number(tc._sum.quantity || 0),
          totalAmount: Number(tc._sum.amount || 0)
        }))
      },
      message: 'Dashboard report retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// GET /api/v1/reports/revenue - Get revenue report
router.get('/revenue', async (req, res) => {
  try {
    const { from, to, customerId, groupBy = 'day' } = req.query;
    
    if (!from || !to) {
      const response: ApiResponse = {
        success: false,
        message: 'Date range required',
        error: 'Please provide both from and to dates'
      };
      res.status(400).json(response);
      return;
    }

    const dateRange = {
      gte: new Date(from as string),
      lte: new Date(to as string + 'T23:59:59.999Z')
    };

    const whereClause: Prisma.DailyEntryWhereInput = {
      userId: req.user!.id,
      entryDate: dateRange,
      ...(customerId && { customerId: customerId as string })
    };

    // Get revenue data grouped by specified period
    const revenueData = await prisma.dailyEntry.findMany({
      where: whereClause,
      select: {
        entryDate: true,
        quantity: true,
        amount: true,
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { entryDate: 'asc' }
    });

    // Group data by the specified period
    const groupedData = revenueData.reduce((acc, entry) => {
      let groupKey: string;
      const date = new Date(entry.entryDate);
      
      switch (groupBy) {
        case 'month':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          groupKey = weekStart.toISOString().split('T')[0];
          break;
        default: // day
          groupKey = entry.entryDate.toISOString().split('T')[0];
      }
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          period: groupKey,
          totalQuantity: 0,
          totalAmount: 0,
          entriesCount: 0
        };
      }
      
      acc[groupKey].totalQuantity += Number(entry.quantity);
      acc[groupKey].totalAmount += Number(entry.amount);
      acc[groupKey].entriesCount += 1;
      
      return acc;
    }, {} as Record<string, any>);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        period: {
          from: from as string,
          to: to as string
        },
        groupBy,
        data: Object.values(groupedData),
        summary: {
          totalQuantity: revenueData.reduce((sum, entry) => sum + Number(entry.quantity), 0),
          totalAmount: revenueData.reduce((sum, entry) => sum + Number(entry.amount), 0),
          totalEntries: revenueData.length
        }
      },
      message: 'Revenue report retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

// GET /api/v1/reports/customers - Get customer report
router.get('/customers', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const dateRange = from && to ? {
      gte: new Date(from as string),
      lte: new Date(to as string + 'T23:59:59.999Z')
    } : undefined;

    // Get customer report data
    const customers = await prisma.customer.findMany({
      where: {
        userId: req.user!.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        defaultQuantity: true,
        defaultPrice: true,
        deliveryDays: true,
        createdAt: true,
        _count: {
          select: {
            dailyEntries: true,
            payments: true
          }
        }
      }
    });

    // Get detailed statistics for each customer
    const customerStats = await Promise.all(
      customers.map(async (customer) => {
        const [entriesStats, paymentsStats] = await Promise.all([
          prisma.dailyEntry.aggregate({
            where: {
              customerId: customer.id,
              userId: req.user!.id,
              ...(dateRange && { entryDate: dateRange })
            },
            _sum: {
              quantity: true,
              amount: true
            },
            _count: { id: true }
          }),
          
          prisma.payment.aggregate({
            where: {
              customerId: customer.id,
              userId: req.user!.id,
              ...(dateRange && { paymentDate: dateRange })
            },
            _sum: { amount: true },
            _count: { id: true }
          })
        ]);

        const totalBilled = Number(entriesStats._sum.amount || 0);
        const totalPaid = Number(paymentsStats._sum.amount || 0);
        const balance = totalBilled - totalPaid;

        return {
          customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            defaultQuantity: Number(customer.defaultQuantity),
            defaultPrice: Number(customer.defaultPrice),
            deliveryDays: customer.deliveryDays,
            createdAt: customer.createdAt.toISOString()
          },
          stats: {
            totalEntries: entriesStats._count.id || 0,
            totalQuantity: Number(entriesStats._sum.quantity || 0),
            totalBilled: totalBilled,
            totalPayments: paymentsStats._count.id || 0,
            totalPaid: totalPaid,
            balance: balance,
            balanceStatus: balance > 0 ? 'due' : balance < 0 ? 'advance' : 'settled'
          }
        };
      })
    );

    // Sort by balance (highest first)
    customerStats.sort((a, b) => b.stats.balance - a.stats.balance);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        period: dateRange ? {
          from: from as string,
          to: to as string
        } : 'all-time',
        customers: customerStats,
        summary: {
          totalCustomers: customerStats.length,
          totalBilled: customerStats.reduce((sum, cs) => sum + cs.stats.totalBilled, 0),
          totalPaid: customerStats.reduce((sum, cs) => sum + cs.stats.totalPaid, 0),
          totalBalance: customerStats.reduce((sum, cs) => sum + cs.stats.balance, 0),
          customersWithDue: customerStats.filter(cs => cs.stats.balance > 0).length,
          customersWithAdvance: customerStats.filter(cs => cs.stats.balance < 0).length
        }
      },
      message: 'Customer report retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    throw error;
  }
});

export default router;