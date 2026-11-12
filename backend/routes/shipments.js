const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/shipments - List shipments (role filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const isCustomer = req.user.role === 'customer';
    const customerId = req.user.customer_id;

    let query = `
      SELECT s.*,
             o.order_number, o.total_amount as order_total, o.created_at as order_created_at,
             c.id as customer_id, c.name as customer_name, c.company as customer_company
      FROM shipments s
      JOIN sales_orders o ON s.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
    `;
    const params = [];

    if (isCustomer) {
      query += ` WHERE o.customer_id = ? `;
      params.push(customerId);
    }

    query += ` ORDER BY s.created_at DESC `;

    const [shipments] = await pool.query(query, params);
    res.json({ success: true, shipments });
  } catch (err) {
    console.error('Fetch shipments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch shipments.' });
  }
});

// GET /api/shipments/:id - Get shipment detail with tracking events
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const isCustomer = req.user.role === 'customer';
    const customerId = req.user.customer_id;

    const [shipments] = await pool.query(`
      SELECT s.*,
             o.order_number, o.total_amount, o.status as order_status,
             c.id as customer_id, c.name as customer_name, c.company as customer_company,
             c.phone as customer_phone, c.email as customer_email
      FROM shipments s
      JOIN sales_orders o ON s.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (shipments.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    const shipment = shipments[0];
    if (isCustomer && shipment.customer_id !== customerId) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own shipments.' });
    }

    // Fetch tracking history events
    const [events] = await pool.query(
      `SELECT * FROM shipment_tracking WHERE shipment_id = ? ORDER BY created_at DESC`,
      [shipment.id]
    );
    shipment.events = events;

    res.json({ success: true, shipment });
  } catch (err) {
    console.error('Fetch shipment error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch shipment details.' });
  }
});

// POST /api/shipments - Create shipment for an order (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const { order_id, courier_name, shipment_date, estimated_delivery_date, shipping_address } = req.body;

    if (!order_id || !courier_name || !shipment_date || !estimated_delivery_date) {
      return res.status(400).json({ success: false, message: 'Order, courier, shipment date, and estimated delivery date are required.' });
    }

    await conn.beginTransaction();

    // Check if order exists and does not already have an active shipment
    const [orders] = await conn.query(
      `SELECT o.*, c.address, c.city, c.state, c.postal_code, c.company
       FROM sales_orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ? FOR UPDATE`,
      [order_id]
    );

    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    const order = orders[0];

    const [existingShipment] = await conn.query('SELECT id, tracking_number FROM shipments WHERE order_id = ?', [order_id]);
    if (existingShipment.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Order ${order.order_number} already has a shipment registered (Tracking ID: ${existingShipment[0].tracking_number}).`
      });
    }

    // Generate unique tracking number
    let courierCode = 'EXP';
    const cUpper = courier_name.toUpperCase();
    if (cUpper.includes('FEDEX')) courierCode = 'FEDEX';
    else if (cUpper.includes('DHL')) courierCode = 'DHL';
    else if (cUpper.includes('UPS')) courierCode = 'UPS';
    else if (cUpper.includes('BLUE')) courierCode = 'BLUD';
    else if (cUpper.includes('SPEED')) courierCode = 'SPD';

    const randomTrackDigits = Math.floor(10000 + Math.random() * 90000);
    const trackingNumber = `TRK-${courierCode}-${randomTrackDigits}`;

    const finalAddress = shipping_address && shipping_address.trim()
      ? shipping_address.trim()
      : `${order.address}, ${order.city}, ${order.state} ${order.postal_code}`;

    // Create shipment
    const [shipmentResult] = await conn.query(
      `INSERT INTO shipments (tracking_number, order_id, courier_name, shipment_date, estimated_delivery_date, current_status, shipping_address)
       VALUES (?, ?, ?, ?, ?, 'Processing', ?)`,
      [trackingNumber, order_id, courier_name.trim(), shipment_date, estimated_delivery_date, finalAddress]
    );

    const shipmentId = shipmentResult.insertId;

    // Insert first event in shipment_tracking
    await conn.query(
      `INSERT INTO shipment_tracking (shipment_id, status, location, notes)
       VALUES (?, 'Processing', 'Main Fulfillment Warehouse', 'Shipment record created and dispatch queue scheduled')`,
      [shipmentId]
    );

    // Update sales order status to Processing if it was Pending
    if (order.status === 'Pending') {
      await conn.query(`UPDATE sales_orders SET status = 'Processing' WHERE id = ?`, [order_id]);
    }

    await conn.commit();

    const [newShipment] = await pool.query(
      `SELECT s.*, o.order_number, c.name as customer_name, c.company as customer_company
       FROM shipments s
       JOIN sales_orders o ON s.order_id = o.id
       JOIN customers c ON o.customer_id = c.id
       WHERE s.id = ?`,
      [shipmentId]
    );

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully.',
      shipment: newShipment[0]
    });
  } catch (err) {
    await conn.rollback();
    console.error('Create shipment error:', err);
    res.status(500).json({ success: false, message: 'Failed to create shipment.' });
  } finally {
    conn.release();
  }
});

// PATCH /api/shipments/:id/status - Update shipment status and log event (Admin only)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const { status, location, notes } = req.body;
    const shipmentId = req.params.id;

    const validStatuses = ['Processing', 'Packed', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid shipment status. Allowed: ${validStatuses.join(', ')}`
      });
    }

    await conn.beginTransaction();

    const [shipments] = await conn.query('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [shipmentId]);
    if (shipments.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    const shipment = shipments[0];
    const isDelivered = status === 'Delivered';

    // Update shipment table
    if (isDelivered) {
      await conn.query(
        `UPDATE shipments
         SET current_status = ?, actual_delivery_date = CURRENT_DATE
         WHERE id = ?`,
        [status, shipmentId]
      );

      // Also update sales order to Delivered
      await conn.query(`UPDATE sales_orders SET status = 'Delivered' WHERE id = ?`, [shipment.order_id]);
    } else if (['Dispatched', 'In Transit', 'Out for Delivery'].includes(status)) {
      await conn.query(
        `UPDATE shipments SET current_status = ? WHERE id = ?`,
        [status, shipmentId]
      );
      // Keep sales order marked as Shipped
      await conn.query(`UPDATE sales_orders SET status = 'Shipped' WHERE id = ?`, [shipment.order_id]);
    } else {
      await conn.query(
        `UPDATE shipments SET current_status = ? WHERE id = ?`,
        [status, shipmentId]
      );
    }

    // Insert tracking event
    const eventLocation = location && location.trim() ? location.trim() : 'Logistics Operations Center';
    const eventNotes = notes && notes.trim()
      ? notes.trim()
      : `Status updated to ${status}`;

    await conn.query(
      `INSERT INTO shipment_tracking (shipment_id, status, location, notes)
       VALUES (?, ?, ?, ?)`,
      [shipmentId, status, eventLocation, eventNotes]
    );

    await conn.commit();

    const [updatedShipment] = await pool.query('SELECT * FROM shipments WHERE id = ?', [shipmentId]);

    res.json({
      success: true,
      message: `Shipment status updated to "${status}".`,
      shipment: updatedShipment[0]
    });
  } catch (err) {
    await conn.rollback();
    console.error('Update shipment status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update shipment status.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
