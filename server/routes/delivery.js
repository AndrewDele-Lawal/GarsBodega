const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/delivery/:orderId — get delivery plan for an order
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await db.query(
      `
      SELECT
        dp.delivery_id,
        dp.order_id,
        dp.delivery_status,
        dp.estimated_delivery_date,
        o.order_status,
        o.order_total,
        o.order_date,
        o.customer_id,
        c.first_name,
        c.last_name
      FROM DeliveryPlan dp
      JOIN Orders o ON dp.order_id = o.order_id
      JOIN Customer c ON o.customer_id = c.customer_id
      WHERE dp.order_id = $1
      `,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery plan not found for this order' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch delivery plan',
      details: error.message
    });
  }
});

// PATCH /api/delivery/:deliveryId/status — update delivery status
router.patch('/:deliveryId/status', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { delivery_status } = req.body;

    const validStatuses = ['scheduled', 'in transit', 'delivered', 'cancelled'];

    if (!delivery_status) {
      return res.status(400).json({ error: 'delivery_status is required' });
    }

    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // If delivered, also update the parent order status
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const deliveryResult = await client.query(
        `
        UPDATE DeliveryPlan
        SET delivery_status = $1
        WHERE delivery_id = $2
        RETURNING *
        `,
        [delivery_status, deliveryId]
      );

      if (deliveryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery plan not found' });
      }

      const orderId = deliveryResult.rows[0].order_id;

      // Keep order status in sync with delivery status
      let newOrderStatus = null;

      if (delivery_status === 'in transit') newOrderStatus = 'in transit';
      if (delivery_status === 'delivered')  newOrderStatus = 'completed';
      if (delivery_status === 'cancelled')  newOrderStatus = 'cancelled';

      if (newOrderStatus) {
        await client.query(
          `
          UPDATE Orders
          SET order_status = $1
          WHERE order_id = $2
          `,
          [newOrderStatus, orderId]
        );
      }

      await client.query('COMMIT');

      res.json({
        message: `Delivery status updated to "${delivery_status}"`,
        delivery: deliveryResult.rows[0],
        order_status_synced_to: newOrderStatus || 'unchanged'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update delivery status',
      details: error.message
    });
  }
});

// PATCH /api/delivery/:deliveryId/date — update estimated delivery date
router.patch('/:deliveryId/date', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { estimated_delivery_date } = req.body;

    if (!estimated_delivery_date) {
      return res.status(400).json({ error: 'estimated_delivery_date is required' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(estimated_delivery_date)) {
      return res.status(400).json({
        error: 'Date must be in YYYY-MM-DD format'
      });
    }

    const result = await db.query(
      `
      UPDATE DeliveryPlan
      SET estimated_delivery_date = $1
      WHERE delivery_id = $2
      RETURNING *
      `,
      [estimated_delivery_date, deliveryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery plan not found' });
    }

    res.json({
      message: 'Estimated delivery date updated',
      delivery: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update delivery date',
      details: error.message
    });
  }
});

// GET /api/delivery — get all deliveries (staff/admin view)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let queryText = `
      SELECT
        dp.delivery_id,
        dp.order_id,
        dp.delivery_status,
        dp.estimated_delivery_date,
        o.order_status,
        o.order_total,
        o.order_date,
        c.customer_id,
        c.first_name,
        c.last_name
      FROM DeliveryPlan dp
      JOIN Orders o ON dp.order_id = o.order_id
      JOIN Customer c ON o.customer_id = c.customer_id
    `;

    const values = [];

    if (status) {
      queryText += ' WHERE dp.delivery_status = $1';
      values.push(status);
    }

    queryText += ' ORDER BY dp.estimated_delivery_date ASC';

    const result = await db.query(queryText, values);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch deliveries',
      details: error.message
    });
  }
});

module.exports = router;