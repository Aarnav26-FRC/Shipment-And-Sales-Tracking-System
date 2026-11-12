const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      `SELECT u.*, c.name as customer_name, c.company as customer_company
       FROM users u
       LEFT JOIN customers c ON u.customer_id = c.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customer_id: user.customer_id,
      customer_company: user.customer_company
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /api/auth/demo-users
router.get('/demo-users', (req, res) => {
  res.json({
    success: true,
    users: [
      { role: 'admin', email: 'admin@tracking.com', password: 'admin123', label: 'Admin (Full Management)' },
      { role: 'customer', email: 'customer@acme.com', password: 'customer123', label: 'Customer (Acme Industrial)' },
      { role: 'customer', email: 'techcorp@tracking.com', password: 'customer123', label: 'Customer (TechCorp Solutions)' }
    ]
  });
});

module.exports = router;
