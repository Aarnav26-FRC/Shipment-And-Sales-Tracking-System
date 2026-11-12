const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const isCustomer = req.user.role === 'customer';
    const customerId = req.user.customer_id;

    if (isCustomer) {
      // Customer specific metrics
      const [orderStats] = await pool.query(
        `SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_spent,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered_orders
         FROM sales_orders WHERE customer_id = ?`,
        [customerId]
      );

      const [shipmentStats] = await pool.query(
        `SELECT
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN s.current_status = 'Delivered' THEN 1 END) as delivered_shipments,
          COUNT(CASE WHEN s.current_status != 'Delivered' THEN 1 END) as pending_shipments
         FROM shipments s
         JOIN sales_orders o ON s.order_id = o.id
         WHERE o.customer_id = ?`,
        [customerId]
      );

      const [recentOrders] = await pool.query(
        `SELECT o.*, c.name as customer_name, c.company as customer_company,
                s.tracking_number, s.current_status as shipment_status
         FROM sales_orders o
         JOIN customers c ON o.customer_id = c.id
         LEFT JOIN shipments s ON s.order_id = o.id
         WHERE o.customer_id = ?
         ORDER BY o.created_at DESC LIMIT 5`,
        [customerId]
      );

      return res.json({
        success: true,
        role: 'customer',
        metrics: {
          total_orders: orderStats[0].total_orders,
          total_spent: orderStats[0].total_spent,
          total_shipments: shipmentStats[0].total_shipments,
          delivered_shipments: shipmentStats[0].delivered_shipments,
          pending_shipments: shipmentStats[0].pending_shipments
        },
        recent_orders: recentOrders
      });
    }

    // Admin metrics
    const [custCount] = await pool.query('SELECT COUNT(*) as cnt FROM customers');
    const [prodCount] = await pool.query('SELECT COUNT(*) as cnt FROM products');
    const [orderCount] = await pool.query('SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total_revenue FROM sales_orders');
    const [shipmentStats] = await pool.query(`
      SELECT
        COUNT(*) as total_shipments,
        COUNT(CASE WHEN current_status = 'Delivered' THEN 1 END) as delivered_shipments,
        COUNT(CASE WHEN current_status != 'Delivered' THEN 1 END) as pending_shipments
      FROM shipments
    `);

    const [recentOrders] = await pool.query(`
      SELECT o.*, c.name as customer_name, c.company as customer_company,
             s.tracking_number, s.current_status as shipment_status
      FROM sales_orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN shipments s ON s.order_id = o.id
      ORDER BY o.created_at DESC
      LIMIT 6
    `);

    const [recentShipments] = await pool.query(`
      SELECT s.*, o.order_number, c.name as customer_name, c.company as customer_company
      FROM shipments s
      JOIN sales_orders o ON s.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      role: 'admin',
      metrics: {
        total_customers: custCount[0].cnt,
        total_products: prodCount[0].cnt,
        total_sales_orders: orderCount[0].cnt,
        total_revenue: orderCount[0].total_revenue,
        total_shipments: shipmentStats[0].total_shipments,
        delivered_shipments: shipmentStats[0].delivered_shipments,
        pending_shipments: shipmentStats[0].pending_shipments
      },
      recent_orders: recentOrders,
      recent_shipments: recentShipments
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics.' });
  }
});

module.exports = router;
