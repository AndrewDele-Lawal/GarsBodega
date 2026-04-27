const express = require('express');
const router = express.Router();
const db = require('../db');

// Valid order status transitions: each status can only move forward
const STATUS_TRANSITIONS = {
  pending:  'issued',
  issued:   'sent',
  sent:     'received'
};

// ─── STAFF PROFILE ────────────────────────────────────────────────────────────

// GET /api/staff — get all staff members
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT staff_id, first_name, last_name, job_title, salary
       FROM StaffMember
       ORDER BY last_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff', details: error.message });
  }
});

// ─── STAFF: CUSTOMER QUERIES ──────────────────────────────────────────────────

// GET /api/staff/customers/all
router.get('/customers/all', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT customer_id, first_name, middle_name, last_name, account_balance
       FROM Customer
       ORDER BY last_name ASC`
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
      `INSERT INTO Customer (first_name, middle_name, last_name, account_balance)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [first_name, middle_name || null, last_name, account_balance]
    );
    res.status(201).json({ message: 'Customer created successfully', customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
});

// GET /api/staff/customers/:customerId — staff view of one customer + orders
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customerResult = await db.query(
      `SELECT customer_id, first_name, middle_name, last_name, account_balance
       FROM Customer WHERE customer_id = $1`,
      [customerId]
    );
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const ordersResult = await db.query(
      `SELECT o.order_id, o.order_total, o.order_status, o.order_date,
              dp.delivery_type, dp.delivery_price, dp.delivery_status,
              dp.ship_date, dp.estimated_delivery_date
       FROM Orders o
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

// ─── STAFF: ORDER MANAGEMENT ──────────────────────────────────────────────────

// GET /api/staff/orders — all orders with customer + delivery info
router.get('/orders', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.order_id, o.order_total, o.order_status, o.order_date,
              c.first_name || ' ' || c.last_name AS customer_name,
              dp.delivery_type, dp.delivery_price, dp.delivery_status,
              dp.ship_date, dp.estimated_delivery_date
       FROM Orders o
       JOIN Customer c ON o.customer_id = c.customer_id
       LEFT JOIN DeliveryPlan dp ON o.order_id = dp.order_id
       ORDER BY o.order_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// PATCH /api/staff/orders/:orderId/advance — advance order to the next status
//
// pending  → issued   (staff confirms & processes the order; ship_date is recorded)
// issued   → sent     (order has left the warehouse)
// sent     → received (customer confirmed delivery)
//
// Body: {} — no payload needed, the next status is derived from the current one.
router.patch('/orders/:orderId/advance', async (req, res) => {
  const { orderId } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch current order status
    const orderResult = await client.query(
      'SELECT order_id, order_status FROM Orders WHERE order_id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = orderResult.rows[0].order_status;
    const nextStatus = STATUS_TRANSITIONS[currentStatus];

    if (!nextStatus) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Order is already "${currentStatus}" — no further status transitions are possible.`
      });
    }

    // 2. Advance order status
    await client.query(
      'UPDATE Orders SET order_status = $1 WHERE order_id = $2',
      [nextStatus, orderId]
    );

    // 3. When moving to "issued", record the ship_date on the delivery plan
    if (nextStatus === 'issued') {
      await client.query(
        `UPDATE DeliveryPlan SET ship_date = CURRENT_DATE WHERE order_id = $1`,
        [orderId]
      );
    }

    // 4. When moving to "sent", update delivery_status to "in_transit"
    if (nextStatus === 'sent') {
      await client.query(
        `UPDATE DeliveryPlan SET delivery_status = 'in_transit' WHERE order_id = $1`,
        [orderId]
      );
    }

    // 5. When moving to "received", update delivery_status to "delivered"
    if (nextStatus === 'received') {
      await client.query(
        `UPDATE DeliveryPlan SET delivery_status = 'delivered' WHERE order_id = $1`,
        [orderId]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: `Order #${orderId} advanced from "${currentStatus}" to "${nextStatus}".`,
      order_id: Number(orderId),
      previous_status: currentStatus,
      new_status: nextStatus
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to advance order status', details: error.message });
  } finally {
    client.release();
  }
});

// ─── STAFF: PRODUCT MANAGEMENT ────────────────────────────────────────────────

