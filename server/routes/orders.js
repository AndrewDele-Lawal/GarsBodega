const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/orders/:customerId — place an order from the customer's cart
router.post('/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get the customer's cart
    const cartResult = await client.query(
      'SELECT cart_id FROM ShoppingCart WHERE customer_id = $1',
      [customerId]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No cart found for this customer' });
    }

    const cartId = cartResult.rows[0].cart_id;

    // 2. Get all cart items with current prices
    const itemsResult = await client.query(
      `
      SELECT
        ci.product_id,
        ci.quantity,
        p.product_name,
        p.current_price,
        p.total_stock,
        (ci.quantity * p.current_price) AS item_total
      FROM CartItem ci
      JOIN Product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
      `,
      [cartId]
    );

    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const items = itemsResult.rows;

    // 3. Check stock for every item
    for (const item of items) {
      if (item.quantity > item.total_stock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock for "${item.product_name}". Requested: ${item.quantity}, Available: ${item.total_stock}`
        });
      }
    }

    // 4. Calculate order total
    const orderTotal = items.reduce(
      (sum, item) => sum + Number(item.item_total),
      0
    );

    // 5. Check customer account balance
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
        error: `Insufficient account balance. Order total: $${orderTotal.toFixed(2)}, Balance: $${accountBalance.toFixed(2)}`
      });
    }

    // 6. Create the order
    const orderResult = await client.query(
      `
      INSERT INTO Orders (customer_id, order_total, order_status)
      VALUES ($1, $2, 'pending')
      RETURNING order_id
      `,
      [customerId, orderTotal]
    );

    const orderId = orderResult.rows[0].order_id;

    // 7. Create order items
    for (const item of items) {
      await client.query(
        `
        INSERT INTO OrderItem (order_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
        `,
        [orderId, item.product_id, item.quantity, item.current_price]
      );
    }

    // 8. Reduce stock for each product
    for (const item of items) {
      await client.query(
        `
        UPDATE Product
        SET total_stock = total_stock - $1
        WHERE product_id = $2
        `,
        [item.quantity, item.product_id]
      );
    }

    // 9. Deduct from customer account balance
    await client.query(
      `
      UPDATE Customer
      SET account_balance = account_balance - $1
      WHERE customer_id = $2
      `,
      [orderTotal, customerId]
    );

    // 10. Create delivery plan
    const deliveryResult = await client.query(
      `
      INSERT INTO DeliveryPlan (order_id, delivery_status, estimated_delivery_date)
      VALUES ($1, 'scheduled', CURRENT_DATE + INTERVAL '5 days')
      RETURNING delivery_id, estimated_delivery_date
      `,
      [orderId]
    );

    const delivery = deliveryResult.rows[0];

    // 11. Clear the cart
    await client.query(
      'DELETE FROM CartItem WHERE cart_id = $1',
      [cartId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order placed successfully',
      order_id: orderId,
      order_total: orderTotal.toFixed(2),
      delivery_id: delivery.delivery_id,
      estimated_delivery: delivery.estimated_delivery_date,
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
    res.status(500).json({
      error: 'Order placement failed',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// GET /api/orders/:customerId — get all orders for a customer
router.get('/:customerId', async (req, res) => {
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
        dp.estimated_delivery_date
      FROM Orders o
      LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
      WHERE o.customer_id = $1
      ORDER BY o.order_date DESC
      `,
      [customerId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch orders',
      details: error.message
    });
  }
});

// GET /api/orders/:customerId/:orderId — get a single order's details
router.get('/:customerId/:orderId', async (req, res) => {
  try {
    const { customerId, orderId } = req.params;

    const orderResult = await db.query(
      `
      SELECT
        o.order_id,
        o.order_total,
        o.order_status,
        o.order_date,
        dp.delivery_id,
        dp.delivery_status,
        dp.estimated_delivery_date
      FROM Orders o
      LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
      WHERE o.order_id = $1 AND o.customer_id = $2
      `,
      [orderId, customerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await db.query(
      `
      SELECT
        oi.product_id,
        p.product_name,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) AS item_total
      FROM OrderItem oi
      JOIN Product p ON oi.product_id = p.product_id
      WHERE oi.order_id = $1
      `,
      [orderId]
    );

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch order details',
      details: error.message
    });
  }
});

module.exports = router;