const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
    // Allow requests from localhost (development) and your deployed frontend
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://gramseva-frontend.onrender.com', // Add your deployed frontend URL here
        'https://gramseva.vercel.app', // Add if you deploy to Vercel
        'https://gramseva.netlify.app' // Add if you deploy to Netlify
    ];
    
    const origin = req.headers.origin;
    
    // Allow requests from allowed origins or if no origin (like Postman)
    if (!origin || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, user-id');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});

// Database connection
const MONGODB_URI = 'mongodb+srv://maharshibhattisro_db_user:UpkuqZEye20QSVzv@gramseva.wnrvl4e.mongodb.net/test?retryWrites=true&w=majority&appName=Gramseva';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
});

// Connection event listeners
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during MongoDB disconnection:', error);
        process.exit(1);
    }
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');
const newsRoutes = require('./routes/newsRoutes');
const businessRoutes = require('./routes/businessRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const distributionRoutes = require('./routes/distributionRoutes');
const commodityRoutes = require('./routes/commodityRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/distributions', distributionRoutes);
app.use('/api/commodity', commodityRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'GramSeva Backend Server is running!',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// Health check route
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});