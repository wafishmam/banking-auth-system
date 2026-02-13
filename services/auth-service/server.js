// server.js

// Load environment variables from .env file
require('dotenv').config();

// What does dotenv.config() do?
// Reads the .env file and loads variables into process.env
// Must be called BEFORE accessing any process.env variables

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

// Create Express application
const app = express();

// What is Express?
// Express is a web framework for Node.js
// It simplifies creating web servers and APIs
// Handles routing, middleware, request/response

// Get port from environment variable or default to 3001
const PORT = process.env.PORT || 3001;

// ==================== MIDDLEWARE ====================

// CORS - Cross-Origin Resource Sharing
app.use(cors());

// What is CORS?
// Browsers block requests from one domain to another (security feature)
// Example: Frontend on localhost:3000 can't call API on localhost:3001
// cors() middleware allows cross-origin requests
// In production, you'd configure which domains are allowed

// Parse JSON request bodies
app.use(express.json());

// What does express.json() do?
// Parses incoming JSON data from request body
// Converts it to JavaScript object and attaches to req.body
// Without this, req.body would be undefined

// Parse URL-encoded request bodies (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// What is URL-encoded?
// Data format used by HTML forms: key1=value1&key2=value2
// extended: true allows rich objects and arrays

// ==================== ROUTES ====================

// Mount auth routes at /api/auth
app.use('/api/auth', authRoutes);

// What does app.use() do?
// Mounts middleware or routes at a specific path
// All routes in authRoutes will be prefixed with /api/auth
// So router.post('/signup') becomes POST /api/auth/signup

// Health check endpoint (useful for monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Auth Service',
    timestamp: new Date().toISOString()
  });
});

// What is a health check?
// Simple endpoint that returns OK if service is running
// Used by monitoring tools, load balancers, etc.
// Example: AWS checks this endpoint to know if server is alive

// 404 handler - catch all undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found' 
  });
});

// What is a 404 handler?
// Catches requests to routes that don't exist
// This runs if no other route matches the request
// Example: GET /api/nonexistent → 404 error

// ==================== ERROR HANDLER ====================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// What is a global error handler?
// Catches any errors that weren't handled elsewhere
// Must have 4 parameters (err, req, res, next)
// In development, we show error details; in production, we hide them

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});

// What does app.listen() do?
// Starts the server and listens for incoming requests on the specified port
// The callback runs once the server successfully starts

// Export app for testing purposes
module.exports = app;