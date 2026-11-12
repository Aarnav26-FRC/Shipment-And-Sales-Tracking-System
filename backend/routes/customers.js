const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/customers - List all customers with orders count and total spent
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [customers] = await pool.query(`
      SELECT c.*,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN sales_orders o ON c.id = o.customer_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, customers });
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [customers] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    res.json({ success: true, customer: customers[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer.' });
  }
});

// POST /api/customers - Add customer (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, company, address, city, state, postal_code } = req.body;

    if (!name || !email || !phone || !company || !address || !city || !state || !postal_code) {
      return res.status(400).json({ success: false, message: 'All customer fields are required.' });
    }

    const pool = getPool();
    // Check email uniqueness
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A customer with this email already exists.' });
    }

    const [result] = await pool.query(
      `INSERT INTO customers (name, email, phone, company, address, city, state, postal_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), company.trim(), address.trim(), city.trim(), state.trim(), postal_code.trim()]
    );

    const [newCust] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Customer added successfully',
      customer: newCust[0]
    });
  } catch (err) {
    console.error('Add customer error:', err);
    res.status(500).json({ success: false, message: 'Failed to add customer.' });
  }
});

// PUT /api/customers/:id - Edit customer (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, company, address, city, state, postal_code } = req.body;
    const customerId = req.params.id;

    if (!name || !email || !phone || !company || !address || !city || !state || !postal_code) {
      return res.status(400).json({ success: false, message: 'All customer fields are required.' });
    }

    const pool = getPool();
    // Check if email belongs to another customer
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ? AND id != ?', [email.trim().toLowerCase(), customerId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Another customer is already using this email.' });
    }

    await pool.query(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?, company = ?, address = ?, city = ?, state = ?, postal_code = ?
       WHERE id = ?`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), company.trim(), address.trim(), city.trim(), state.trim(), postal_code.trim(), customerId]
    );

    const [updatedCust] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);

    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer: updatedCust[0]
    });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
});

// DELETE /api/customers/:id - Delete customer (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const customerId = req.params.id;
    const pool = getPool();

    // Check if customer has orders
    const [orders] = await pool.query('SELECT id FROM sales_orders WHERE customer_id = ?', [customerId]);
    if (orders.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer: they currently have ${orders.length} associated sales order(s). Delete or reassign orders first.`
      });
    }

    const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [customerId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
});

module.exports = router;
