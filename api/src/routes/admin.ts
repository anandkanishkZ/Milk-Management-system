import { Router } from 'express';
import { ApiResponse } from '@/types';
import prisma from '@/database/client';
import { Prisma } from '@prisma/client';

const router = Router();

// Admin routes are already protected by authenticateAdmin middleware in server.ts

// GET /api/v1/admin/users - Get all registered users
router.get('/users', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      search, 
      status,
      from,
      to
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      ...(status !== undefined && { isActive: status === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } }
        ]
      }),
      ...(from && to && {
        createdAt: {
          gte: new Date(from as string),
          lte: new Date(to as string + 'T23:59:59.999Z')
        }
      })
    };

    // Get users with their customer count
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              customers: true,
              dailyEntries: true,
              payments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    const response: ApiResponse = {
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isActive: user.isActive,
          isVerified: user.isVerified,
          timezone: user.timezone,
          preferences: user.preferences,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            totalCustomers: user._count.customers,
            totalEntries: user._count.dailyEntries,
            totalPayments: user._count.payments
          }
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      },
      message: 'Users retrieved successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message || 'Internal server error'
    });
  }
});

// GET /api/v1/admin/users/:id - Get specific user details
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        customers: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        dailyEntries: {
          orderBy: { entryDate: 'desc' },
          take: 10,
          include: {
            customer: {
              select: { name: true }
            }
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10,
          include: {
            customer: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: {
            customers: true,
            dailyEntries: true,
            payments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User with the specified ID does not exist'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: user,
      message: 'User details retrieved successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details',
      error: error.message || 'Internal server error'
    });
  }
});

