const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/reports - Comprehensive analytics reports (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();

    // 1. Sales Summary Metrics
    const [salesTotals] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value,
        COALESCE(SUM(tax), 0) as total_tax_collected,
        COALESCE(SUM(subtotal), 0) as total_subtotal
      FROM sales_orders
    `);

    // 2. Order Summary by Status
    const [ordersByStatus] = await pool.query(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM sales_orders
      GROUP BY status
    `);

    // 3. Top-selling Products by Units Sold and Revenue
    const [topProducts] = await pool.query(`
      SELECT
        p.id, p.sku, p.name, p.category, p.price,
        COALESCE(SUM(oi.quantity), 0) as total_units_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue_generated
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY total_revenue_generated DESC
      LIMIT 5
    `);

    // 4. Sales by Customer
    const [salesByCustomer] = await pool.query(`
      SELECT
        c.id, c.name, c.company, c.city, c.state,
        COUNT(o.id) as orders_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM customers c
      JOIN sales_orders o ON c.id = o.customer_id
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5
    `);

    // 5. Shipment Status Summary (across 6 stages)
    const [shipmentsByStatus] = await pool.query(`
      SELECT
        current_status as status,
        COUNT(*) as count
      FROM shipments
      GROUP BY current_status
    `);

    // 6. Shipments by Courier
    const [shipmentsByCourier] = await pool.query(`
      SELECT
        courier_name,
        COUNT(*) as count,
        COUNT(CASE WHEN current_status = 'Delivered' THEN 1 END) as delivered_count
      FROM shipments
      GROUP BY courier_name
      ORDER BY count DESC
    `);

    // 7. Calculate On-Time / Delivered Rate
    const [deliveryPerformance] = await pool.query(`
      SELECT
        COUNT(*) as total_shipments,
        COUNT(CASE WHEN current_status = 'Delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN current_status != 'Delivered' THEN 1 END) as active_in_pipeline
      FROM shipments
    `);

    const perf = deliveryPerformance[0];
    const deliveryRate = perf.total_shipments > 0
      ? Math.round((perf.delivered_count / perf.total_shipments) * 100)
      : 0;

    res.json({
      success: true,
      sales_summary: {
        ...salesTotals[0],
        sales_by_customer: salesByCustomer,
        top_products: topProducts
      },
      order_summary: {
        by_status: ordersByStatus
      },
      shipment_summary: {
        by_status: shipmentsByStatus,
        by_courier: shipmentsByCourier,
        total_shipments: perf.total_shipments,
        delivered_count: perf.delivered_count,
        active_in_pipeline: perf.active_in_pipeline,
        delivery_rate: deliveryRate
      }
    });
  } catch (err) {
    console.error('Reports generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate analytics reports.' });
  }
});

module.exports = router;
