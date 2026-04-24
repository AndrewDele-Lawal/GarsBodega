const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search, category, product_type, brand, in_stock } = req.query;

    let query = `
      SELECT
        p.product_id,
        p.product_name,
        p.category,
        p.product_type,
        p.brand,
        p.product_size,
        p.short_description,
        p.current_price,
        p.total_stock
      FROM Product p
    `;

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`
        (
          p.product_name ILIKE $${values.length}
          OR p.short_description ILIKE $${values.length}
        )
      `);
    }

    if (category) {
      values.push(category);
      conditions.push(`p.category ILIKE $${values.length}`);
    }

    if (product_type) {
      values.push(product_type);
      conditions.push(`p.product_type ILIKE $${values.length}`);
    }

    if (brand) {
      values.push(brand);
      conditions.push(`p.brand ILIKE $${values.length}`);
    }

    if (in_stock === 'true') {
      conditions.push(`p.total_stock > 0`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY p.product_name ASC`;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.category,
        p.product_type,
        p.brand,
        p.product_size,
        p.short_description,
        p.current_price,
        p.total_stock
      FROM Product p
      WHERE p.product_id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch product',
      details: error.message
    });
  }
});

module.exports = router;