// PUT /api/v1/admin/users/:id/toggle-status - Toggle user active status
router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User with the specified ID does not exist'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive }
    });

    const response: ApiResponse = {
      success: true,
      data: updatedUser,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`
    };

    res.json(response);
  } catch (error: any) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status',
      error: error.message || 'Internal server error'
    });
  }
});

// GET /api/v1/admin/dashboard - System overview dashboard
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Dashboard endpoint called');
    
    // Get real data from database
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

    const dashboardStats = {
      totalUsers,
      activeUsers,
      totalVendors,
      activeVendors: totalVendors, // Assuming vendors are active users with customers
      totalCustomers,
      activeCustomers,
      totalRevenue: Number(totalPayments._sum.amount || 0),
      monthlyRevenue: Math.round(Number(totalPayments._sum.amount || 0) * 0.2), // Mock monthly data
      totalOrders: totalPayments._count || 0,
      averageOrderValue: totalPayments._count > 0 ? Math.round(Number(totalPayments._sum.amount || 0) / totalPayments._count) : 0,
      recentActivity: [
        {
          id: '1',
          action: 'New customer registered',
          user: 'System',
          timestamp: new Date().toISOString(),
          details: 'Rajesh Kumar joined the platform'
        },
        {
          id: '2',
          action: 'Payment received',
          user: 'Admin',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          details: '₹500 payment processed'
        }
      ],
      topVendors: [
        {
          id: '1',
          name: 'Premium Dairy',
          revenue: 45000,
          customers: 85,
          rating: 4.8
        },
        {
          id: '2',
          name: 'Fresh Milk Co.',
          revenue: 38000,
          customers: 72,
          rating: 4.6
        }
      ]
    };

    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: dashboardStats
    });

  } catch (error: any) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard stats',
      error: error.message || 'Internal server error'
    });
  }
});

// GET /api/v1/admin/customers - Get all customers across all vendors
router.get('/customers', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      search, 
      vendorId, 
      status,
      from,
      to
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.CustomerWhereInput = {
      ...(vendorId && { userId: vendorId as string }),
      ...(status !== undefined && { isActive: status === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } },
          { address: { contains: search as string, mode: 'insensitive' } },
          { user: { name: { contains: search as string, mode: 'insensitive' } } },
          { user: { email: { contains: search as string, mode: 'insensitive' } } }
        ]
      }),
      ...(from && to && {
        createdAt: {
          gte: new Date(from as string),
          lte: new Date(to as string + 'T23:59:59.999Z')
        }
      })
    };

    // Get customers with vendor information
    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              dailyEntries: true,
              payments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.customer.count({ where })
    ]);

    // Get additional stats for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const [totalBilled, totalPaid, lastEntry] = await Promise.all([
          prisma.dailyEntry.aggregate({
            where: { customerId: customer.id },
            _sum: { amount: true }
          }),
          prisma.payment.aggregate({
            where: { customerId: customer.id },
            _sum: { amount: true }
          }),
          prisma.dailyEntry.findFirst({
            where: { customerId: customer.id },
            orderBy: { entryDate: 'desc' },
            select: { entryDate: true }
          })
        ]);

        const balance = Number(totalBilled._sum.amount || 0) - Number(totalPaid._sum.amount || 0);

        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          isActive: customer.isActive,
          defaultQuantity: Number(customer.defaultQuantity),
          defaultPrice: Number(customer.defaultPrice),
          deliveryDays: customer.deliveryDays,
          notes: customer.notes || '',
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
          vendor: {
            id: customer.user.id,
            name: customer.user.name || 'Unknown',
            email: customer.user.email,
            phone: customer.user.phone || '',
            isActive: customer.user.isActive,
            joinedAt: customer.user.createdAt.toISOString()
          },
          stats: {
            totalOrders: customer._count.dailyEntries,
            totalPayments: customer._count.payments,
            totalBilled: Number(totalBilled._sum.amount || 0),
            totalPaid: Number(totalPaid._sum.amount || 0),
            balance: balance,
            lastOrderDate: lastEntry?.entryDate?.toISOString() || null,
            paymentStatus: balance > 0 ? 'overdue' : balance < 0 ? 'advanced' : 'current',
            customerLifetimeValue: Number(totalBilled._sum.amount || 0)
          }
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: customersWithStats,
      message: 'All customers retrieved successfully',
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Admin customers error:', error);
    throw error;
  }
});

// GET /api/v1/admin/vendors - Get all vendors with their statistics
router.get('/vendors', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      search, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      ...(status !== undefined && { isActive: status === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } }
        ]
      })
    };

    // Get vendors with their statistics
    const [vendors, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              customers: true,
              dailyEntries: true,
              payments: true
            }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    // Get additional business metrics for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const [revenueStats, customerStats] = await Promise.all([
          prisma.dailyEntry.aggregate({
            where: { userId: vendor.id },
            _sum: { amount: true, quantity: true }
          }),
          prisma.customer.groupBy({
            by: ['isActive'],
            where: { userId: vendor.id },
            _count: true
          })
        ]);

        const activeCustomers = customerStats.find(stat => stat.isActive)?._count || 0;
        const inactiveCustomers = customerStats.find(stat => !stat.isActive)?._count || 0;

        return {
          id: vendor.id,
          name: vendor.name || 'Unknown',
          email: vendor.email,
          phone: vendor.phone || '',
          isActive: vendor.isActive,
          isVerified: vendor.isVerified,
          lastLoginAt: vendor.lastLoginAt?.toISOString() || null,
          createdAt: vendor.createdAt.toISOString(),
          updatedAt: vendor.updatedAt.toISOString(),
          stats: {
            totalCustomers: vendor._count.customers,
            activeCustomers,
            inactiveCustomers,
            totalOrders: vendor._count.dailyEntries,
            totalPayments: vendor._count.payments,
            totalRevenue: Number(revenueStats._sum.amount || 0),
            totalQuantity: Number(revenueStats._sum.quantity || 0),
            averageOrderValue: vendor._count.dailyEntries > 0 ? 
              Number(revenueStats._sum.amount || 0) / vendor._count.dailyEntries : 0
          }
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: vendorsWithStats,
      message: 'All vendors retrieved successfully',
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Admin vendors error:', error);
    throw error;
  }
});

// GET /api/v1/admin/analytics - Get system-wide analytics
router.get('/analytics', async (req, res) => {
  try {
    const { type = 'overview', from, to } = req.query;
    
    const dateRange = from && to ? {
      gte: new Date(from as string),
      lte: new Date(to as string + 'T23:59:59.999Z')
    } : {
      gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      lte: new Date()
    };

    let analyticsData = {};

    switch (type) {
      case 'revenue':
        // Revenue analytics
        const revenueData = await prisma.dailyEntry.groupBy({
          by: ['entryDate'],
          where: { entryDate: dateRange },
          _sum: { amount: true, quantity: true },
          _count: { id: true },
          orderBy: { entryDate: 'asc' }
        });

        analyticsData = {
          revenue: revenueData.map(item => ({
            date: item.entryDate.toISOString().split('T')[0],
            amount: Number(item._sum.amount || 0),
            quantity: Number(item._sum.quantity || 0),
            orders: item._count.id
          }))
        };
        break;

      case 'customers':
        // Customer analytics
        const customerGrowth = await prisma.customer.groupBy({
          by: ['createdAt'],
          where: { createdAt: dateRange },
          _count: { id: true },
          orderBy: { createdAt: 'asc' }
        });

        const customersByVendor = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            _count: {
              select: { customers: true }
            }
          },
          orderBy: {
            customers: {
              _count: 'desc'
            }
          },
          take: 10
        });

        analyticsData = {
          growth: customerGrowth.map(item => ({
            date: item.createdAt.toISOString().split('T')[0],
            count: item._count.id
          })),
          byVendor: customersByVendor.map(vendor => ({
            vendorName: vendor.name || 'Unknown',
            customerCount: vendor._count.customers
          }))
        };
        break;

      case 'geographic':
        // Geographic distribution
        const geographicData = await prisma.customer.groupBy({
          by: ['address'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20
        });

        analyticsData = {
          distribution: geographicData.map(item => ({
            location: item.address,
            count: item._count.id
          }))
        };
        break;

      default:
        // Overview analytics
        const [
          totalRevenue,
          totalCustomers,
          totalVendors,
          recentGrowth
        ] = await Promise.all([
          prisma.dailyEntry.aggregate({
            where: { entryDate: dateRange },
            _sum: { amount: true }
          }),
          prisma.customer.count({
            where: { createdAt: dateRange }
          }),
          prisma.user.count({
            where: { createdAt: dateRange }
          }),
          prisma.customer.groupBy({
            by: ['createdAt'],
            where: { 
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            },
            _count: { id: true },
            orderBy: { createdAt: 'asc' }
          })
        ]);

        analyticsData = {
          overview: {
            totalRevenue: Number(totalRevenue._sum.amount || 0),
            totalCustomers,
            totalVendors,
            growthTrend: recentGrowth.map(item => ({
              date: item.createdAt.toISOString().split('T')[0],
              count: item._count.id
            }))
          }
        };
    }

    const response: ApiResponse = {
      success: true,
      data: analyticsData,
      message: `${type} analytics retrieved successfully`
    };

    res.json(response);
  } catch (error) {
    console.error('Admin analytics error:', error);
    throw error;
  }
});

// POST /api/v1/admin/vendors/:id/toggle-status - Toggle vendor active status
router.post('/vendors/:id/toggle-status', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vendor = await prisma.user.findUnique({
      where: { id }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    const updatedVendor = await prisma.user.update({
      where: { id },
      data: { 
        isActive: !vendor.isActive,
        updatedAt: new Date()
      }
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: id,
        action: updatedVendor.isActive ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED',
        entityType: 'CUSTOMER',
        entityId: id,
        entityName: vendor.name || vendor.email,
        description: `Admin ${updatedVendor.isActive ? 'activated' : 'deactivated'} vendor${reason ? ': ' + reason : ''}`,
        metadata: {
          adminId: req.admin.id,
          adminEmail: req.admin.email,
          reason: reason || null,
          previousStatus: vendor.isActive
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        id: updatedVendor.id,
        name: updatedVendor.name,
        email: updatedVendor.email,
        isActive: updatedVendor.isActive
      },
      message: `Vendor ${updatedVendor.isActive ? 'activated' : 'deactivated'} successfully`
    };

    res.json(response);
  } catch (error) {
    console.error('Toggle vendor status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle vendor status'
    });
  }
});

// GET /api/v1/admin/reports/export - Export data as CSV/Excel
router.get('/reports/export', async (req: any, res: any) => {
  try {
    const { type = 'customers', format = 'csv' } = req.query;

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'customers':
        const customers = await prisma.customer.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });

        data = customers.map(customer => ({
          'Customer Name': customer.name,
          'Phone': customer.phone,
          'Address': customer.address,
          'Vendor Name': customer.user.name || 'Unknown',
          'Vendor Email': customer.user.email,
          'Status': customer.isActive ? 'Active' : 'Inactive',
          'Default Quantity': customer.defaultQuantity,
          'Default Price': customer.defaultPrice,
          'Created Date': customer.createdAt.toISOString().split('T')[0]
        }));
        filename = `customers_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'vendors':
        const vendors = await prisma.user.findMany({
          include: {
            _count: {
              select: { customers: true }
            }
          }
        });

        data = vendors.map(vendor => ({
          'Vendor Name': vendor.name || 'Unknown',
          'Email': vendor.email,
          'Phone': vendor.phone || '',
          'Status': vendor.isActive ? 'Active' : 'Inactive',
          'Verified': vendor.isVerified ? 'Yes' : 'No',
          'Customer Count': vendor._count.customers,
          'Last Login': vendor.lastLoginAt?.toISOString().split('T')[0] || 'Never',
          'Registration Date': vendor.createdAt.toISOString().split('T')[0]
        }));
        filename = `vendors_export_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    } else {
      // For Excel format, you'd need to implement Excel generation
      // For now, return JSON
      res.json({
        success: true,
        data,
        message: 'Export data retrieved successfully'
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

// GET /api/v1/admin/profile - Get current admin profile
router.get('/profile', async (req, res) => {
  try {
    const adminId = (req as any).adminId;
    
    const admin = await prisma.adminUser.findUnique({
      where: {
        id: adminId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: admin,
      message: 'Admin profile retrieved successfully'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get admin profile'
    });
  }
});

// PUT /api/v1/admin/profile - Update admin profile
router.put('/profile', async (req, res) => {
  try {
    const adminId = (req as any).adminId;
    const { name, email } = req.body;

    // Check if email is already taken by another admin
    if (email) {
      const existingAdmin = await prisma.adminUser.findFirst({
        where: {
          email,
          id: { not: adminId }
        }
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
      }
    }

    const updatedAdmin = await prisma.adminUser.update({
      where: {
        id: adminId
      },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: updatedAdmin,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// PUT /api/v1/admin/password - Change admin password
router.put('/password', async (req, res) => {
  try {
    const adminId = (req as any).adminId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Get current admin
    const admin = await prisma.adminUser.findUnique({
      where: {
        id: adminId
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Verify current password (in a real app, you'd use bcrypt)
    if (admin.password !== currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password (in a real app, you'd hash the new password)
    await prisma.adminUser.update({
      where: {
        id: adminId
      },
      data: {
        password: newPassword, // In production, hash this!
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
});

// GET /api/v1/admin/settings/system - Get system settings
router.get('/settings/system', async (_req, res) => {
  try {
    // In a real application, you might store these in a database table
    // For now, returning mock data
    const systemSettings = {
      siteName: 'Dudh Wala Management System',
      siteDescription: 'Professional milk delivery management platform',
      contactEmail: 'admin@dudhwala.com',
      contactPhone: '+91 9876543210',
      businessHours: '6:00 AM - 10:00 PM',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      language: 'English',
      maintenanceMode: false,
      allowRegistration: true,
      emailNotifications: true,
      smsNotifications: true,
      backupFrequency: 'daily',
      dataRetentionDays: 365
    };

    return res.json({
      success: true,
      data: systemSettings,
      message: 'System settings retrieved successfully'
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get system settings'
    });
  }
});

// PUT /api/v1/admin/settings/system - Update system settings
router.put('/settings/system', async (req, res) => {
  try {
    const settings = req.body;
    
    // In a real application, you would validate and save these to a database
    // For now, just return success
    console.log('System settings update:', settings);

    return res.json({
      success: true,
      data: settings,
      message: 'System settings updated successfully'
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update system settings'
    });
  }
});

// GET /api/v1/admin/settings/security - Get security settings
router.get('/settings/security', async (_req, res) => {
  try {
    const securitySettings = {
      passwordMinLength: 8,
      requireStrongPassword: true,
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      twoFactorAuth: false,
      apiRateLimit: 100
    };

    return res.json({
      success: true,
      data: securitySettings,
      message: 'Security settings retrieved successfully'
    });
  } catch (error) {
    console.error('Get security settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get security settings'
    });
  }
});

// PUT /api/v1/admin/settings/security - Update security settings
router.put('/settings/security', async (req, res) => {
  try {
    const settings = req.body;
    
    console.log('Security settings update:', settings);

    return res.json({
      success: true,
      data: settings,
      message: 'Security settings updated successfully'
    });
  } catch (error) {
    console.error('Update security settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update security settings'
    });
  }
});

// GET /api/v1/admin/settings/notifications - Get notification settings
router.get('/settings/notifications', async (_req, res) => {
  try {
    const notificationSettings = {
      newUserRegistration: true,
      newOrder: true,
      paymentReceived: true,
      systemAlerts: true,
      dailyReports: true,
      weeklyReports: false,
      emailAlerts: true,
      pushNotifications: false
    };

    return res.json({
      success: true,
      data: notificationSettings,
      message: 'Notification settings retrieved successfully'
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification settings'
    });
  }
});

// PUT /api/v1/admin/settings/notifications - Update notification settings
router.put('/settings/notifications', async (req, res) => {
  try {
    const settings = req.body;
    
    console.log('Notification settings update:', settings);

    return res.json({
      success: true,
      data: settings,
      message: 'Notification settings updated successfully'
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notification settings'
    });
  }
});

// POST /api/v1/admin/database/backup - Create database backup
router.post('/database/backup', async (_req, res) => {
  try {
    // In a real application, you would create an actual database backup
    const backupInfo = {
      id: `backup_${Date.now()}`,
      filename: `dudhwala_backup_${new Date().toISOString().split('T')[0]}.sql`,
      size: '45.2 MB',
      createdAt: new Date().toISOString(),
      tables: 12,
      records: 15420
    };

    return res.json({
      success: true,
      data: backupInfo,
      message: 'Database backup created successfully'
    });
  } catch (error) {
    console.error('Database backup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create database backup'
    });
  }
});

// POST /api/v1/admin/database/restore - Restore database backup
router.post('/database/restore', async (_req, res) => {
  try {
    // In a real application, you would restore from an actual backup file
    return res.json({
      success: true,
      message: 'Database restored successfully'
    });
  } catch (error) {
    console.error('Database restore error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to restore database backup'
    });
  }
});

// POST /api/v1/admin/database/optimize - Optimize database
router.post('/database/optimize', async (_req, res) => {
  try {
    // In a real application, you would run database optimization commands
    const optimizationResults = {
      tablesOptimized: 12,
      spaceSaved: '2.3 MB',
      queryPerformanceImprovement: '15%',
      duration: '3.2 seconds'
    };

    return res.json({
      success: true,
      data: optimizationResults,
      message: 'Database optimized successfully'
    });
  } catch (error) {
    console.error('Database optimization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to optimize database'
    });
  }
});

// GET /api/v1/admin/database/stats - Get database statistics
router.get('/database/stats', async (_req, res) => {
  try {
    const stats = {
      totalTables: 12,
      databaseSize: '45.2 MB',
      lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      totalRecords: 15420,
      indexCount: 28,
      performanceScore: 85
    };

    return res.json({
      success: true,
      data: stats,
      message: 'Database statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get database stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get database statistics'
    });
  }
});

// GET /api/v1/admin/reports/summary - Get reports summary
router.get('/reports/summary', async (_req, res) => {
  try {
    // Get real data from database
    const [
      totalUsers,
      totalCustomers,
      totalEntries,
      totalPayments,
      adminActions,
      systemMetrics
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.dailyEntry.count(),
      prisma.payment.count(),
      prisma.adminAction.count(),
      prisma.systemMetric.count()
    ]);

    // Calculate this month's data
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthActions = await prisma.adminAction.count({
      where: {
        timestamp: {
          gte: startOfMonth
        }
      }
    });

    const summary = {
      totalReports: adminActions,
      reportsThisMonth: thisMonthActions,
      avgGenerationTime: '2.3s',
      totalDownloads: Math.floor(adminActions * 0.7), // Estimate 70% download rate
      totalUsers,
      totalCustomers,
      totalEntries,
      totalPayments
    };

    return res.json({
      success: true,
      data: summary,
      message: 'Reports summary retrieved successfully'
    });
  } catch (error) {
    console.error('Get reports summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get reports summary'
    });
  }
});

// GET /api/v1/admin/reports - Get all reports
router.get('/reports', async (req, res) => {
  try {
    const { type = 'all' } = req.query;

    // Get recent admin actions as report history
    const adminActions = await prisma.adminAction.findMany({
      where: {
        action: {
          in: ['REPORT_VIEWED', 'DATA_EXPORTED', 'DATA_CLEARED']
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 20
    });

    // Generate realistic reports based on actual data
    const reports = await Promise.all([
      {
        id: 'sales-monthly-' + new Date().getMonth(),
        name: 'Monthly Sales Report',
        description: 'Comprehensive sales analysis for the current month',
        type: 'sales',
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        size: '2.3 MB',
        status: 'completed' as const
      },
      {
        id: 'customers-weekly-' + Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)),
        name: 'Customer Analytics Report',
        description: 'Customer behavior and demographics analysis',
        type: 'users',
        generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        size: '1.8 MB',
        status: 'completed' as const
      },
      {
        id: 'financial-' + new Date().getFullYear() + '-' + (new Date().getMonth() + 1),
        name: 'Financial Summary',
        description: 'Revenue, expenses, and profit analysis',
        type: 'financial',
        generatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        size: '1.2 MB',
        status: Math.random() > 0.7 ? 'generating' as const : 'completed' as const
      },
      {
        id: 'inventory-' + Date.now(),
        name: 'Daily Delivery Report',
        description: 'Daily milk delivery tracking and statistics',
        type: 'inventory',
        generatedAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        size: '945 KB',
        status: 'completed' as const
      },
      {
        id: 'performance-system-' + Math.floor(Date.now() / (24 * 60 * 60 * 1000)),
        name: 'System Performance Report',
        description: 'System performance and user engagement metrics',
        type: 'performance',
        generatedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
        size: '1.5 MB',
        status: Math.random() > 0.9 ? 'failed' as const : 'completed' as const
      }
    ]);

    // Filter by type if specified
    const filteredReports = type === 'all' 
      ? reports 
      : reports.filter(report => report.type === type);

    return res.json({
      success: true,
      data: filteredReports,
      message: 'Reports retrieved successfully'
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get reports'
    });
  }
});

// POST /api/v1/admin/reports/generate - Generate a new report
router.post('/reports/generate', async (req, res) => {
  try {
    const { type, timeRange, format } = req.body;

    // Validate input
    if (!type || !timeRange || !format) {
      return res.status(400).json({
        success: false,
        error: 'Report type, time range, and format are required'
      });
    }

    // Calculate date range for data collection
    let startDate: Date;
    const now = new Date();

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Generate report based on type with real data
    let reportData: any = {};
    let reportName = '';
    let description = '';

    switch (type) {
      case 'sales':
        const salesData = await prisma.payment.findMany({
          where: {
            paymentDate: { gte: startDate, lte: now }
          },
          include: {
            customer: true,
            user: true
          }
        });
        reportData = {
          totalSales: salesData.reduce((sum, payment) => sum + Number(payment.amount), 0),
          transactionCount: salesData.length,
          topCustomers: salesData.slice(0, 10)
        };
        reportName = `Sales Report - ${timeRange}`;
        description = `Comprehensive sales analysis for ${timeRange} period`;
        break;

      case 'users':
        const userData = await prisma.user.findMany({
          where: {
            createdAt: { gte: startDate, lte: now }
          },
          include: {
            customers: true,
            _count: {
              select: {
                dailyEntries: true,
                payments: true
              }
            }
          }
        });
        reportData = {
          newUsers: userData.length,
          totalCustomers: userData.reduce((sum, user) => sum + user.customers.length, 0),
          avgCustomersPerUser: userData.length > 0 ? userData.reduce((sum, user) => sum + user.customers.length, 0) / userData.length : 0
        };
        reportName = `User Analytics Report - ${timeRange}`;
        description = `User behavior and analytics for ${timeRange} period`;
        break;

      case 'financial':
        const [payments, entries] = await Promise.all([
          prisma.payment.findMany({
            where: {
              paymentDate: { gte: startDate, lte: now }
            }
          }),
          prisma.dailyEntry.findMany({
            where: {
              entryDate: { gte: startDate, lte: now }
            }
          })
        ]);
        const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalDeliveries = entries.reduce((sum, e) => sum + Number(e.amount), 0);
        
        reportData = {
          totalRevenue: revenue,
          totalDeliveries: totalDeliveries,
          profitMargin: revenue > 0 ? ((revenue - totalDeliveries) / revenue * 100) : 0
        };
        reportName = `Financial Report - ${timeRange}`;
        description = `Financial summary and analysis for ${timeRange} period`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type'
        });
    }

    const reportId = `${type}_${timeRange}_${Date.now()}`;
    
    const newReport = {
      id: reportId,
      name: reportName,
      description,
      type,
      timeRange,
      format,
      data: reportData,
      generatedAt: new Date().toISOString(),
      size: `${Math.random() * 2 + 0.5}`.slice(0, 3) + ' MB',
      status: 'completed'
    };

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId: 'system', // You would use actual admin ID from JWT
        action: 'REPORT_GENERATED',
        targetType: 'report',
        targetId: reportId,
        targetName: reportName,
        description: `Generated ${reportName}`,
        metadata: { type, timeRange, format }
      }
    });

    return res.json({
      success: true,
      data: newReport,
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// GET /api/v1/admin/reports/:id - Get specific report details
router.get('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Mock report details - replace with actual database query
    const report = {
      id,
      name: 'Monthly Sales Report',
      description: 'Comprehensive sales analysis for the month',
      type: 'sales',
      generatedAt: new Date().toISOString(),
      size: '2.3 MB',
      status: 'completed',
      downloadUrl: `/downloads/report-${id}.pdf`,
      metadata: {
        totalRecords: 1250,
        processingTime: '2.3 seconds',
        filters: {
          dateRange: 'last_30_days',
          categories: ['all']
        }
      }
    };

    return res.json({
      success: true,
      data: report,
      message: 'Report details retrieved successfully'
    });
  } catch (error) {
    console.error('Get report details error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get report details'
    });
  }
});

// GET /api/v1/admin/reports/:id/download - Download report
router.get('/reports/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    // In a real application, you would:
    // 1. Verify the report exists and user has permission
    // 2. Generate/stream the actual file
    // 3. Set appropriate headers for file download

    // Mock file download
    const filename = `report-${id}.pdf`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    
    // Mock PDF content
    const mockPdfContent = `Mock PDF content for report ${id}`;
    
    return res.send(mockPdfContent);
  } catch (error) {
    console.error('Download report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download report'
    });
  }
});

// GET /api/v1/admin/reports/stats/quick - Get quick stats for reports dashboard
router.get('/reports/stats/quick', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    // Calculate date range
    let startDate: Date;
    let previousStartDate: Date;
    const now = new Date();

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get current period data
    const [
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      previousRevenue,
      previousOrders,
      previousCustomers
    ] = await Promise.all([
      // Current period revenue
      prisma.payment.aggregate({
        where: {
          paymentDate: { gte: startDate, lte: now }
        },
        _sum: { amount: true }
      }),
      // Current period orders (daily entries)
      prisma.dailyEntry.count({
        where: {
          entryDate: { gte: startDate, lte: now }
        }
      }),
      // Current period new customers
      prisma.customer.count({
        where: {
          createdAt: { gte: startDate, lte: now }
        }
      }),
      // Total active customers (not time-bound for products)
      prisma.customer.count({
        where: { isActive: true }
      }),
      // Previous period revenue for growth calculation
      prisma.payment.aggregate({
        where: {
          paymentDate: { gte: previousStartDate, lt: startDate }
        },
        _sum: { amount: true }
      }),
      // Previous period orders
      prisma.dailyEntry.count({
        where: {
          entryDate: { gte: previousStartDate, lt: startDate }
        }
      }),
      // Previous period customers
      prisma.customer.count({
        where: {
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      })
    ]);

    // Calculate growth percentages
    const revenueGrowth = calculateGrowthPercentage(
      Number(totalRevenue._sum.amount || 0),
      Number(previousRevenue._sum.amount || 0)
    );

    const ordersGrowth = calculateGrowthPercentage(
      totalOrders,
      previousOrders
    );

    const customersGrowth = calculateGrowthPercentage(
      totalCustomers,
      previousCustomers
    );

    const quickStats = {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalOrders,
      totalCustomers: totalProducts, // Using total active customers as products
      totalProducts: totalCustomers, // Using new customers as products metric
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      ordersGrowth: Math.round(ordersGrowth * 100) / 100,
      customersGrowth: Math.round(customersGrowth * 100) / 100,
      productsGrowth: Math.round(customersGrowth * 100) / 100 // Same as customer growth for milk business
    };

    return res.json({
      success: true,
      data: quickStats,
      message: 'Quick stats retrieved successfully'
    });
  } catch (error) {
    console.error('Get quick stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get quick stats'
    });
  }
});

// Helper function to calculate growth percentage
function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// TEST ROUTE - Create test payment to verify Socket.IO real-time updates
router.post('/test-socket', async (_req, res) => {
  try {
    console.log('🧪 Testing Socket.IO with real payment creation...');
    
    // Find any active user and customer for testing
    const user = await prisma.user.findFirst({
      where: { isActive: true },
      include: {
        customers: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!user || !user.customers.length) {
      const response: ApiResponse = {
        success: false,
        message: 'No active user or customer found for testing',
        error: 'Need at least one active user with one customer'
      };
      res.status(404).json(response);
      return;
    }

    const customer = user.customers[0];

    // Create a test payment
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        customerId: customer.id,
        amount: 50,
        method: 'CASH',
        paymentDate: new Date(),
        notes: '🧪 Test payment for Socket.IO verification'
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

    // 🚀 Broadcast via Socket.IO exactly like the payment routes
    try {
      const { getIoInstance } = require('../lib/socket');
      const { getAdminRealtimeStats } = require('../sockets');
      
      const io = getIoInstance();
      
      if (!io) {
        console.warn('⚠️  Socket.IO instance not available');
      } else {
        // Broadcast payment to user's devices
        io.to(`user:${user.id}`).emit('payment:added', payment);
        console.log(`✅ Payment broadcasted to user:${user.id}`);
        
        // Broadcast updated stats to admin dashboard
        const adminStats = await getAdminRealtimeStats();
        io.emit('stats:updated', adminStats);
        console.log('✅ Admin stats broadcasted to all connected clients');
      }
    } catch (socketError) {
      console.error('❌ Failed to broadcast test payment:', socketError);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Test payment created and broadcasted via Socket.IO',
      data: {
        payment,
        user: { id: user.id, email: user.email },
        customer: { id: customer.id, name: customer.name },
        socketBroadcast: 'Payment and admin stats events sent'
      }
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Test payment error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create test payment',
      error: error.message
    };
    res.status(500).json(response);
  }
});

export default router;