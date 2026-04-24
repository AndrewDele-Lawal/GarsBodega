const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── STAFF PROFILE ────────────────────────────────────────────────────────────

// GET /api/staff — get all staff members
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        staff_id,
        first_name,
        last_name,
        job_title,
        salary
      FROM StaffMember
      ORDER BY last_name ASC
      `
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff', details: error.message });
  }
});

// GET /api/staff/:staffId — get one staff member
router.get('/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;

    const result = await db.query(
      `
      SELECT
        staff_id,
        first_name,
        last_name,
        job_title,
        salary
      FROM StaffMember
      WHERE staff_id = $1
      `,
      [staffId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff member', details: error.message });
  }
});

// ─── STAFF: CUSTOMER QUERIES ──────────────────────────────────────────────────

// GET /api/staff/customers/all — staff view of all customers
router.get('/customers/all', async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        customer_id,
        first_name,
        middle_name,
        last_name,
        account_balance
      FROM Customer
      ORDER BY last_name ASC
      `
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

// POST /api/staff/customers — create a new customer
router.post('/customers', async (req, res) => {
  try {
    const { first_name, last_name, middle_name, account_balance = 0 } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }

    const result = await db.query(
      `
      INSERT INTO Customer (first_name, middle_name, last_name, account_balance)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [first_name, middle_name || null, last_name, account_balance]
    );

    res.status(201).json({
      message: 'Customer created successfully',
      customer: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
});

// GET /api/staff/customers/:customerId — staff view of one customer + orders
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const customerResult = await db.query(
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

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const ordersResult = await db.query(
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

    res.json({
      customer: customerResult.rows[0],
      orders: ordersResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer details', details: error.message });
  }
});

// ─── STAFF: PRODUCT MANAGEMENT ────────────────────────────────────────────────

// POST /api/staff/products — add a new product
router.post('/products', async (req, res) => {
  try {
    const {
      product_name,
      category,
      product_type,
      brand,
      product_size,
      short_description,
      current_price,
      total_stock = 0
    } = req.body;

    if (!product_name || !category || !product_type || !current_price) {
      return res.status(400).json({
        error: 'product_name, category, product_type, and current_price are required'
      });
    }

    const result = await db.query(
      `
      INSERT INTO Product
        (product_name, category, product_type, brand, product_size, short_description, current_price, total_stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [product_name, category, product_type, brand, product_size, short_description, current_price, total_stock]
    );

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// PATCH /api/staff/products/:productId — update a product's details or price
router.patch('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      product_name,
      category,
      product_type,
      brand,
      product_size,
      short_description,
      current_price
    } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (product_name !== undefined)      { fields.push(`product_name = $${idx++}`);      values.push(product_name); }
    if (category !== undefined)          { fields.push(`category = $${idx++}`);           values.push(category); }
    if (product_type !== undefined)      { fields.push(`product_type = $${idx++}`);       values.push(product_type); }
    if (brand !== undefined)             { fields.push(`brand = $${idx++}`);              values.push(brand); }
    if (product_size !== undefined)      { fields.push(`product_size = $${idx++}`);       values.push(product_size); }
    if (short_description !== undefined) { fields.push(`short_description = $${idx++}`);  values.push(short_description); }
    if (current_price !== undefined)     { fields.push(`current_price = $${idx++}`);      values.push(current_price); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(productId);

    const result = await db.query(
      `
      UPDATE Product
      SET ${fields.join(', ')}
      WHERE product_id = $${idx}
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// DELETE /api/staff/products/:productId — delete a product
router.delete('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await db.query(
      'DELETE FROM Product WHERE product_id = $1 RETURNING *',
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

// ─── STAFF: WAREHOUSE & STOCK ─────────────────────────────────────────────────

// GET /api/staff/warehouses/all — list all warehouses
router.get('/warehouses/all', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM Warehouse ORDER BY warehouse_id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warehouses', details: error.message });
  }
});

// POST /api/staff/warehouses/:warehouseId/stock — add stock to a warehouse
router.post('/warehouses/:warehouseId/stock', async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'product_id and a positive quantity are required'
      });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const warehouseCheck = await client.query(
        'SELECT warehouse_id FROM Warehouse WHERE warehouse_id = $1',
        [warehouseId]
      );

      if (warehouseCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      const productCheck = await client.query(
        'SELECT product_id FROM Product WHERE product_id = $1',
        [product_id]
      );

      if (productCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }

      // Upsert into Stock table — quantity_on_hand is the correct column name
      await client.query(
        `
        INSERT INTO Stock (warehouse_id, product_id, quantity_on_hand)
        VALUES ($1, $2, $3)
        ON CONFLICT (warehouse_id, product_id)
        DO UPDATE SET quantity_on_hand = Stock.quantity_on_hand + EXCLUDED.quantity_on_hand
        `,
        [warehouseId, product_id, quantity]
      );

      // Keep Product.total_stock in sync
      await client.query(
        `
        UPDATE Product
        SET total_stock = total_stock + $1
        WHERE product_id = $2
        `,
        [quantity, product_id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: `Added ${quantity} units of product ${product_id} to warehouse ${warehouseId}`
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add stock', details: error.message });
  }
});

module.exports = router;
