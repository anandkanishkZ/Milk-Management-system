# 🥛 Milk Management System

A comprehensive milk delivery management system built with React Native (Expo) and Node.js, designed for milk vendors to efficiently manage customers, deliveries, and payments.

## 📱 Features

### Mobile App (React Native + Expo)
- **Customer Management**: Add, edit, and manage customer profiles
- **Daily Deliveries**: Record daily milk deliveries with flexible quantity controls
- **Payment Tracking**: Track payments, outstanding balances, and payment history
- **Real-time Updates**: Socket.io integration for real-time delivery updates
- **Reports**: Generate delivery and payment reports
- **Security**: PIN-based authentication for backdated entries
- **Cross-platform**: Works on both iOS and Android

### Backend API (Node.js + Express)
- **RESTful API**: Complete REST API for all operations
- **Real-time Communication**: Socket.io for real-time updates
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication
- **Security**: Input validation, error handling, and security middleware
- **Logging**: Comprehensive logging system

## 🛠️ Tech Stack

### Frontend (Mobile)
- **React Native** with Expo SDK 54
- **Expo Router** for navigation
- **TypeScript** for type safety
- **Socket.io Client** for real-time updates
- **AsyncStorage** for local data persistence
- **Expo Vector Icons** for UI icons

### Backend (API)
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** database
- **Prisma ORM** for database operations
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Winston** for logging
- **Joi** for input validation

## 📁 Project Structure

```
├── api/                    # Backend API
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── database/      # Database client and utilities
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic services
│   │   ├── sockets/       # Socket.io handlers
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   ├── prisma/           # Database schema and migrations
│   └── package.json
│
├── mobile/               # React Native Mobile App
│   ├── app/             # Expo Router pages
│   ├── components/      # Reusable components
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Expo CLI (`npm install -g @expo/cli`)
- Git

### Backend Setup

1. **Navigate to API directory**
   ```bash
   cd api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/milk_management"
   JWT_SECRET="your-jwt-secret-key"
   PORT=3000
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Mobile App Setup

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update with your API endpoint:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.19:3000
   ```

4. **Start Expo Development Server**
   ```bash
   npm run dev
   ```

5. **Run on Device/Simulator**
   - Install Expo Go app on your phone
   - Scan QR code to run the app
   - Or use `npm run android` / `npm run ios` for simulators

## 🔧 Configuration

### API Configuration
- **Port**: Default 3000 (configurable via PORT env variable)
- **Database**: PostgreSQL connection via DATABASE_URL
- **JWT**: Secret key for authentication via JWT_SECRET
- **CORS**: Configured for cross-origin requests

### Mobile Configuration
- **API Endpoint**: Configure in `.env` file
- **Real-time**: Socket.io connection to backend
- **Storage**: AsyncStorage for local data persistence

## 📊 Database Schema

The system uses PostgreSQL with the following main entities:
- **Users**: System users and authentication
- **Customers**: Milk delivery customers
- **DailyEntries**: Daily milk delivery records
- **Payments**: Payment transactions
- **ActivityLogs**: System activity tracking
- **SecurityPins**: PIN-based security for sensitive operations

## 🔒 Security Features

- **JWT Authentication**: Secure API access
- **PIN Protection**: Additional security for backdated entries
- **Session Management**: Automatic logout on session expiry
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses

## 📱 Mobile App Features

### Daily Deliveries
- **Quick Quantity Selection**: Preset buttons for 1L-5L
- **Half-liter Increments**: Support for 0.5L, 1.5L, 2.5L quantities
- **Direct Editing**: Tap quantity to edit precisely
- **Cross-platform Modal**: Works on both iOS and Android

### Customer Management
- **Add Customers**: Complete customer profiles
- **Edit Information**: Update customer details
- **Delete Customers**: Remove inactive customers
- **Search & Filter**: Find customers quickly

### Payment Tracking
- **Record Payments**: Track all payment transactions
- **Outstanding Balances**: Monitor pending payments
- **Payment History**: View payment records
- **Reports**: Generate payment reports

## 🔄 Real-time Features

- **Live Delivery Updates**: Real-time sync across devices
- **Socket.io Integration**: Efficient real-time communication
- **Connection Management**: Automatic reconnection handling
- **Event Broadcasting**: Notify all connected clients

## 🧪 Testing

### Backend Testing
```bash
cd api
npm test
npm run test:watch
```

### Mobile Testing
```bash
cd mobile
npm run typecheck
npm run lint
```

## 📦 Building for Production

### Backend Production Build
```bash
cd api
npm run build
npm run start:prod
```

### Mobile Production Build
```bash
cd mobile
npm run build:apk      # Android APK
npm run build:aab      # Android App Bundle
eas build --platform ios  # iOS build
```

## 🚀 Deployment

### Backend Deployment
- Deploy to platforms like Railway, Render, or AWS
- Set environment variables in production
- Configure PostgreSQL database
- Set up SSL certificates

### Mobile Deployment
- **Android**: Upload to Google Play Store
- **iOS**: Upload to Apple App Store
- **Expo Updates**: Over-the-air updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Natraj Technology** - Initial work

## 🙏 Acknowledgments

- React Native and Expo communities
- Node.js and Express.js communities
- PostgreSQL and Prisma teams
- Socket.io team for real-time capabilities

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact: [Your Contact Information]

---

**Made with ❤️ by Natraj Technology**