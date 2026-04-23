const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/customers/:customerId — get customer profile
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await db.query(
      `
      SELECT
        customer_id,
        first_name,
        middle_name,
        last_name,
        account_balance
      FROM Customer
      WHERE customer_id = $1
      `,
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch customer',
      details: error.message
    });
  }
});

// GET /api/customers/:customerId/orders — get full order history
router.get('/:customerId/orders', async (req, res) => {
  try {
    const { customerId } = req.params;

    const customerCheck = await db.query(
      'SELECT customer_id FROM Customer WHERE customer_id = $1',
      [customerId]
    );

    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await db.query(
      `
      SELECT
        o.order_id,
        o.order_total,
        o.order_status,
        o.order_date,
        dp.delivery_status,
        dp.estimated_delivery_date,
        COUNT(oi.product_id) AS item_count
      FROM Orders o
      LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
      LEFT JOIN OrderItem oi ON o.order_id = oi.order_id
      WHERE o.customer_id = $1
      GROUP BY
        o.order_id,
        o.order_total,
        o.order_status,
        o.order_date,
        dp.delivery_status,
        dp.estimated_delivery_date
      ORDER BY o.order_date DESC
      `,
      [customerId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch order history',
      details: error.message
    });
  }
});

// PATCH /api/customers/:customerId — update name fields
router.patch('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { first_name, middle_name, last_name } = req.body;

    if (!first_name && !last_name && middle_name === undefined) {
      return res.status(400).json({
        error: 'At least one field (first_name, middle_name, last_name) is required'
      });
    }

    // Build update dynamically — only update fields that were sent
    const fields = [];
    const values = [];
    let idx = 1;

    if (first_name !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(first_name);
    }
    if (middle_name !== undefined) {
      fields.push(`middle_name = $${idx++}`);
      values.push(middle_name);
    }
    if (last_name !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(last_name);
    }

    values.push(customerId);

    const result = await db.query(
      `
      UPDATE Customer
      SET ${fields.join(', ')}
      WHERE customer_id = $${idx}
      RETURNING customer_id, first_name, middle_name, last_name, account_balance
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      message: 'Customer updated successfully',
      customer: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update customer',
      details: error.message
    });
  }
});

// POST /api/customers/:customerId/balance — add funds to account balance
router.post('/:customerId/balance', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        error: 'A valid positive amount is required'
      });
    }

    const result = await db.query(
      `
      UPDATE Customer
      SET account_balance = account_balance + $1
      WHERE customer_id = $2
      RETURNING customer_id, first_name, last_name, account_balance
      `,
      [amount, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      message: `$${Number(amount).toFixed(2)} added to account`,
      customer: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update balance',
      details: error.message
    });
  }
});

module.exports = router;