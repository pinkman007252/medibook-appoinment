require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { setupDatabase } = require('./config/db');

// Connect Database
setupDatabase();

const app = express();

// Middleware
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000',
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, message: 'Too many requests from this IP, please try again later' }
});
app.use('/api/', limiter);

const path = require('path');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/patients', require('./routes/patients'));

// Serving Frontend Static Files
const buildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(buildPath));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Unified App running on http://localhost:${PORT}`);
});