// POST /api/staff/products — add a new product
router.post('/products', async (req, res) => {
  try {
    const { product_name, category, product_type, brand, product_size, short_description, current_price, total_stock = 0 } = req.body;
    if (!product_name || !category || !product_type || !current_price) {
      return res.status(400).json({ error: 'product_name, category, product_type, and current_price are required' });
    }
    const result = await db.query(
      `INSERT INTO Product (product_name, category, product_type, brand, product_size, short_description, current_price, total_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [product_name, category, product_type, brand, product_size, short_description, current_price, total_stock]
    );
    res.status(201).json({ message: 'Product created successfully', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// PATCH /api/staff/products/:productId — update a product
router.patch('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { product_name, category, product_type, brand, product_size, short_description, current_price } = req.body;
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
    if (fields.length === 0) return res.status(400).json({ error: 'No fields provided to update' });
    values.push(productId);
    const result = await db.query(
      `UPDATE Product SET ${fields.join(', ')} WHERE product_id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product updated successfully', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// DELETE /api/staff/products/:productId
router.delete('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await db.query('DELETE FROM Product WHERE product_id = $1 RETURNING *', [productId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

// ─── STAFF: WAREHOUSE & STOCK ─────────────────────────────────────────────────

// GET /api/staff/warehouses/all
router.get('/warehouses/all', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Warehouse ORDER BY warehouse_id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warehouses', details: error.message });
  }
});

// POST /api/staff/warehouses/:warehouseId/stock — add stock with capacity enforcement
router.post('/warehouses/:warehouseId/stock', async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'product_id and a positive quantity are required' });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const warehouseResult = await client.query(
        'SELECT warehouse_id, capacity_size FROM Warehouse WHERE warehouse_id = $1',
        [warehouseId]
      );
      if (warehouseResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Warehouse not found' });
      }
      const { capacity_size } = warehouseResult.rows[0];

      const productResult = await client.query(
        'SELECT product_id, product_name FROM Product WHERE product_id = $1',
        [product_id]
      );
      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }
      const { product_name } = productResult.rows[0];

      const totalResult = await client.query(
        'SELECT COALESCE(SUM(quantity_on_hand), 0) AS total_in_warehouse FROM Stock WHERE warehouse_id = $1',
        [warehouseId]
      );
      const totalInWarehouse = Number(totalResult.rows[0].total_in_warehouse);

      const existingResult = await client.query(
        'SELECT quantity_on_hand FROM Stock WHERE warehouse_id = $1 AND product_id = $2',
        [warehouseId, product_id]
      );
      const currentQty = existingResult.rows.length > 0 ? Number(existingResult.rows[0].quantity_on_hand) : 0;

      if (capacity_size !== null && totalInWarehouse + quantity > capacity_size) {
        const available = capacity_size - totalInWarehouse;
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Warehouse capacity exceeded. Capacity: ${capacity_size}, currently holding: ${totalInWarehouse}, available space: ${available}. You tried to add: ${quantity}.`
        });
      }

      await client.query(
        `INSERT INTO Stock (warehouse_id, product_id, quantity_on_hand)
         VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, product_id)
         DO UPDATE SET quantity_on_hand = Stock.quantity_on_hand + EXCLUDED.quantity_on_hand`,
        [warehouseId, product_id, quantity]
      );

      await client.query(
        'UPDATE Product SET total_stock = total_stock + $1 WHERE product_id = $2',
        [quantity, product_id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: `Added ${quantity} units of "${product_name}" to warehouse #${warehouseId}. New quantity on hand: ${currentQty + quantity}. Warehouse total: ${totalInWarehouse + quantity}/${capacity_size ?? '∞'}.`
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

// ─── STAFF: SUPPLIERS ─────────────────────────────────────────────────────────

// GET /api/staff/suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT supplier_id, supplier_name, address_id FROM Supplier ORDER BY supplier_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers', details: error.message });
  }
});

// POST /api/staff/suppliers
router.post('/suppliers', async (req, res) => {
  try {
    const { supplier_name, address_id } = req.body;
    if (!supplier_name) return res.status(400).json({ error: 'supplier_name is required' });
    const result = await db.query(
      `INSERT INTO Supplier (supplier_name, address_id) VALUES ($1, $2) RETURNING *`,
      [supplier_name, address_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier', details: error.message });
  }
});

// GET /api/staff/supplier-products
router.get('/supplier-products', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sp.supplier_id, s.supplier_name, sp.product_id, p.product_name, sp.supplier_price
       FROM SupplierProduct sp
       JOIN Supplier s ON sp.supplier_id = s.supplier_id
       JOIN Product p ON sp.product_id = p.product_id
       ORDER BY s.supplier_name ASC, p.product_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch supplier products', details: error.message });
  }
});

// POST /api/staff/supplier-products
router.post('/supplier-products', async (req, res) => {
  try {
    const { supplier_id, product_id, supplier_price } = req.body;
    if (!supplier_id || !product_id || supplier_price == null) {
      return res.status(400).json({ error: 'supplier_id, product_id, and supplier_price are required' });
    }
    const result = await db.query(
      `INSERT INTO SupplierProduct (supplier_id, product_id, supplier_price)
       VALUES ($1, $2, $3)
       ON CONFLICT (supplier_id, product_id)
       DO UPDATE SET supplier_price = EXCLUDED.supplier_price
       RETURNING *`,
      [supplier_id, product_id, supplier_price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save supplier product', details: error.message });
  }
});

// GET /api/staff/warehouses/stock-summary
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

// ─── STAFF: WILDCARD — must stay last ─────────────────────────────────────────

// GET /api/staff/:staffId
router.get('/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    const result = await db.query(
      `SELECT staff_id, first_name, last_name, job_title, salary
       FROM StaffMember WHERE staff_id = $1`,
      [staffId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Staff member not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff member', details: error.message });
  }
});

module.exports = router;
