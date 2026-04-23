const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── ADDRESSES ────────────────────────────────────────────────────────────────

// GET /api/account/:customerId/addresses — get all addresses
router.get('/:customerId/addresses', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await db.query(
      `
      SELECT *
      FROM Address
      WHERE customer_id = $1
      ORDER BY address_id ASC
      `,
      [customerId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch addresses', details: error.message });
  }
});

// POST /api/account/:customerId/addresses — add a new address
router.post('/:customerId/addresses', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { street, city, state, zip_code, country, address_type } = req.body;

    if (!street || !city || !state || !zip_code || !country) {
      return res.status(400).json({
        error: 'street, city, state, zip_code, and country are required'
      });
    }

    const validTypes = ['delivery', 'payment', 'both'];
    if (address_type && !validTypes.includes(address_type)) {
      return res.status(400).json({
        error: `address_type must be one of: ${validTypes.join(', ')}`
      });
    }

    const result = await db.query(
      `
      INSERT INTO Address (customer_id, street, city, state, zip_code, country, address_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [customerId, street, city, state, zip_code, country, address_type || 'both']
    );

    res.status(201).json({
      message: 'Address added successfully',
      address: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add address', details: error.message });
  }
});

// PATCH /api/account/:customerId/addresses/:addressId — update an address
router.patch('/:customerId/addresses/:addressId', async (req, res) => {
  try {
    const { customerId, addressId } = req.params;
    const { street, city, state, zip_code, country, address_type } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (street !== undefined)       { fields.push(`street = $${idx++}`);       values.push(street); }
    if (city !== undefined)         { fields.push(`city = $${idx++}`);         values.push(city); }
    if (state !== undefined)        { fields.push(`state = $${idx++}`);        values.push(state); }
    if (zip_code !== undefined)     { fields.push(`zip_code = $${idx++}`);     values.push(zip_code); }
    if (country !== undefined)      { fields.push(`country = $${idx++}`);      values.push(country); }
    if (address_type !== undefined) { fields.push(`address_type = $${idx++}`); values.push(address_type); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(addressId, customerId);

    const result = await db.query(
      `
      UPDATE Address
      SET ${fields.join(', ')}
      WHERE address_id = $${idx} AND customer_id = $${idx + 1}
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({
      message: 'Address updated successfully',
      address: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address', details: error.message });
  }
});

// DELETE /api/account/:customerId/addresses/:addressId — delete an address
router.delete('/:customerId/addresses/:addressId', async (req, res) => {
  try {
    const { customerId, addressId } = req.params;

    // Block delete if a credit card still references this address
    const cardCheck = await db.query(
      'SELECT card_id FROM CreditCard WHERE address_id = $1',
      [addressId]
    );

    if (cardCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete address — it is still linked to a credit card. Remove the card first or update it to use a different address.'
      });
    }

    const result = await db.query(
      'DELETE FROM Address WHERE address_id = $1 AND customer_id = $2 RETURNING *',
      [addressId, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address', details: error.message });
  }
});

// ─── CREDIT CARDS ─────────────────────────────────────────────────────────────

// GET /api/account/:customerId/cards — get all credit cards
router.get('/:customerId/cards', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await db.query(
      `
      SELECT
        cc.card_id,
        cc.customer_id,
        cc.card_last_four,
        cc.card_type,
        cc.expiration_date,
        cc.cardholder_name,
        cc.address_id,
        a.street,
        a.city,
        a.state,
        a.zip_code,
        a.country
      FROM CreditCard cc
      LEFT JOIN Address a ON cc.address_id = a.address_id
      WHERE cc.customer_id = $1
      ORDER BY cc.card_id ASC
      `,
      [customerId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credit cards', details: error.message });
  }
});

// POST /api/account/:customerId/cards — add a new credit card
router.post('/:customerId/cards', async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      card_last_four,
      card_type,
      expiration_date,
      cardholder_name,
      address_id
    } = req.body;

    if (!card_last_four || !card_type || !expiration_date || !cardholder_name || !address_id) {
      return res.status(400).json({
        error: 'card_last_four, card_type, expiration_date, cardholder_name, and address_id are required'
      });
    }

    if (!/^\d{4}$/.test(card_last_four)) {
      return res.status(400).json({ error: 'card_last_four must be exactly 4 digits' });
    }

    // Verify the address belongs to this customer
    const addressCheck = await db.query(
      'SELECT address_id FROM Address WHERE address_id = $1 AND customer_id = $2',
      [address_id, customerId]
    );

    if (addressCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'address_id does not belong to this customer. Add the address first.'
      });
    }

    const result = await db.query(
      `
      INSERT INTO CreditCard (customer_id, card_last_four, card_type, expiration_date, cardholder_name, address_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [customerId, card_last_four, card_type, expiration_date, cardholder_name, address_id]
    );

    res.status(201).json({
      message: 'Credit card added successfully',
      card: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add credit card', details: error.message });
  }
});

// PATCH /api/account/:customerId/cards/:cardId — update a credit card
router.patch('/:customerId/cards/:cardId', async (req, res) => {
  try {
    const { customerId, cardId } = req.params;
    const { card_type, expiration_date, cardholder_name, address_id } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (card_type !== undefined)       { fields.push(`card_type = $${idx++}`);       values.push(card_type); }
    if (expiration_date !== undefined)  { fields.push(`expiration_date = $${idx++}`);  values.push(expiration_date); }
    if (cardholder_name !== undefined)  { fields.push(`cardholder_name = $${idx++}`);  values.push(cardholder_name); }
    if (address_id !== undefined) {
      // Verify new address belongs to this customer
      const addressCheck = await db.query(
        'SELECT address_id FROM Address WHERE address_id = $1 AND customer_id = $2',
        [address_id, customerId]
      );
      if (addressCheck.rows.length === 0) {
        return res.status(400).json({ error: 'address_id does not belong to this customer' });
      }
      fields.push(`address_id = $${idx++}`);
      values.push(address_id);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(cardId, customerId);

    const result = await db.query(
      `
      UPDATE CreditCard
      SET ${fields.join(', ')}
      WHERE card_id = $${idx} AND customer_id = $${idx + 1}
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    res.json({
      message: 'Credit card updated successfully',
      card: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update credit card', details: error.message });
  }
});

// DELETE /api/account/:customerId/cards/:cardId — delete a credit card
router.delete('/:customerId/cards/:cardId', async (req, res) => {
  try {
    const { customerId, cardId } = req.params;

    const result = await db.query(
      'DELETE FROM CreditCard WHERE card_id = $1 AND customer_id = $2 RETURNING *',
      [cardId, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    res.json({ message: 'Credit card deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete credit card', details: error.message });
  }
});

module.exports = router;