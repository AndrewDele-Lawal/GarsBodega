require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db');

const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const deliveryRouter = require('./routes/delivery');
const staffRouter = require('./routes/staff');
const accountRouter = require('./routes/account');



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'not connected',
      error: error.message
    });
  }
});

app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/staff', staffRouter);
app.use('/api/account', accountRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});