const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/products - List all products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [products] = await pool.query(`
      SELECT p.*,
             CASE
               WHEN p.stock_quantity = 0 THEN 'Out of Stock'
               WHEN p.stock_quantity <= 10 THEN 'Low Stock'
               ELSE 'In Stock'
             END as stock_status,
             COUNT(oi.id) as orders_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY p.name ASC
    `);
    res.json({ success: true, products });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product: products[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
});

// POST /api/products - Add product (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { sku, name, description, category, price, stock_quantity } = req.body;

    if (!name || price === undefined || stock_quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Name, price, and stock quantity are required.' });
    }

    const pool = getPool();
    // Auto-generate SKU if not provided
    const finalSku = sku && sku.trim() ? sku.trim().toUpperCase() : `PRD-${Date.now().toString().slice(-6)}`;

    // Check SKU uniqueness
    const [existing] = await pool.query('SELECT id FROM products WHERE sku = ?', [finalSku]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists.' });
    }

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock_quantity, 10);

    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
    }
    if (isNaN(numStock) || numStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative integer.' });
    }

    const [result] = await pool.query(
      `INSERT INTO products (sku, name, description, category, price, stock_quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [finalSku, name.trim(), description || '', category || 'General', numPrice, numStock]
    );

    const [newProd] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: newProd[0]
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// PUT /api/products/:id - Update product (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { sku, name, description, category, price, stock_quantity } = req.body;
    const productId = req.params.id;

    if (!name || price === undefined || stock_quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Name, price, and stock quantity are required.' });
    }

    const pool = getPool();

    if (sku) {
      const [existing] = await pool.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku.trim().toUpperCase(), productId]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Another product already has this SKU.' });
      }
    }

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock_quantity, 10);

    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
    }
    if (isNaN(numStock) || numStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative integer.' });
    }

    await pool.query(
      `UPDATE products
       SET sku = COALESCE(?, sku), name = ?, description = ?, category = ?, price = ?, stock_quantity = ?
       WHERE id = ?`,
      [sku ? sku.trim().toUpperCase() : null, name.trim(), description || '', category || 'General', numPrice, numStock, productId]
    );

    const [updatedProd] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProd[0]
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const pool = getPool();

    // Check if product is in order items
    const [orders] = await pool.query('SELECT id FROM order_items WHERE product_id = ?', [productId]);
    if (orders.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product: it exists in ${orders.length} active or historical sales order(s).`
      });
    }

    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [productId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

module.exports = router;
