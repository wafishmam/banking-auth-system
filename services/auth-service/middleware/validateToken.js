// middleware/validateToken.js

const jwt = require('jsonwebtoken');

// What is middleware?
// Middleware functions have access to:
// - req (request object): incoming data from client
// - res (response object): what we send back
// - next (function): passes control to the next middleware/route
//
// Middleware can:
// 1. Execute code
// 2. Modify req/res objects
// 3. End the request-response cycle
// 4. Call the next middleware

const validateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    
    // What is the Authorization header?
    // HTTP requests have headers (metadata about the request)
    // Authorization header format: "Bearer <token>"
    // Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access token required' 
      });
    }
    
    // Extract token from "Bearer <token>" format
    const token = authHeader.split(' ')[1];
    // split(' ') splits string by spaces: ["Bearer", "actual-token"]
    // [1] gets the second element (the token)
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Invalid token format' 
      });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    
    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    
    // Why attach to req.user?
    // Now all subsequent middleware and routes can access user info
    // Example: In a route, you can use req.user.userId to know who made the request
    
    // Call next() to pass control to the next middleware/route
    next();
    
    // What is next()?
    // It's a callback function that moves to the next step
    // Without calling next(), the request hangs (no response sent)
    
  } catch (error) {
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }
    
    console.error('Token validation error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

// Export the middleware
module.exports = validateToken;