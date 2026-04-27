const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/staff — get all staff members
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT staff_id, first_name, last_name, role, email, address_id 
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
      `SELECT customer_id, first_name, last_name, email, phone, account_balance 
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
      `SELECT customer_id, first_name, last_name, email, phone, account_balance 
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
    const { first_name, last_name, email, phone, phone_number, account_balance = 0 } = req.body;
    const finalPhone = phone || phone_number || null;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'first_name, last_name, and email are required' });
    }

    const result = await db.query(
      `INSERT INTO Customer (first_name, last_name, email, phone, account_balance) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [first_name, last_name, email, finalPhone, account_balance]
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
      `SELECT w.warehouse_id, w.warehouse_name, w.capacity,
              COALESCE(SUM(s.quantity), 0) AS current_stock
       FROM Warehouse w
       LEFT JOIN Address a ON w.address_id = a.address_id
       LEFT JOIN Stock s ON w.warehouse_id = s.warehouse_id
       GROUP BY w.warehouse_id, w.warehouse_name, w.capacity
       ORDER BY w.warehouse_id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warehouses', details: error.message });
  }
});

module.exports = router;
