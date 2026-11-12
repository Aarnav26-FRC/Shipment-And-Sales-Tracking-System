const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

const STAGES = [
  { id: 'Processing', label: 'Processing', description: 'Order verified & manifest generated' },
  { id: 'Packed', label: 'Packed', description: 'Goods packaged and labeled' },
  { id: 'Dispatched', label: 'Dispatched', description: 'Handed over to carrier network' },
  { id: 'In Transit', label: 'In Transit', description: 'En route via transit facilities' },
  { id: 'Out for Delivery', label: 'Out for Delivery', description: 'Courier out on final delivery route' },
  { id: 'Delivered', label: 'Delivered', description: 'Package successfully delivered' }
];

// GET /api/tracking/:trackingNumber - Public & customer tracking endpoint
router.get('/:trackingNumber', async (req, res) => {
  try {
    const rawNumber = req.params.trackingNumber.trim();
    const pool = getPool();

    const [shipments] = await pool.query(
      `SELECT s.*,
              o.order_number, o.total_amount, o.subtotal, o.tax, o.created_at as order_date,
              c.name as customer_name, c.company as customer_company,
              c.city as destination_city, c.state as destination_state
       FROM shipments s
       JOIN sales_orders o ON s.order_id = o.id
       JOIN customers c ON o.customer_id = c.id
       WHERE LOWER(s.tracking_number) = LOWER(?)`,
      [rawNumber]
    );

    if (shipments.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No shipment found matching tracking ID: "${rawNumber}". Please verify and try again.`
      });
    }

    const shipment = shipments[0];

    // Fetch order items
    const [items] = await pool.query(
      `SELECT oi.quantity, oi.unit_price, oi.total_price,
              p.name as product_name, p.sku as product_sku
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [shipment.order_id]
    );

    // Fetch chronological timeline events
    const [events] = await pool.query(
      `SELECT * FROM shipment_tracking WHERE shipment_id = ? ORDER BY created_at DESC`,
      [shipment.id]
    );

    // Calculate stage progress
    const currentStatus = shipment.current_status;
    const stageIndex = STAGES.findIndex(s => s.id === currentStatus);
    const progressPercent = stageIndex >= 0 ? Math.round(((stageIndex + 1) / STAGES.length) * 100) : 0;

    const stagesWithState = STAGES.map((stage, idx) => {
      let state = 'upcoming';
      if (idx < stageIndex) state = 'completed';
      else if (idx === stageIndex) state = 'current';

      // Find matching timestamp from events if any
      const matchingEvent = events.find(e => e.status === stage.id);

      return {
        ...stage,
        state,
        completed_at: matchingEvent ? matchingEvent.created_at : null,
        location: matchingEvent ? matchingEvent.location : null,
        notes: matchingEvent ? matchingEvent.notes : null
      };
    });

    res.json({
      success: true,
      data: {
        tracking_number: shipment.tracking_number,
        current_status: shipment.current_status,
        progress_percent: progressPercent,
        courier_name: shipment.courier_name,
        shipment_date: shipment.shipment_date,
        estimated_delivery_date: shipment.estimated_delivery_date,
        actual_delivery_date: shipment.actual_delivery_date,
        shipping_address: shipment.shipping_address,
        order: {
          order_number: shipment.order_number,
          order_date: shipment.order_date,
          total_amount: shipment.total_amount,
          subtotal: shipment.subtotal,
          tax: shipment.tax,
          customer_name: shipment.customer_name,
          customer_company: shipment.customer_company,
          items: items
        },
        stages: stagesWithState,
        timeline: events
      }
    });
  } catch (err) {
    console.error('Tracking query error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve tracking details.' });
  }
});

module.exports = router;
