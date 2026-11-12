const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/orders - List orders (Admin sees all; Customer sees only their own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const isCustomer = req.user.role === 'customer';
    const customerId = req.user.customer_id;

    let query = `
      SELECT o.*,
             c.name as customer_name, c.company as customer_company, c.email as customer_email,
             s.id as shipment_id, s.tracking_number, s.current_status as shipment_status,
             s.courier_name,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM sales_orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN shipments s ON s.order_id = o.id
    `;
    const params = [];

    if (isCustomer) {
      query += ` WHERE o.customer_id = ? `;
      params.push(customerId);
    }

    query += ` ORDER BY o.created_at DESC `;

    const [orders] = await pool.query(query, params);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sales orders.' });
  }
});

// GET /api/orders/:id - View order details with items & shipment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const orderId = req.params.id;
    const isCustomer = req.user.role === 'customer';
    const customerId = req.user.customer_id;

    const [orders] = await pool.query(
      `SELECT o.*, c.name as customer_name, c.company as customer_company,
              c.email as customer_email, c.phone as customer_phone,
              c.address as customer_address, c.city as customer_city,
              c.state as customer_state, c.postal_code as customer_postal_code,
              s.id as shipment_id, s.tracking_number, s.current_status as shipment_status,
              s.courier_name, s.estimated_delivery_date
       FROM sales_orders o
       JOIN customers c ON o.customer_id = c.id
       LEFT JOIN shipments s ON s.order_id = o.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];

    // Data isolation check for customer
    if (isCustomer && order.customer_id !== customerId) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own orders.' });
    }

    // Fetch line items
    const [items] = await pool.query(
      `SELECT oi.*, p.name as product_name, p.sku as product_sku, p.category as product_category
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    order.items = items;

    res.json({ success: true, order });
  } catch (err) {
    console.error('Fetch order detail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
});

// POST /api/orders - Create a sales order
router.post('/', authenticateToken, async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    let { customer_id, items, notes } = req.body;

    // If customer role is making order, enforce their own customer_id
    if (req.user.role === 'customer') {
      customer_id = req.user.customer_id;
    }

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    }

    await conn.beginTransaction();

    // Verify customer exists
    const [custs] = await conn.query('SELECT id, name, company FROM customers WHERE id = ?', [customer_id]);
    if (custs.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Selected customer does not exist.' });
    }

    // Validate products, check stock, calculate subtotal
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const { product_id, quantity } = item;
      const qty = parseInt(quantity, 10);

      if (!product_id || isNaN(qty) || qty <= 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid product or quantity specified.' });
      }

      const [prods] = await conn.query('SELECT id, name, sku, price, stock_quantity FROM products WHERE id = ? FOR UPDATE', [product_id]);
      if (prods.length === 0) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: `Product ID ${product_id} not found.` });
      }

      const product = prods[0];
      if (product.stock_quantity < qty) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, requested: ${qty}.`
        });
      }

      const unitPrice = parseFloat(product.price);
      const totalPrice = parseFloat((unitPrice * qty).toFixed(2));
      subtotal += totalPrice;

      validatedItems.push({
        product_id: product.id,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice
      });

      // Decrement product stock
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, product.id]);
    }

    // Auto calculate subtotal, tax (8%), and total amount
    const taxRate = 0.08;
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const grandTotal = parseFloat((subtotal + taxAmount).toFixed(2));

    // Generate unique order number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${new Date().getFullYear()}-${randomSuffix}`;

    // Insert sales order
    const [orderResult] = await conn.query(
      `INSERT INTO sales_orders (order_number, customer_id, subtotal, tax, total_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
      [orderNumber, customer_id, subtotal, taxAmount, grandTotal, notes || 'Standard order processing']
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const vItem of validatedItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, vItem.product_id, vItem.quantity, vItem.unit_price, vItem.total_price]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Sales order created successfully.',
      order: {
        id: orderId,
        order_number: orderNumber,
        customer_id,
        subtotal,
        tax: taxAmount,
        total_amount: grandTotal,
        status: 'Pending',
        item_count: validatedItems.length
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Failed to create sales order.' });
  } finally {
    conn.release();
  }
});

// PATCH /api/orders/:id/status - Update order status (Admin only)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const pool = getPool();
    const [result] = await pool.query('UPDATE sales_orders SET status = ? WHERE id = ?', [status, orderId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: `Order status updated to "${status}".` });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

module.exports = router;
