# 🗄️ Database Reset and Seeding Guide

## 🧹 **Complete Database Reset Process**

Follow these steps to completely clean your database and create fresh seeded data:

### **Step 1: Navigate to API Directory**
```powershell
cd "d:\Natraj Technology\Web Dev\Dudh Wala\api"
```

### **Step 2: Reset Database (Choose One Method)**

#### **Method A: Quick Reset (Recommended)**
```powershell
# Reset database schema and push changes
npm run db:push -- --force-reset

# Generate Prisma client
npm run db:generate

# Seed with fresh data
npm run db:seed
```

#### **Method B: Migration Reset (If you have migrations)**
```powershell
# Reset all migrations
npx prisma migrate reset --force

# Generate Prisma client
npm run db:generate

# Seed with fresh data
npm run db:seed
```

#### **Method C: Manual Database Drop (PostgreSQL)**
```powershell
# Connect to PostgreSQL and drop database
psql -U postgres -h localhost

# In psql console:
DROP DATABASE IF EXISTS "milk-management";
CREATE DATABASE "milk-management";
\q

# Then push schema and seed
npm run db:push
npm run db:generate
npm run db:seed
```

### **Step 3: Verify Database Reset**
```powershell
# Open Prisma Studio to check data
npm run db:studio
```

## 🌱 **What Gets Seeded**

Your current seed file creates:

### **Admin Users:**
- Email: `admin@dudhwala.com`
- Password: `admin123`
- Role: Super Admin

### **Demo Users:**
- Email: `demo@dudhwala.com`  
- Password: `demo123`
- Phone: +91 9876543210

### **Sample Data:**
- Demo customers with various delivery schedules
- Sample daily entries for the past week
- Payment records
- Activity logs

## 🚀 **Enhanced Database Scripts**

Let me add some useful database management scripts to your package.json: