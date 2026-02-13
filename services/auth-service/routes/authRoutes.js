// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// What is express.Router()?
// Router is like a mini Express app
// It groups related routes together
// Makes code more organized and modular

// ==================== ROUTE DEFINITIONS ====================

// POST /api/auth/signup - Create new user account
router.post('/signup', authController.signup);
// When someone sends a POST request to /signup, 
// it calls the signup function from authController

// POST /api/auth/login - Authenticate user and get tokens
router.post('/login', authController.login);

// POST /api/auth/refresh - Get new access token using refresh token
router.post('/refresh', authController.refresh);

// POST /api/auth/logout - Invalidate refresh token
router.post('/logout', authController.logout);

// Export the router so server.js can use it
module.exports = router;