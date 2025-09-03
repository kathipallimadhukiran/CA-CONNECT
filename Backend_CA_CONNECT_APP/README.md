# CA Connect App Backend

A comprehensive Node.js backend API for the CA Connect App, designed specifically for Chartered Accountants (CAs) to manage their professional services and tasks.

## Features

- **CA Authentication & Authorization**: JWT-based authentication for CA users
- **CA Profile Management**: Professional details, service offerings, availability scheduling
- **Task Management**: Work assignment, progress tracking, milestone management
- **Payment Processing**: Financial transaction management, invoice generation
- **File Management**: Document upload and sharing for tasks
- **Dashboard & Analytics**: Performance metrics and task overview

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer (ready for implementation)

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   cd Backend_CA_CONNECT_APP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Database Setup**
   - Ensure MongoDB is running
   - Update `MONGODB_URI` in your `.env` file
   - The database will be created automatically on first run

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://kathipallimadhu_db_user:y2BVxgBUIAN6vKMN@caconnectapp.mvddfk7.mongodb.net/

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - CA registration
- `POST /api/auth/login` - CA login
- `GET /api/auth/me` - Get current CA profile
- `PUT /api/auth/profile` - Update CA profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - CA logout

### CA Management
- `GET /api/ca/profile` - Get CA profile
- `PUT /api/ca/profile` - Update CA profile
- `POST /api/ca/services` - Update CA services
- `GET /api/ca/tasks` - Get CA's tasks
- `POST /api/ca/tasks` - Create new task
- `PUT /api/ca/tasks/:taskId/status` - Update task status
- `GET /api/ca/dashboard` - Get CA dashboard data

### Task Management
- `GET /api/task/:taskId` - Get task details
- `PUT /api/task/:taskId` - Update task details
- `DELETE /api/task/:taskId` - Delete task
- `POST /api/task/:taskId/files` - Upload files
- `DELETE /api/task/:taskId/files/:fileId` - Delete file
- `POST /api/task/:taskId/milestones` - Add milestone
- `PUT /api/task/:taskId/milestones/:milestoneId` - Update milestone

### Payment Management
- `GET /api/payment/task/:taskId` - Get payment details
- `POST /api/payment/create` - Create payment
- `PUT /api/payment/:paymentId/status` - Update payment status
- `POST /api/payment/:paymentId/refund` - Process refund
- `GET /api/payment/history` - Get payment history
- `GET /api/payment/dashboard` - Get payment dashboard

## Database Models

### User
- Basic CA information (email, password, name, phone)
- Authentication and profile data

### CA
- Professional details (specialization, experience, qualification)
- Service offerings and pricing
- Availability schedule
- Rating and verification status

### Task
- Work assignment details
- Status tracking and milestones
- File attachments
- Payment status

### Payment
- Financial transaction records
- Payment method and status
- Invoice and receipt generation

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Express-validator for request validation
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: API rate limiting to prevent abuse
- **Helmet**: Security headers for Express applications

## Development

### Running Tests
```bash
npm test
```

### Code Structure
```
Backend_CA_CONNECT_APP/
├── models/          # Database models
├── routes/          # API route handlers
├── middleware/      # Custom middleware
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

### Adding New Features
1. Create/update models in `models/` directory
2. Add routes in `routes/` directory
3. Update middleware if needed
4. Test thoroughly before deployment

## Deployment

### Production Considerations
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure proper CORS origins
- Set up MongoDB Atlas or production MongoDB instance
- Use environment variables for sensitive data
- Implement proper logging and monitoring

### Docker Support (Future)
- Dockerfile and docker-compose.yml can be added
- Containerized deployment for scalability

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Write clear documentation
5. Test your changes thoroughly

## License

MIT License - see LICENSE file for details

## Support

For technical support or questions, please refer to the project documentation or create an issue in the repository.

## Changelog

### v2.0.0
- Simplified to CA-only system
- Removed client and staff interfaces
- Streamlined authentication and authorization
- Focused task and payment management for CAs

### v1.0.0
- Initial release with multi-role system
- Complete authentication system
- CA and Client management
- Task and payment systems
- File upload support
- Messaging and rating systems 