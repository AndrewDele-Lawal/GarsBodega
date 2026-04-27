const express = require('express');
const router = express.Router();
const db = require('../db');

// Delivery pricing constants
const DELIVERY_DAYS = { standard: 5, express: 3 };
const DELIVERY_PRICE = { standard: 4.99, express: 9.99 };

// POST /api/orders/:customerId — place an order from the customer's cart
router.post('/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { address_id, card_id, delivery_type = 'standard' } = req.body;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Validate delivery_type
    if (!['standard', 'express'].includes(delivery_type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'delivery_type must be "standard" or "express"' });
    }

    // 0. Validate delivery address
    if (!address_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'A delivery address is required to place an order.' });
    }

    const addressCheck = await client.query(
      `SELECT a.street, a.city, a.state_name, a.zip_code, a.country
       FROM CustomerAddress ca
       JOIN Address a ON ca.address_id = a.address_id
       WHERE ca.customer_id = $1
         AND ca.address_id = $2
         AND ca.address_type IN ('delivery', 'both')`,
      [customerId, address_id]
    );

    if (addressCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Please choose a valid delivery address.' });
    }

    const deliveryAddress = addressCheck.rows[0];

    // Validate card belongs to this customer (if provided)
    if (card_id) {
      const cardCheck = await client.query(
        'SELECT card_id FROM CreditCard WHERE card_id = $1 AND customer_id = $2',
        [card_id, customerId]
      );
      if (cardCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid card for this customer.' });
      }
    }

    // 1. Get cart
    const cartResult = await client.query(
      'SELECT cart_id FROM ShoppingCart WHERE customer_id = $1',
      [customerId]
    );
    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No cart found for this customer' });
    }
    const cartId = cartResult.rows[0].cart_id;

    // 2. Get cart items
    const itemsResult = await client.query(
      `SELECT ci.product_id, ci.quantity, p.product_name, p.current_price,
              p.total_stock, (ci.quantity * p.current_price) AS item_total
       FROM CartItem ci
       JOIN Product p ON ci.product_id = p.product_id
       WHERE ci.cart_id = $1`,
      [cartId]
    );
    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty' });
    }
    const items = itemsResult.rows;

    // 3. Stock check
    for (const item of items) {
      if (item.quantity > item.total_stock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock for "${item.product_name}". Requested: ${item.quantity}, Available: ${item.total_stock}`
        });
      }
    }

    // 4. Calculate totals
    const itemsTotal = items.reduce((sum, item) => sum + Number(item.item_total), 0);
    const deliveryPrice = DELIVERY_PRICE[delivery_type];
    const orderTotal = itemsTotal + deliveryPrice;

    // 5. Balance check
    const customerResult = await client.query(
      'SELECT account_balance FROM Customer WHERE customer_id = $1',
      [customerId]
    );
    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }
    const accountBalance = Number(customerResult.rows[0].account_balance);
    if (accountBalance < orderTotal) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient account balance. Order total (with delivery): $${orderTotal.toFixed(2)}, Balance: $${accountBalance.toFixed(2)}`
      });
    }

    // 6. Create order — store card_id per project spec
    const orderResult = await client.query(
      `INSERT INTO Orders (customer_id, card_id, order_total, order_status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING order_id, order_date`,
      [customerId, card_id || null, orderTotal]
    );
    const { order_id: orderId, order_date: orderDate } = orderResult.rows[0];

    // 7. Insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO OrderItem (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.current_price]
      );
    }

    // 8. Reduce stock
    for (const item of items) {
      await client.query(
        'UPDATE Product SET total_stock = total_stock - $1 WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    // 9. Deduct balance
    await client.query(
      'UPDATE Customer SET account_balance = account_balance - $1 WHERE customer_id = $2',
      [orderTotal, customerId]
    );

    // 10. Create delivery plan
    const days = DELIVERY_DAYS[delivery_type];
    const deliveryResult = await client.query(
      `INSERT INTO DeliveryPlan
         (order_id, address_id, delivery_type, delivery_price, estimated_delivery_date, delivery_status)
       VALUES ($1, $2, $3, $4, CURRENT_DATE + ($5 || ' days')::INTERVAL, 'scheduled')
       RETURNING delivery_id, estimated_delivery_date`,
      [orderId, address_id, delivery_type, deliveryPrice, days]
    );
    const delivery = deliveryResult.rows[0];

    // 11. Clear cart
    await client.query('DELETE FROM CartItem WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order placed successfully',
      order_id: orderId,
      order_status: 'pending',
      items_total: itemsTotal.toFixed(2),
      delivery_type,
      delivery_price: deliveryPrice.toFixed(2),
      order_total: orderTotal.toFixed(2),
      delivery_id: delivery.delivery_id,
      estimated_delivery: delivery.estimated_delivery_date,
      delivery_address: deliveryAddress,
      items_ordered: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.current_price,
        item_total: Number(i.item_total).toFixed(2)
      }))
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Order placement failed', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/orders/:customerId — all orders for a customer
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await db.query(
      `SELECT o.order_id, o.order_total, o.order_status, o.order_date,
              o.card_id, cc.card_last_four, cc.card_type,
              dp.delivery_type, dp.delivery_price, dp.delivery_status,
              dp.ship_date, dp.estimated_delivery_date,
              a.street AS delivery_street, a.city AS delivery_city,
              a.state_name AS delivery_state, a.zip_code AS delivery_zip
       FROM Orders o
       LEFT JOIN CreditCard cc ON o.card_id = cc.card_id
       LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
       LEFT JOIN Address a ON dp.address_id = a.address_id
       WHERE o.customer_id = $1
       ORDER BY o.order_date DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// GET /api/orders/:customerId/:orderId — single order with items
router.get('/:customerId/:orderId', async (req, res) => {
  try {
    const { customerId, orderId } = req.params;
    const orderResult = await db.query(
      `SELECT o.order_id, o.order_total, o.order_status, o.order_date,
              o.card_id, cc.card_last_four, cc.card_type,
              dp.delivery_id, dp.delivery_type, dp.delivery_price,
              dp.delivery_status, dp.ship_date, dp.estimated_delivery_date,
              a.street AS delivery_street, a.city AS delivery_city,
              a.state_name AS delivery_state, a.zip_code AS delivery_zip,
              a.country AS delivery_country
       FROM Orders o
       LEFT JOIN CreditCard cc ON o.card_id = cc.card_id
       LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
       LEFT JOIN Address a ON dp.address_id = a.address_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
      [orderId, customerId]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const itemsResult = await db.query(
      `SELECT oi.product_id, p.product_name, oi.quantity, oi.unit_price,
              (oi.quantity * oi.unit_price) AS item_total
       FROM OrderItem oi
       JOIN Product p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order details', details: error.message });
  }
});

module.exports = router;
