# GramSeva Backend API

A comprehensive Express.js + MongoDB backend for the GramSeva platform, enabling business funding, investment tracking, and profit distribution.

## Features

- **User Management**: Authentication, authorization, and role-based access control
- **Business Management**: Create, manage, and track businesses seeking funding
- **Investment System**: Investment processing with mock payment verification
- **Performance Tracking**: Quarterly business performance reporting
- **Distribution System**: Automated profit/loss distribution to investors
- **News & Alerts**: Content management and notification system

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Mock Payment System** for investment processing
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GramSeva_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=8000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gramseva?retryWrites=true&w=majority

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here
   JWT_REFRESH_EXPIRE=30d

   # Payment Configuration (Mock Payment System)
   # In production, replace with actual payment gateway integration

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Business Management
- `GET /api/business` - Get all businesses (with filtering)
- `POST /api/business/create` - Create new business (business role)
- `GET /api/business/:id` - Get business details
- `PUT /api/business/:id` - Update business (owner only)
- `DELETE /api/business/:id` - Delete business (owner only)
- `GET /api/business/my/list` - Get user's businesses

### Investment System
- `POST /api/investments/create` - Create investment (investor role)
- `POST /api/investments/verify` - Verify payment (mock verification)
- `GET /api/investments/my` - Get user's investments
- `GET /api/investments/my/:id` - Get investment details
- `GET /api/investments/business/:businessId` - Get business investments
- `PUT /api/investments/cancel/:id` - Cancel investment

### Performance Tracking
- `POST /api/performance/submit` - Submit quarterly performance (business role)
- `GET /api/performance/business/:businessId` - Get business performance history
- `PUT /api/performance/verify/:performanceId` - Verify performance (admin)
- `PUT /api/performance/approve/:performanceId` - Approve performance & create distributions (admin)

### Distribution System
- `GET /api/distributions/my` - Get investor's distributions
- `GET /api/distributions/business/:businessId` - Get business distributions
- `PUT /api/distributions/approve/:distributionId` - Approve distribution (admin)
- `PUT /api/distributions/pay/:distributionId` - Mark distribution as paid (admin)

## User Roles

- **farmer**: Can view businesses and invest
- **business**: Can create and manage businesses
- **investor**: Can invest in businesses
- **admin**: Full system access and management

## Database Models

### User
- Basic user information with role-based access
- Authentication and profile management

### Business
- Business details, funding goals, and location
- GeoJSON support for location-based queries
- Status tracking (open, funded, closed)

### Investment
- Links investors to businesses
- Payment processing with mock verification
- Transaction tracking and status management

### BusinessPerformance
- Quarterly financial reporting
- Revenue, expenses, profit/loss tracking
- Performance metrics and growth calculation

### Distribution
- Profit/loss distribution to investors
- Share percentage calculation
- Payment processing and status tracking

## Security Features

- JWT-based authentication
- Role-based authorization
- Password hashing with bcryptjs
- Input validation and sanitization
- CORS protection
- Rate limiting (configurable)

## Payment Integration

- Mock payment system for development and testing
- Payment verification simulation
- Transaction tracking and refund support
- Easy integration with real payment gateways in production

## Error Handling

- Comprehensive error handling middleware
- Validation error responses
- Database error handling
- Payment processing error handling

## Development

### Running in Development Mode
```bash
npm run dev
```

### Database Seeding
```bash
npm run seed
```

### Testing
```bash
npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a production MongoDB instance
3. Configure proper CORS settings
4. Set up SSL certificates
5. Configure environment variables
6. Set up monitoring and logging

## API Documentation

For detailed API documentation, refer to the Postman collection or use tools like Swagger/OpenAPI.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.