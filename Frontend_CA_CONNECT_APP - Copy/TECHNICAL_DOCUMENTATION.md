# 🔧 CA Connect - Technical Documentation

## 📋 Table of Contents
1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Authentication Flow](#authentication-flow)
4. [File Management System](#file-management-system)
5. [Notification System](#notification-system)
6. [Payment Integration](#payment-integration)
7. [Security Implementation](#security-implementation)
8. [Deployment Guide](#deployment-guide)

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  userType: "ca" | "client" | "staff",
  email: String,
  phoneNumber: String,
  name: String,
  profileImage: String,
  isActive: Boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // CA specific fields
  caId: ObjectId, // Reference to CA if staff
  // Client specific fields
  clientId: ObjectId, // Reference to client profile
  approvedBy: ObjectId, // CA who approved this client
  approvalStatus: "pending" | "approved" | "rejected"
}
```

### Clients Collection
```javascript
{
  _id: ObjectId,
  caId: ObjectId, // Reference to CA
  name: String,
  email: String,
  phoneNumber: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  gstNumber: String,
  businessType: String,
  registrationDate: Timestamp,
  isActive: Boolean,
  totalOutstanding: Number,
  totalPaid: Number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Files Collection
```javascript
{
  _id: ObjectId,
  clientId: ObjectId,
  caId: ObjectId,
  fileName: String,
  fileType: "ticket" | "document" | "invoice" | "receipt",
  fileUrl: String,
  fileSize: Number,
  mimeType: String,
  status: "pending" | "approved" | "rejected",
  uploadedBy: ObjectId, // User ID
  approvedBy: ObjectId, // Client ID
  approvalDate: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  metadata: {
    description: String,
    tags: [String],
    category: String
  }
}
```

### Payments Collection
```javascript
{
  _id: ObjectId,
  clientId: ObjectId,
  caId: ObjectId,
  amount: Number,
  paymentType: "received" | "pending" | "overdue",
  paymentMethod: "cash" | "bank_transfer" | "cheque" | "online",
  description: String,
  dueDate: Timestamp,
  paidDate: Timestamp,
  status: "pending" | "paid" | "overdue" | "cancelled",
  referenceNumber: String,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Tasks Collection
```javascript
{
  _id: ObjectId,
  caId: ObjectId,
  assignedTo: ObjectId, // Staff member ID
  assignedBy: ObjectId, // CA or senior staff ID
  title: String,
  description: String,
  priority: "low" | "medium" | "high" | "urgent",
  status: "pending" | "in_progress" | "completed" | "cancelled",
  dueDate: Timestamp,
  completedDate: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  attachments: [{
    fileName: String,
    fileUrl: String
  }]
}
```

### Notifications Collection
```javascript
{
  _id: ObjectId,
  recipientId: ObjectId,
  senderId: ObjectId,
  type: "payment_reminder" | "file_upload" | "task_assignment" | "approval_request",
  title: String,
  message: String,
  data: Object, // Additional data for the notification
  isRead: Boolean,
  readAt: Timestamp,
  createdAt: Timestamp,
  expiresAt: Timestamp
}
```

## 🌐 API Endpoints

### Authentication Endpoints
```javascript
// User Registration
POST /api/auth/register
{
  email: String,
  phoneNumber: String,
  name: String,
  userType: "ca" | "client" | "staff",
  password: String
}

// User Login
POST /api/auth/login
{
  email: String,
  password: String
}

// Verify OTP
POST /api/auth/verify-otp
{
  phoneNumber: String,
  otp: String
}

// Refresh Token
POST /api/auth/refresh-token
{
  refreshToken: String
}
```

### Client Management Endpoints
```javascript
// Get all clients for CA
GET /api/clients
Headers: { Authorization: "Bearer <token>" }
Query: { page: Number, limit: Number, search: String }

// Add new client
POST /api/clients
Headers: { Authorization: "Bearer <token>" }
{
  name: String,
  email: String,
  phoneNumber: String,
  address: Object,
  gstNumber: String,
  businessType: String
}

// Get client details
GET /api/clients/:clientId
Headers: { Authorization: "Bearer <token>" }

// Update client
PUT /api/clients/:clientId
Headers: { Authorization: "Bearer <token>" }
{
  name: String,
  email: String,
  phoneNumber: String,
  address: Object,
  gstNumber: String,
  businessType: String
}

// Delete client
DELETE /api/clients/:clientId
Headers: { Authorization: "Bearer <token>" }
```

### File Management Endpoints
```javascript
// Upload file
POST /api/files/upload
Headers: { Authorization: "Bearer <token>" }
Content-Type: multipart/form-data
{
  clientId: String,
  file: File,
  description: String,
  category: String,
  tags: [String]
}

// Get files for client
GET /api/files/client/:clientId
Headers: { Authorization: "Bearer <token>" }
Query: { status: String, type: String }

// Approve file
PUT /api/files/:fileId/approve
Headers: { Authorization: "Bearer <token>" }
{
  approved: Boolean,
  comments: String
}

// Download file
GET /api/files/:fileId/download
Headers: { Authorization: "Bearer <token>" }
```

### Payment Management Endpoints
```javascript
// Get payments for client
GET /api/payments/client/:clientId
Headers: { Authorization: "Bearer <token>" }
Query: { status: String, startDate: String, endDate: String }

// Add payment
POST /api/payments
Headers: { Authorization: "Bearer <token>" }
{
  clientId: String,
  amount: Number,
  paymentType: String,
  paymentMethod: String,
  description: String,
  dueDate: String
}

// Update payment
PUT /api/payments/:paymentId
Headers: { Authorization: "Bearer <token>" }
{
  amount: Number,
  status: String,
  paidDate: String
}

// Get payment statistics
GET /api/payments/statistics
Headers: { Authorization: "Bearer <token>" }
Query: { period: "daily" | "weekly" | "monthly" | "yearly" }
```

### Task Management Endpoints
```javascript
// Get tasks
GET /api/tasks
Headers: { Authorization: "Bearer <token>" }
Query: { status: String, assignedTo: String }

// Create task
POST /api/tasks
Headers: { Authorization: "Bearer <token>" }
{
  assignedTo: String,
  title: String,
  description: String,
  priority: String,
  dueDate: String
}

// Update task status
PUT /api/tasks/:taskId
Headers: { Authorization: "Bearer <token>" }
{
  status: String,
  completedDate: String
}
```

### Notification Endpoints
```javascript
// Get notifications
GET /api/notifications
Headers: { Authorization: "Bearer <token>" }
Query: { isRead: Boolean, type: String }

// Mark notification as read
PUT /api/notifications/:notificationId/read
Headers: { Authorization: "Bearer <token>" }

// Send notification
POST /api/notifications/send
Headers: { Authorization: "Bearer <token>" }
{
  recipientId: String,
  type: String,
  title: String,
  message: String,
  data: Object
}
```

## 🔐 Authentication Flow

### JWT Token Structure
```javascript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    userId: String,
    userType: String,
    caId: String, // If applicable
    clientId: String, // If applicable
    iat: Number,
    exp: Number
  }
}
```

### Authentication Middleware
```javascript
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

## 📁 File Management System

### File Upload Process
1. **Client-side**: File selection and validation
2. **Server-side**: File processing and storage
3. **Database**: Metadata storage
4. **Notification**: Client notification for approval

### File Storage Structure
```
/uploads/
├── clients/
│   ├── {clientId}/
│   │   ├── documents/
│   │   ├── invoices/
│   │   └── receipts/
└── temp/
    └── {sessionId}/
```

### File Security
- **Access Control**: Role-based file access
- **Encryption**: Files encrypted at rest
- **Virus Scanning**: Automated malware detection
- **Backup**: Regular automated backups

## 🔔 Notification System

### Push Notification Types
1. **Payment Reminders**: Automated payment due notifications
2. **File Uploads**: New file notifications for clients
3. **Task Assignments**: Staff task assignment notifications
4. **Approval Requests**: File approval requests

### FCM Integration
```javascript
const sendPushNotification = async (token, notification) => {
  const message = {
    token: token,
    notification: {
      title: notification.title,
      body: notification.message
    },
    data: notification.data,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channel_id: 'ca_connect_channel'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
```

## 💳 Payment Integration

### Payment Gateway Integration
```javascript
// Razorpay Integration Example
const createPayment = async (amount, currency, receipt) => {
  const options = {
    amount: amount * 100, // Convert to paise
    currency: currency,
    receipt: receipt,
    payment_capture: 1
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    throw new Error('Payment creation failed');
  }
};
```

### Payment Status Tracking
- **Pending**: Payment initiated but not completed
- **Processing**: Payment being processed
- **Completed**: Payment successful
- **Failed**: Payment failed
- **Refunded**: Payment refunded

## 🔒 Security Implementation

### Data Encryption
```javascript
// AES-256 encryption for sensitive data
const encryptData = (data, key) => {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptData = (encryptedData, key) => {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

### Input Validation
```javascript
const { body, validationResult } = require('express-validator');

const validateClient = [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('phoneNumber').matches(/^[0-9]{10}$/),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

## 🚀 Deployment Guide

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/ca_connect
# or
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Gateway
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Production Deployment Checklist
- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] SSL certificates installed
- [ ] CDN configured for file delivery
- [ ] Monitoring and logging setup
- [ ] Error tracking configured
- [ ] Performance optimization completed
- [ ] Security audit performed

### Docker Configuration
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

---

**This technical documentation provides a comprehensive guide for developers implementing the CA Connect application. For additional support, refer to the API documentation or contact the development team.** 