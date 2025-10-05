# 🥛 Dudh Wala Backend API

A comprehensive Node.js + TypeScript + PostgreSQL backend for the Dudh Wala (Milk Delivery Management System).

## 🚀 Features

### ✅ **Current Implementation**
- **Node.js 18+** with TypeScript for type safety
- **Express.js** RESTful API with async/await
- **PostgreSQL** database with Prisma ORM
- **Socket.io** for real-time updates
- **Firebase Admin SDK** authentication integration
- **Comprehensive validation** with Zod schemas
- **Security middleware** (Helmet, CORS, Rate limiting)
- **Structured logging** with Winston
- **Error handling** with global error middleware
- **API documentation** ready structure

### 🎯 **Business Logic Covered**
- **Multi-tenant architecture** (user-scoped data)
- **Customer Management** (CRUD with delivery schedules)
- **Daily Entry System** (milk delivery tracking)
- **Payment Processing** (multiple payment methods)
- **Activity Logging** (comprehensive audit trail)
- **Security PIN System** (for sensitive operations)
- **Reports & Analytics** (revenue, customer metrics)
- **Real-time Updates** (Socket.io integration)

## 📋 **Prerequisites**

- **Node.js** 18+ 
- **PostgreSQL** 13+
- **Firebase Project** (for authentication)
- **npm** or **yarn**

## 🛠️ **Installation & Setup**

### 1. **Install Dependencies**
```bash
cd backend
npm install
```

### 2. **Environment Configuration**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your actual values
```

### 3. **Database Setup**
```bash
# Generate Prisma client
npm run db:generate

# Push database schema (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 4. **Firebase Setup**
```bash
# 1. Go to Firebase Console → Project Settings → Service Accounts
# 2. Generate new private key (downloads JSON file)
# 3. Copy credentials to .env file:
#    - FIREBASE_PROJECT_ID
#    - FIREBASE_PRIVATE_KEY
#    - FIREBASE_CLIENT_EMAIL
```

## 🚀 **Running the Server**

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Database Management
```bash
# View database in Prisma Studio
npm run db:studio

# Reset database
npm run db:push --force-reset
```

## 📡 **API Endpoints**

### **Base URL**: `http://localhost:3000/api/v1`

### **Authentication**
All endpoints require `Authorization: Bearer <firebase-token>` header.

### **Endpoints Overview**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |
| `GET` | `/customers` | Get all customers |
| `POST` | `/customers` | Create new customer |
| `GET` | `/customers/:id` | Get customer by ID |
| `PUT` | `/customers/:id` | Update customer |
| `DELETE` | `/customers/:id` | Delete customer |
| `GET` | `/daily-entries` | Get daily entries |
| `POST` | `/daily-entries` | Create daily entry |
| `GET` | `/payments` | Get payments |
| `POST` | `/payments` | Record payment |
| `GET` | `/reports` | Get reports & analytics |
| `GET` | `/activity-logs` | Get activity logs |
| `POST` | `/security-pins/setup` | Setup security PIN |

## 🔌 **Socket.io Events**

### **Client → Server**
- `delivery:update` - Update delivery entry
- `payment:add` - Add new payment
- `customer:update` - Update customer info

### **Server → Client**
- `delivery:updated` - Delivery was updated
- `payment:added` - Payment was added
- `stats:updated` - Real-time stats update
- `balance:updated` - Customer balance update
- `error` - Error notification

## 🗄️ **Database Schema**

### **Core Tables**
- **users** - User accounts (Firebase integration)
- **customers** - Customer information & delivery schedules
- **daily_entries** - Daily milk delivery records
- **payments** - Payment transactions
- **activity_logs** - Audit trail (immutable)
- **security_pins** - User security PINs (hashed)

### **Key Features**
- **User-scoped data** (complete isolation)
- **Referential integrity** with foreign keys
- **Calculated fields** (automatic amount calculation)
- **Enum constraints** (payment methods, activity types)
- **Timestamp tracking** (created_at, updated_at)

## 🛡️ **Security Features**

### **Authentication & Authorization**
- Firebase JWT token validation
- User-scoped data access
- Role-based permissions ready

### **Data Security**
- SQL injection prevention (Prisma ORM)
- Input validation (Zod schemas)
- Security headers (Helmet.js)
- Rate limiting (Express Rate Limit)
- CORS configuration

### **Audit & Monitoring**
- Comprehensive activity logging
- Request/response logging
- Error tracking
- Security event logging

## 📊 **API Response Format**

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### **Success Response Example**
```json
{
  "success": true,
  "data": [
    {
      "id": "cust_123",
      "name": "Rajesh Kumar",
      "phone": "9876543210",
      "address": "123 Main Street",
      "defaultQuantity": 2,
      "defaultPrice": 80,
      "deliveryDays": [1, 3, 5],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Customers retrieved successfully"
}
```

### **Error Response Example**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": "Customer name is required",
    "phone": "Phone number must be at least 10 digits"
  }
}
```

## 🧪 **Testing**

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 📝 **Development Guidelines**

### **Code Structure**
```
src/
├── config/          # Configuration files
├── database/        # Database client & migrations
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── services/        # Business logic
├── controllers/     # Request/response handling
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── sockets/         # Socket.io handlers
└── server.ts        # Main server file
```

### **Best Practices**
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Try-catch blocks with proper error responses
- **Validation**: Zod schemas for all inputs
- **Logging**: Structured logging for debugging
- **Security**: Input sanitization and authentication
- **Performance**: Database query optimization
- **Testing**: Unit and integration tests

## 🚀 **Deployment**

### **Environment Variables (Production)**
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="your-super-secure-secret"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
```

### **Docker Deployment**
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### **Build Commands**
```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

## 🔧 **Migration from Firebase**

The backend is designed to seamlessly migrate from your existing Firebase setup:

1. **Data Migration**: Use the provided migration scripts
2. **Authentication**: Firebase tokens work directly
3. **Real-time**: Socket.io replaces Firebase realtime features
4. **Security**: Maintains user data isolation

## 📈 **Performance Optimizations**

- **Database Indexing**: Optimized queries for user-scoped data
- **Connection Pooling**: Prisma connection management
- **Caching Ready**: Redis integration prepared
- **Compression**: Gzip compression for responses
- **Rate Limiting**: Prevents API abuse

## 🔄 **Real-time Features**

- **Live Delivery Updates**: Instant synchronization across devices
- **Payment Notifications**: Real-time payment confirmations
- **Dashboard Updates**: Live statistics and metrics
- **Multi-user Support**: Concurrent operations without conflicts

---

## 🎯 **Next Steps**

1. **Install dependencies**: `npm install`
2. **Setup environment**: Copy and configure `.env`
3. **Setup database**: Run migrations and seed data
4. **Start development**: `npm run dev`
5. **Test API**: Use the health endpoint to verify setup
6. **Integrate frontend**: Update your React Native app to use the API

**Your complete Node.js + PostgreSQL backend is ready for production! 🚀**