const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/account/:customerId/addresses
router.get('/:customerId/addresses', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await db.query(
      `
      SELECT
        a.address_id,
        a.street,
        a.city,
        a.state_name,
        a.zip_code,
        a.country,
        ca.address_type
      FROM CustomerAddress ca
      JOIN Address a ON ca.address_id = a.address_id
      WHERE ca.customer_id = $1
      ORDER BY a.address_id ASC
      `,
      [customerId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch addresses', details: error.message });
  }
});

// POST /api/account/:customerId/addresses
router.post('/:customerId/addresses', async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { customerId } = req.params;
    const {
      street,
      city,
      state,
      state_name,
      zip_code,
      country,
      address_type = 'both'
    } = req.body;

    const normalizedState = state_name || state;

    if (!street || !city || !normalizedState || !zip_code || !country) {
      return res.status(400).json({
        error: 'street, city, state/state_name, zip_code, and country are required'
      });
    }

    const validTypes = ['delivery', 'payment', 'both'];
    if (!validTypes.includes(address_type)) {
      return res.status(400).json({
        error: `address_type must be one of: ${validTypes.join(', ')}`
      });
    }

    await client.query('BEGIN');

    const addressResult = await client.query(
      `
      INSERT INTO Address (street, city, state_name, zip_code, country)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [street, city, normalizedState, zip_code, country]
    );

    const address = addressResult.rows[0];

    await client.query(
      `
      INSERT INTO CustomerAddress (customer_id, address_id, address_type)
      VALUES ($1, $2, $3)
      `,
      [customerId, address.address_id, address_type]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Address added successfully',
      address: {
        ...address,
        address_type
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to add address', details: error.message });
  } finally {
    client.release();
  }
});

// PATCH /api/account/:customerId/addresses/:addressId
router.patch('/:customerId/addresses/:addressId', async (req, res) => {
  try {
    const { customerId, addressId } = req.params;
    const {
      street,
      city,
      state,
      state_name,
      zip_code,
      country,
      address_type
    } = req.body;

    const normalizedState = state_name || state;

    const linkCheck = await db.query(
      `
      SELECT 1
      FROM CustomerAddress
      WHERE customer_id = $1 AND address_id = $2
      `,
      [customerId, addressId]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const addressFields = [];
    const addressValues = [];
    let idx = 1;

    if (street !== undefined) {
      addressFields.push(`street = $${idx++}`);
      addressValues.push(street);
    }
    if (city !== undefined) {
      addressFields.push(`city = $${idx++}`);
      addressValues.push(city);
    }
    if (normalizedState !== undefined) {
      addressFields.push(`state_name = $${idx++}`);
      addressValues.push(normalizedState);
    }
    if (zip_code !== undefined) {
      addressFields.push(`zip_code = $${idx++}`);
      addressValues.push(zip_code);
    }
    if (country !== undefined) {
      addressFields.push(`country = $${idx++}`);
      addressValues.push(country);
    }

    if (addressFields.length > 0) {
      addressValues.push(addressId);

      await db.query(
        `
        UPDATE Address
        SET ${addressFields.join(', ')}
        WHERE address_id = $${idx}
        `,
        addressValues
      );
    }

    if (address_type !== undefined) {
      const validTypes = ['delivery', 'payment', 'both'];
      if (!validTypes.includes(address_type)) {
        return res.status(400).json({
          error: `address_type must be one of: ${validTypes.join(', ')}`
        });
      }

      await db.query(
        `
        UPDATE CustomerAddress
        SET address_type = $1
        WHERE customer_id = $2 AND address_id = $3
        `,
        [address_type, customerId, addressId]
      );
    }

    const result = await db.query(
      `
      SELECT
        a.address_id,
        a.street,
        a.city,
        a.state_name,
        a.zip_code,
        a.country,
        ca.address_type
      FROM CustomerAddress ca
      JOIN Address a ON ca.address_id = a.address_id
      WHERE ca.customer_id = $1 AND ca.address_id = $2
      `,
      [customerId, addressId]
    );

    res.json({
      message: 'Address updated successfully',
      address: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address', details: error.message });
  }
});

// DELETE /api/account/:customerId/addresses/:addressId
router.delete('/:customerId/addresses/:addressId', async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { customerId, addressId } = req.params;

    await client.query('BEGIN');

    const linkDelete = await client.query(
      `
      DELETE FROM CustomerAddress
      WHERE customer_id = $1 AND address_id = $2
      RETURNING *
      `,
      [customerId, addressId]
    );

    if (linkDelete.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Address not found' });
    }

    await client.query(
      `
      DELETE FROM Address
      WHERE address_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM CustomerAddress WHERE address_id = $1
        )
        AND NOT EXISTS (
          SELECT 1 FROM CreditCard WHERE address_id = $1
        )
        AND NOT EXISTS (
          SELECT 1 FROM Warehouse WHERE address_id = $1
        )
        AND NOT EXISTS (
          SELECT 1 FROM StaffMember WHERE address_id = $1
        )
        AND NOT EXISTS (
          SELECT 1 FROM Supplier WHERE address_id = $1
        )
      `,
      [addressId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to delete address', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/account/:customerId/cards
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
        a.state_name,
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

// POST /api/account/:customerId/cards
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

    const addressCheck = await db.query(
      `
      SELECT 1
      FROM CustomerAddress
      WHERE customer_id = $1 AND address_id = $2
      `,
      [customerId, address_id]
    );

    if (addressCheck.rows.length === 0) {
      return res.status(400).json({ error: 'address_id does not belong to this customer' });
    }

    const result = await db.query(
      `
      INSERT INTO CreditCard
        (customer_id, card_last_four, card_type, expiration_date, cardholder_name, address_id)
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

// PATCH /api/account/:customerId/cards/:cardId
router.patch('/:customerId/cards/:cardId', async (req, res) => {
  try {
    const { customerId, cardId } = req.params;
    const { card_type, expiration_date, cardholder_name, address_id } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (card_type !== undefined) {
      fields.push(`card_type = $${idx++}`);
      values.push(card_type);
    }
    if (expiration_date !== undefined) {
      fields.push(`expiration_date = $${idx++}`);
      values.push(expiration_date);
    }
    if (cardholder_name !== undefined) {
      fields.push(`cardholder_name = $${idx++}`);
      values.push(cardholder_name);
    }
    if (address_id !== undefined) {
      const addressCheck = await db.query(
        `
        SELECT 1
        FROM CustomerAddress
        WHERE customer_id = $1 AND address_id = $2
        `,
        [customerId, address_id]
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

// DELETE /api/account/:customerId/cards/:cardId
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