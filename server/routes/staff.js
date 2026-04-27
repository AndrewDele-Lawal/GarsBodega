const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/staff — get all staff members
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT staff_id, first_name, middle_name, last_name, job_title, role, salary, email, address_id, warehouse_id
       FROM StaffMember
       ORDER BY last_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff', details: error.message });
  }
});

// GET /api/staff/customers/all — staff view of all customers
router.get('/customers/all', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT customer_id, first_name, middle_name, last_name, email, phone, account_balance
       FROM Customer
       ORDER BY last_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

// GET /api/staff/customers/:customerId — staff view of one customer + orders
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customerResult = await db.query(
      `SELECT customer_id, first_name, middle_name, last_name, email, phone, account_balance
       FROM Customer
       WHERE customer_id = $1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const ordersResult = await db.query(
      `SELECT o.order_id, o.order_total, os.status_name AS order_status, o.order_date,
              dp.delivery_status, dp.estimated_delivery_date
       FROM Orders o
       JOIN OrderStatus os ON o.status_id = os.status_id
       LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
       WHERE o.customer_id = $1
       ORDER BY o.order_date DESC`,
      [customerId]
    );

    res.json({ customer: customerResult.rows[0], orders: ordersResult.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer details', details: error.message });
  }
});

// POST /api/staff/customers — create a new customer
router.post('/customers', async (req, res) => {
  try {
    const { first_name, middle_name, last_name, email, phone, account_balance = 0 } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }

    const result = await db.query(
      `INSERT INTO Customer (first_name, middle_name, last_name, email, phone, account_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [first_name, middle_name || null, last_name, email || null, phone || null, account_balance]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
});

// GET /api/staff/orders — get all orders for staff management
router.get('/orders', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.order_id, o.order_total, os.status_name AS order_status, o.order_date,
              c.first_name || ' ' || c.last_name AS customer_name,
              dp.delivery_status, dp.estimated_delivery_date
       FROM Orders o
       JOIN OrderStatus os ON o.status_id = os.status_id
       JOIN Customer c ON o.customer_id = c.customer_id
       LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
       ORDER BY o.order_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all orders', details: error.message });
  }
});

// PATCH /api/staff/orders/:orderId/status — update order status
router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status_name } = req.body;

    const statusResult = await db.query(
      'SELECT status_id FROM OrderStatus WHERE status_name = $1',
      [status_name]
    );

    if (statusResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid status name. Use: issued, sent, received' });
    }

    const status_id = statusResult.rows[0].status_id;

    const result = await db.query(
      `UPDATE Orders SET status_id = $1 WHERE order_id = $2 RETURNING *`,
      [status_id, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated', order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status', details: error.message });
  }
});

// GET /api/staff/warehouses — get all warehouses with stock info
router.get('/warehouses', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT w.warehouse_id, w.warehouse_name, w.capacity_size,
              COALESCE(SUM(s.quantity_on_hand), 0) AS current_stock
       FROM Warehouse w
       LEFT JOIN Stock s ON w.warehouse_id = s.warehouse_id
       GROUP BY w.warehouse_id, w.warehouse_name, w.capacity_size
       ORDER BY w.warehouse_id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warehouses', details: error.message });
  }
});

// GET /api/staff/warehouses/stock-summary — capacity summary for all warehouses
router.get('/warehouses/stock-summary', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT w.warehouse_id, w.capacity_size,
              COALESCE(SUM(s.quantity_on_hand), 0) AS total_on_hand
       FROM Warehouse w
       LEFT JOIN Stock s ON w.warehouse_id = s.warehouse_id
       GROUP BY w.warehouse_id, w.capacity_size
       ORDER BY w.warehouse_id`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock summary', details: error.message });
  }
});

// GET /api/staff/stock — get all stock entries with product + warehouse info
router.get('/stock', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.stock_id, s.quantity_on_hand, s.warehouse_id, s.product_id,
              p.product_name, p.category, p.total_stock,
              w.warehouse_name, w.capacity_size
       FROM Stock s
       JOIN Product p ON s.product_id = p.product_id
       JOIN Warehouse w ON s.warehouse_id = w.warehouse_id
       ORDER BY w.warehouse_id, p.product_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock', details: error.message });
  }
});

// POST /api/staff/stock/restock — add stock to a warehouse
router.post('/stock/restock', async (req, res) => {
  const { product_id, warehouse_id, quantity } = req.body;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get warehouse capacity
    const warehouseResult = await client.query(
      'SELECT capacity_size FROM Warehouse WHERE warehouse_id = $1',
      [warehouse_id]
    );

    if (warehouseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const capacity = warehouseResult.rows[0].capacity_size;

    // 2. Get total currently in warehouse
    const usageResult = await client.query(
      'SELECT COALESCE(SUM(quantity_on_hand), 0) AS total FROM Stock WHERE warehouse_id = $1',
      [warehouse_id]
    );

    const currentTotal = parseInt(usageResult.rows[0].total);

    if (currentTotal + quantity > capacity) {
      await client.query('ROLLBACK');
      const available = capacity - currentTotal;
      return res.status(400).json({
        error: `Warehouse capacity exceeded. Capacity: ${capacity}, currently holding: ${currentTotal}, available space: ${available}. You tried to add: ${quantity}.`
      });
    }

    // 3. Upsert stock row
    const stockResult = await client.query(
      `INSERT INTO Stock (product_id, warehouse_id, quantity_on_hand)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, warehouse_id)
       DO UPDATE SET quantity_on_hand = Stock.quantity_on_hand + EXCLUDED.quantity_on_hand
       RETURNING quantity_on_hand`,
      [product_id, warehouse_id, quantity]
    );

    const newQty = stockResult.rows[0].quantity_on_hand;

    // 4. Update Product.total_stock
    await client.query(
      'UPDATE Product SET total_stock = total_stock + $1 WHERE product_id = $2',
      [quantity, product_id]
    );

    await client.query('COMMIT');

    res.json({
      message: `Restocked successfully. New quantity on hand: ${newQty}. Warehouse now at ${currentTotal + quantity}/${capacity}.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Restock failed', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/staff/suppliers — get all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.supplier_id, s.supplier_name,
              a.street, a.city, a.state_name, a.zip_code, a.country
       FROM Supplier s
       LEFT JOIN Address a ON s.address_id = a.address_id
       ORDER BY s.supplier_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers', details: error.message });
  }
});

// GET /api/staff/suppliers/:supplierId/products — products a supplier carries
router.get('/suppliers/:supplierId/products', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const result = await db.query(
      `SELECT sp.product_id, p.product_name, p.category, p.current_price, sp.supplier_price
       FROM SupplierProduct sp
       JOIN Product p ON sp.product_id = p.product_id
       WHERE sp.supplier_id = $1
       ORDER BY p.product_name ASC`,
      [supplierId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch supplier products', details: error.message });
  }
});

module.exports = router;
