import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@dudhwala.com' },
    update: {},
    create: {
      email: 'admin@dudhwala.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'SUPER_ADMIN',
      permissions: ['READ', 'WRITE', 'DELETE', 'MANAGE_USERS'],
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', adminUser);

  // Create demo regular user
  const userPassword = await bcrypt.hash('demo123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@dudhwala.com' },
    update: {},
    create: {
      email: 'demo@dudhwala.com',
      password: userPassword,
      name: 'Demo User',
      phone: '+91 9876543210',
      isActive: true,
      isVerified: true,
      timezone: 'Asia/Kolkata',
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    },
  });

  console.log('✅ Demo user created:', demoUser);

  // Create sample customers
  const customers = [
    {
      name: 'Rajesh Kumar',
      phone: '+91 9876543211',
      address: '123 MG Road, Bangalore',
      defaultQuantity: 2.0,
      defaultPrice: 80.0,
      deliveryDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      notes: 'Regular customer since 2023'
    },
    {
      name: 'Priya Sharma',
      phone: '+91 9876543212',
      address: '456 Brigade Road, Bangalore',
      defaultQuantity: 1.5,
      defaultPrice: 85.0,
      deliveryDays: [1, 2, 3, 4, 5], // Monday to Friday
      notes: 'Prefers morning delivery before 8 AM'
    },
    {
      name: 'Sunil Gupta',
      phone: '+91 9876543213',
      address: '789 Indiranagar, Bangalore',
      defaultQuantity: 3.0,
      defaultPrice: 78.0,
      deliveryDays: [0, 1, 2, 3, 4, 5, 6], // Daily
      notes: 'Large family, premium quality required'
    },
    {
      name: 'Anita Singh',
      phone: '+91 9876543214',
      address: '321 Koramangala, Bangalore',
      defaultQuantity: 1.0,
      defaultPrice: 90.0,
      deliveryDays: [1, 3, 5], // Monday, Wednesday, Friday
      notes: 'Organic milk only'
    },
    {
      name: 'Ramesh Patel',
      phone: '+91 9876543215',
      address: '654 Whitefield, Bangalore',
      defaultQuantity: 2.5,
      defaultPrice: 82.0,
      deliveryDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      notes: 'Gate code: 1234'
    }
  ];

  for (const customerData of customers) {
    const customer = await prisma.customer.upsert({
      where: { 
        userId_phone: {
          userId: demoUser.id,
          phone: customerData.phone
        }
      },
      update: {},
      create: {
        ...customerData,
        userId: demoUser.id,
      },
    });
    console.log(`✅ Customer created: ${customer.name}`);
  }

  // Create sample daily entries for the last 7 days
  const customers_created = await prisma.customer.findMany({
    where: { userId: demoUser.id }
  });

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() - i);
    
    for (const customer of customers_created) {
      // Check if this customer has delivery on this day
      const dayOfWeek = entryDate.getDay();
      if (customer.deliveryDays.includes(dayOfWeek)) {
        const quantity = customer.defaultQuantity;
        const pricePerLiter = customer.defaultPrice;
        const amount = parseFloat(quantity.toString()) * parseFloat(pricePerLiter.toString());

        await prisma.dailyEntry.upsert({
          where: {
            userId_customerId_entryDate: {
              userId: demoUser.id,
              customerId: customer.id,
              entryDate: entryDate
            }
          },
          update: {},
          create: {
            userId: demoUser.id,
            customerId: customer.id,
            entryDate: entryDate,
            quantity: quantity,
            productType: 'milk',
            pricePerLiter: pricePerLiter,
            amount: amount,
            notes: i === 0 ? 'Fresh delivery' : null
          }
        });
      }
    }
  }

  console.log('✅ Daily entries created for the last 7 days');

  // Create sample payments
  for (const customer of customers_created) {
    const totalAmount = parseFloat(customer.defaultQuantity.toString()) * 
                       parseFloat(customer.defaultPrice.toString()) * 30; // Monthly amount

    await prisma.payment.create({
      data: {
        userId: demoUser.id,
        customerId: customer.id,
        amount: totalAmount * 0.8, // 80% payment
        method: 'MOBILE',
        reference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
        paymentDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        notes: 'Monthly payment - UPI'
      }
    });
  }

  console.log('✅ Sample payments created');

  // Create system metrics
  const metrics = [
    { metricName: 'total_users', metricValue: 1 },
    { metricName: 'active_users', metricValue: 1 },
    { metricName: 'total_customers', metricValue: customers.length },
    { metricName: 'active_customers', metricValue: customers.length },
    { metricName: 'total_revenue', metricValue: 50000 },
    { metricName: 'monthly_revenue', metricValue: 15000 },
    { metricName: 'total_orders', metricValue: 150 },
    { metricName: 'average_order_value', metricValue: 160 }
  ];

  for (const metric of metrics) {
    await prisma.systemMetric.create({
      data: {
        ...metric,
        metadata: {
          source: 'seed_data',
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  console.log('✅ System metrics created');

  // Create activity logs
  await prisma.activityLog.create({
    data: {
      userId: demoUser.id,
      action: 'APP_OPENED',
      entityType: 'SYSTEM',
      description: 'User opened the application',
      metadata: {
        platform: 'web',
        version: '1.0.0'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Data Generator'
    }
  });

  console.log('✅ Activity logs created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`• Admin user: admin@dudhwala.com (password: admin123)`);
  console.log(`• Demo user: demo@dudhwala.com (password: demo123)`);
  console.log(`• Customers: ${customers.length}`);
  console.log(`• Daily entries: Created for last 7 days`);
  console.log(`• Payments: Sample payments added`);
  console.log(`• System metrics: Initialized`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });