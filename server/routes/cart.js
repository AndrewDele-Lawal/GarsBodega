const express = require('express');
const router = express.Router();
const db = require('../db');

async function getOrCreateCart(customerId) {
  const existingCart = await db.query(
    'SELECT cart_id FROM ShoppingCart WHERE customer_id = $1',
    [customerId]
  );

  if (existingCart.rows.length > 0) {
    return existingCart.rows[0].cart_id;
  }

  const newCart = await db.query(
    'INSERT INTO ShoppingCart (customer_id) VALUES ($1) RETURNING cart_id',
    [customerId]
  );

  return newCart.rows[0].cart_id;
}

router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const cartId = await getOrCreateCart(customerId);

    const result = await db.query(
      `
      SELECT
        ci.product_id,
        p.product_name,
        p.category,
        p.product_type,
        p.brand,
        p.product_size,
        p.short_description,
        p.current_price,
        ci.quantity,
        (ci.quantity * p.current_price) AS item_total
      FROM CartItem ci
      JOIN Product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
      ORDER BY p.product_name ASC
      `,
      [cartId]
    );

    const total = result.rows.reduce(
      (sum, item) => sum + Number(item.item_total),
      0
    );

    res.json({
      cart_id: cartId,
      customer_id: Number(customerId),
      items: result.rows,
      cart_total: total.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch cart',
      details: error.message
    });
  }
});

router.post('/:customerId/items', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than 0' });
    }

    const productCheck = await db.query(
      'SELECT product_id FROM Product WHERE product_id = $1',
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cartId = await getOrCreateCart(customerId);

    await db.query(
      `
      INSERT INTO CartItem (cart_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, product_id)
      DO UPDATE SET quantity = CartItem.quantity + EXCLUDED.quantity
      `,
      [cartId, product_id, quantity]
    );

    res.status(201).json({
      message: 'Item added to cart',
      cart_id: cartId,
      product_id,
      quantity_added: quantity
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add item to cart',
      details: error.message
    });
  }
});

router.patch('/:customerId/items/:productId', async (req, res) => {
  try {
    const { customerId, productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'quantity is required' });
    }

    const cartId = await getOrCreateCart(customerId);

    if (quantity <= 0) {
      await db.query(
        'DELETE FROM CartItem WHERE cart_id = $1 AND product_id = $2',
        [cartId, productId]
      );

      return res.json({
        message: 'Item removed from cart because quantity was 0 or less'
      });
    }

    const result = await db.query(
      `
      UPDATE CartItem
      SET quantity = $1
      WHERE cart_id = $2 AND product_id = $3
      RETURNING *
      `,
      [quantity, cartId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json({
      message: 'Cart item updated',
      item: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update cart item',
      details: error.message
    });
  }
});

router.delete('/:customerId/items/:productId', async (req, res) => {
  try {
    const { customerId, productId } = req.params;
    const cartId = await getOrCreateCart(customerId);

    const result = await db.query(
      'DELETE FROM CartItem WHERE cart_id = $1 AND product_id = $2 RETURNING *',
      [cartId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json({
      message: 'Item removed from cart'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to remove cart item',
      details: error.message
    });
  }
});

module.exports = router;