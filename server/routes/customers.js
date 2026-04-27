const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/customers/:customerId
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

// GET /api/customers/:customerId/orders
router.get('/:customerId/orders', async (req, res) => {
  try {
    const { customerId } = req.params;

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

// PATCH /api/customers/:customerId
router.patch('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { first_name, middle_name, last_name } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (first_name !== undefined)  { fields.push(`first_name = $${idx++}`); values.push(first_name); }
    if (middle_name !== undefined) { fields.push(`middle_name = $${idx++}`); values.push(middle_name); }
    if (last_name !== undefined)   { fields.push(`last_name = $${idx++}`); values.push(last_name); }

    if (fields.length === 0) {
      return res.status(400).json({
        error: 'At least one field is required'
      });
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

// POST /api/customers/:customerId/balance
router.post('/:customerId/balance', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { amount, card_id } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        error: 'A valid positive amount is required'
      });
    }

    if (!card_id) {
      return res.status(400).json({
        error: 'card_id is required to reload account balance'
      });
    }

    const cardCheck = await db.query(
      `
      SELECT card_id
      FROM CreditCard
      WHERE card_id = $1 AND customer_id = $2
      `,
      [card_id, customerId]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'The selected card does not belong to this customer'
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

    res.json({
      message: `$${Number(amount).toFixed(2)} added to account balance`,
      customer: result.rows[0],
      reloaded_with_card_id: Number(card_id)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update balance',
      details: error.message
    });
  }
});

module.exports = router;