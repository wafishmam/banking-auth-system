// controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// What does each import do?
// bcrypt: Hashes passwords (encrypts them so they can't be read)
// jwt: Creates and verifies JSON Web Tokens
// pool: Our database connection from the config file

// ==================== HELPER FUNCTIONS ====================

// Generate Access Token (short-lived, 15 minutes)
const generateAccessToken = (userId, email) => {
  // What is a JWT?
  // A JWT (JSON Web Token) is a secure way to transmit information
  // It has 3 parts: header.payload.signature
  // The signature proves the token hasn't been tampered with
  
  return jwt.sign(
    { userId, email },           // Payload: data we want to store in the token
    process.env.JWT_SECRET,      // Secret key to sign the token
    { expiresIn: process.env.JWT_EXPIRES_IN }  // Token expires in 15 minutes
  );
};

// Generate Refresh Token (long-lived, 7 days)
const generateRefreshToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_REFRESH_SECRET,  // Different secret for refresh tokens
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );
};

// ==================== SIGNUP ENDPOINT ====================

const signup = async (req, res) => {
  // async/await explained:
  // async: marks this function as asynchronous (can wait for operations)
  // await: pauses execution until a promise resolves (like waiting for database)
  
  try {
    // Extract data from request body
    const { email, password, firstName, lastName } = req.body;
    
    // What is req.body?
    // When a user submits a form, the data comes in the request body
    // Example: { email: "user@example.com", password: "mypassword" }
    
    // Validation: Check if all required fields are provided
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
      // Status 400 = Bad Request (client sent invalid data)
    }
    
    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    // What is $1?
    // It's a placeholder for parameterized queries (prevents SQL injection)
    // The value in the array [email] replaces $1
    // This is safer than string concatenation
    
    if (userExists.rows.length > 0) {
      return res.status(409).json({ 
        error: 'User already exists' 
      });
      // Status 409 = Conflict (resource already exists)
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // What is hashing?
    // Hashing converts password into a random-looking string
    // "mypassword" → "$2b$10$eXaMpLeHaSh..."
    // It's one-way: you can't reverse it back to the original password
    // Salt: random data added to password before hashing (makes it more secure)
    // Salt rounds: how many times to hash (10 is a good balance of security vs speed)
    
    // Insert new user into database
    const newUser = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name',
      [email, hashedPassword, firstName, lastName]
    );
    
    // RETURNING clause: PostgreSQL returns the inserted row data
    // We get back the user ID and other fields (but NOT the password)
    
    const user = newUser.rows[0];
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    
    // Store refresh token in database
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
      [user.id, refreshToken]
    );
    
    // Why store refresh tokens?
    // So we can invalidate them (logout) or check if they've been used
    // Access tokens are NOT stored (they're short-lived)
    
    // Send response with tokens
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      accessToken,
      refreshToken
    });
    // Status 201 = Created (resource successfully created)
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
    // Status 500 = Internal Server Error (something went wrong on our side)
  }
};

// ==================== LOGIN ENDPOINT ====================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
      // Status 401 = Unauthorized (authentication failed)
      // Note: We don't say "user not found" for security reasons
      // Attackers shouldn't know if an email exists in our system
    }
    
    const user = result.rows[0];
    
    // Compare password with hashed password
    const validPassword = await bcrypt.compare(password, user.password);
    
    // How does bcrypt.compare work?
    // It hashes the provided password with the same salt
    // Then compares it to the stored hash
    // Returns true if they match, false otherwise
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    
    // Store refresh token
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
      [user.id, refreshToken]
    );
    
    // Send response
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      accessToken,
      refreshToken
    });
    // Status 200 = OK (request succeeded)
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

// ==================== REFRESH TOKEN ENDPOINT ====================

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required' 
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // What does jwt.verify do?
    // 1. Checks if token signature is valid (hasn't been tampered with)
    // 2. Checks if token hasn't expired
    // 3. Returns the payload (userId, email) if valid
    // 4. Throws an error if invalid or expired
    
    // Check if refresh token exists in database
    const tokenExists = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2',
      [refreshToken, decoded.userId]
    );
    
    if (tokenExists.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid refresh token' 
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId, decoded.email);
    
    res.status(200).json({
      accessToken: newAccessToken
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Invalid or expired refresh token' 
      });
    }
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

// ==================== LOGOUT ENDPOINT ====================

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token required' 
      });
    }
    
    // Delete refresh token from database
    await pool.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );
    
    // Why delete the refresh token?
    // This invalidates it - even if someone steals it, it won't work anymore
    // Access tokens can't be invalidated (they expire naturally after 15 min)
    
    res.status(200).json({
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

// Export all functions so routes can use them
module.exports = {
  signup,
  login,
  refresh,
  logout
};